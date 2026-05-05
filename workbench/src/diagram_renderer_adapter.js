(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./diagram_fixture_registry.js") : root.OMIDiagramFixtureRegistry,
    typeof require === "function" ? require("./polyform_coordinate.js") : root.OMIPolyformCoordinate,
    typeof require === "function" ? require("./scope_multigraph.js") : root.OMIScopeMultigraph
  );
  root.OMIDiagramRendererAdapter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (fixtureRegistry, polyformCoordinate, scopeMultigraph) {
  "use strict";

  const MODES = [
    "fallback-svg",
    "dot-source",
    "html-inline-svg",
    "coordinate-overlay-svg",
    "scope-multigraph-svg",
    "external-graphviz-optional"
  ];

  function escapeAttr(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function fnv1a(text) {
    let hash = 2166136261;
    const data = String(text || "");
    for (let i = 0; i < data.length; i += 1) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function parseRelations(artifacts) {
    if (!artifacts || !artifacts.outputs || !artifacts.outputs["relations.json"]) {
      return [];
    }
    return JSON.parse(artifacts.outputs["relations.json"]).relations || [];
  }

  function dotSource(artifacts) {
    return artifacts && artifacts.outputs ? String(artifacts.outputs["graph.dot"] || "") : "";
  }

  function relationCoordinate(document, relation) {
    if (!document || !relation || !relation.path) {
      return null;
    }
    return polyformCoordinate.fromPath(document, relation.path, {
      basis: "relation",
      degree: "edge",
      sign: "relation-closure",
      depth: "inspect"
    });
  }

  function firstNodeCoordinate(document, relation, fallbackRelationCoord) {
    if (!document || !relation || !document.graph || !Array.isArray(document.graph.nodes)) {
      return fallbackRelationCoord;
    }
    const node = document.graph.nodes.find(function (item) {
      return item.id === relation.source ||
        item.id === relation.target ||
        String(relation.source || "").indexOf(item.id + ".") === 0 ||
        String(relation.target || "").indexOf(item.id + ".") === 0;
    });
    if (!node) {
      return fallbackRelationCoord;
    }
    return polyformCoordinate.fromPath(document, node.path, {
      basis: "object",
      degree: "record",
      sign: "structural",
      depth: "middle"
    }) || fallbackRelationCoord;
  }

  function edgeForRelation(document, relation, fixture, relationCoord) {
    const sourceCoord = firstNodeCoordinate(document, relation, relationCoord);
    const closure = polyformCoordinate.closureFromBlocks(sourceCoord, relationCoord);
    const decoded = scopeMultigraph.decodeScope(fixture.scope);
    const visibility = decoded ? decoded.visibility : scopeMultigraph.VISIBILITY.public;
    const location = decoded ? decoded.location : scopeMultigraph.LOCATION.global;
    let carrier = scopeMultigraph.CARRIER[fixture.carrier];

    if (!closure) {
      return null;
    }
    if (carrier !== closure.orientation4) {
      carrier = closure.orientation4;
    }
    return scopeMultigraph.barcodeEdge(sourceCoord, relationCoord, closure, visibility, location, carrier);
  }

  function svgHeader(fixture, mode, artifacts) {
    const modelId = artifacts && artifacts.template ? artifacts.template.id : fixture.template_id;
    return [
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"720\" height=\"360\" viewBox=\"0 0 720 360\"",
      " data-omi-fixture=\"" + escapeAttr(fixture.id) + "\"",
      " data-omi-template=\"" + escapeAttr(fixture.template_id) + "\"",
      " data-omi-family=\"" + escapeAttr(fixture.family) + "\"",
      " data-omi-mode=\"" + escapeAttr(mode) + "\"",
      " data-omi-model=\"" + escapeAttr(modelId) + "\"",
      " data-omi-witness=\"" + fnv1a(fixture.id + mode + dotSource(artifacts)) + "\">"
    ].join("");
  }

  function buildFallbackSvg(options, mode) {
    const artifacts = options.artifacts;
    const document = options.document;
    const fixture = options.fixture;
    const relations = parseRelations(artifacts);
    const lines = [
      svgHeader(fixture, mode, artifacts),
      "  <title>" + escapeText(fixture.family) + "</title>",
      "  <g data-omi-path=\"" + escapeAttr(document ? document.id : fixture.template_id) + "\" data-omi-carrier=\"" + escapeAttr(fixture.carrier) + "\" data-omi-scope=\"" + escapeAttr(fixture.scope) + "\">"
    ];

    relations.forEach(function (relation, index) {
      const y = 60 + (index * 72);
      lines.push("    <g data-omi-path=\"" + escapeAttr(relation.path) + "\" data-omi-relation=\"" + escapeAttr(relation.relation) + "\" data-omi-carrier=\"" + escapeAttr(fixture.carrier) + "\" data-omi-scope=\"" + escapeAttr(fixture.scope) + "\" data-omi-witness=\"" + fnv1a(relation.path + fixture.id) + "\">");
      lines.push("      <line x1=\"96\" y1=\"" + y + "\" x2=\"560\" y2=\"" + y + "\" stroke=\"#333\" stroke-width=\"2\"/>");
      lines.push("      <circle cx=\"96\" cy=\"" + y + "\" r=\"10\" fill=\"#f5f5f5\" stroke=\"#333\"/>");
      lines.push("      <circle cx=\"560\" cy=\"" + y + "\" r=\"10\" fill=\"#f5f5f5\" stroke=\"#333\"/>");
      lines.push("      <text x=\"120\" y=\"" + (y - 12) + "\" font-size=\"12\">" + escapeText(relation.id) + "</text>");
      lines.push("    </g>");
    });
    lines.push("  </g>");
    lines.push("</svg>");
    return lines.join("\n");
  }

  function buildCoordinateOverlaySvg(options) {
    const document = options.document;
    const fixture = options.fixture;
    const relations = parseRelations(options.artifacts);
    const lines = [svgHeader(fixture, "coordinate-overlay-svg", options.artifacts)];
    relations.forEach(function (relation, index) {
      const coord = relationCoordinate(document, relation);
      const y = 48 + (index * 72);
      if (coord) {
        lines.push("  <rect x=\"48\" y=\"" + y + "\" width=\"560\" height=\"36\" fill=\"none\" stroke=\"#555\" data-omi-path=\"" + escapeAttr(relation.path) + "\" data-omi-x=\"" + coord.x + "\" data-omi-y=\"" + coord.y + "\" data-omi-z=\"" + coord.z + "\" data-omi-w=\"" + coord.w + "\" data-omi-coordinate-receipt=\"" + coord.receipt_hash + "\" data-omi-carrier=\"" + escapeAttr(fixture.carrier) + "\" data-omi-scope=\"" + escapeAttr(fixture.scope) + "\" data-omi-witness=\"" + coord.receipt_hash + "\"/>");
      }
    });
    lines.push("</svg>");
    return lines.join("\n");
  }

  function buildScopeMultigraphSvg(options) {
    const document = options.document;
    const fixture = options.fixture;
    const relations = parseRelations(options.artifacts);
    const lines = [svgHeader(fixture, "scope-multigraph-svg", options.artifacts)];
    relations.forEach(function (relation, index) {
      const coord = relationCoordinate(document, relation);
      const edge = coord ? edgeForRelation(document, relation, fixture, coord) : null;
      const y = 54 + (index * 72);
      if (edge) {
        lines.push("  <path d=\"M80 " + y + " C220 " + (y - 36) + " 420 " + (y + 36) + " 600 " + y + "\" fill=\"none\" stroke=\"#111\" data-omi-path=\"" + escapeAttr(relation.path) + "\" data-omi-scope=\"" + escapeAttr(edge.scope_class) + "\" data-omi-visibility=\"" + edge.visibility + "\" data-omi-location=\"" + edge.location + "\" data-omi-carrier=\"" + edge.carrier + "\" data-omi-orientation4=\"" + edge.orientation4 + "\" data-omi-public-frame240=\"" + edge.public_frame240 + "\" data-omi-closure-receipt=\"" + edge.closure_receipt + "\" data-omi-witness=\"" + edge.receipt + "\"/>");
      }
    });
    lines.push("</svg>");
    return lines.join("\n");
  }

  function render(options) {
    const mode = options && options.mode ? options.mode : "fallback-svg";
    const fixture = fixtureRegistry.requireFixture(options && options.fixtureId);
    const fullOptions = Object.assign({}, options || {}, { fixture: fixture });

    if (!fixture || MODES.indexOf(mode) === -1) {
      return null;
    }
    if (mode === "dot-source") {
      return dotSource(fullOptions.artifacts);
    }
    if (mode === "html-inline-svg") {
      return "<!doctype html><html><body>" + buildFallbackSvg(fullOptions, "html-inline-svg") + "</body></html>";
    }
    if (mode === "coordinate-overlay-svg") {
      return buildCoordinateOverlaySvg(fullOptions);
    }
    if (mode === "scope-multigraph-svg") {
      return buildScopeMultigraphSvg(fullOptions);
    }
    if (mode === "external-graphviz-optional") {
      return buildFallbackSvg(fullOptions, "external-graphviz-optional");
    }
    return buildFallbackSvg(fullOptions, "fallback-svg");
  }

  return {
    MODES: MODES.slice(),
    render: render
  };
}));
