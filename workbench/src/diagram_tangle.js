(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./noweb_expander.js") : root.OMINowebExpander
  );
  root.OMIDiagramTangle = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (nowebExpander) {
  "use strict";

  function fnv1a(text) {
    let hash = 2166136261;
    const data = String(text || "");
    for (let i = 0; i < data.length; i += 1) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function stableString(value) {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return "[" + value.map(stableString).join(",") + "]";
    }
    return "{" + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ":" + stableString(value[key]);
    }).join(",") + "}";
  }

  function parseTemplate(templateText) {
    const text = String(templateText || "");
    const idMatch = text.match(/\(FS\s*\.\s*([^)]+)\)/);
    const primitiveMatch = text.match(/\(\(US\s*\.\s*primitives\)\s*\.\s*([^)]+)\)/);
    return {
      id: idMatch ? idMatch[1].trim() : "diagram.template",
      primitives: primitiveMatch ? primitiveMatch[1].trim() : ""
    };
  }

  function makeDotPrelude(nowebBlocks) {
    if (!Array.isArray(nowebBlocks) || nowebBlocks.length === 0) {
      return "";
    }
    const expanded = nowebBlocks.map(function (block) {
      return nowebExpander.expand(block.text || "", nowebBlocks);
    }).join("\n");
    return expanded ? expanded + "\n" : "";
  }

  function buildGraphDot(document, template, nowebBlocks) {
    const lines = [];
    const prelude = makeDotPrelude(nowebBlocks);
    lines.push("// OMI model: " + document.id);
    lines.push("// OMI template: " + template.id);
    lines.push("// OMI receipt: " + fnv1a(document.source || ""));
    lines.push("digraph omi_world {");
    if (prelude) {
      prelude.trimEnd().split("\n").forEach(function (line) {
        lines.push("  " + line);
      });
    }
    document.graph.nodes.forEach(function (node) {
      lines.push("  \"" + node.id + "\" [omi_path=\"" + node.path + "\"];");
    });
    document.graph.edges.forEach(function (edge) {
      lines.push("  \"" + edge.source + "\" -> \"" + edge.target + "\" [label=\"" + edge.id + "\", omi_path=\"" + edge.path + "\", omi_relation=\"" + edge.relation + "\"];");
    });
    lines.push("}");
    return lines.join("\n");
  }

  function buildGraphSvgPlaceholder(document, template) {
    const parts = [
      "<svg data-omi-model=\"" + document.id + "\" data-omi-template=\"" + template.id + "\" xmlns=\"http://www.w3.org/2000/svg\">"
    ];
    document.graph.edges.forEach(function (edge) {
      parts.push("  <g data-omi-path=\"" + edge.path + "\" data-omi-relation=\"" + edge.relation + "\"><title>" + edge.id + "</title></g>");
    });
    parts.push("</svg>");
    return parts.join("\n");
  }

  function buildRelationsJson(document, template) {
    return stableString({
      model_id: document.id,
      template_id: template.id,
      relation_count: document.graph.edges.length,
      relations: document.graph.edges.map(function (edge) {
        return {
          id: edge.id,
          path: edge.path,
          source: edge.source,
          target: edge.target,
          relation: edge.relation
        };
      })
    });
  }

  function buildDiagramIndex(document, template, sourceReceipt, templateReceipt, outputs) {
    return [
      "#+TITLE: OMI Diagram Index",
      "#+OMI_MODEL_ID: " + document.id,
      "#+OMI_TEMPLATE_ID: " + template.id,
      "",
      "* Diagram Bundle",
      ":PROPERTIES:",
      ":OMI_MODEL_ID: " + document.id,
      ":OMI_TEMPLATE_ID: " + template.id,
      ":OMI_SOURCE_RECEIPT: " + sourceReceipt,
      ":OMI_TEMPLATE_RECEIPT: " + templateReceipt,
      ":END:",
      "",
      "- Graph DOT :: graph.dot",
      "- Graph SVG :: graph.svg",
      "- Relations JSON :: relations.json",
      "- Template primitives :: " + template.primitives,
      "- Graph edge count :: " + document.graph.edges.length,
      "",
      "#+begin_src dot :tangle graph.dot",
      outputs["graph.dot"],
      "#+end_src"
    ].join("\n");
  }

  function tangleArtifacts(options) {
    const document = options.document;
    const template = parseTemplate(options.templateText);
    const sourceReceipt = fnv1a(document.source || "");
    const templateReceipt = fnv1a(options.templateText || "");
    const outputs = {
      "graph.dot": buildGraphDot(document, template, options.nowebBlocks || []),
      "graph.svg": buildGraphSvgPlaceholder(document, template),
      "relations.json": buildRelationsJson(document, template)
    };
    outputs["diagram.index.org"] = buildDiagramIndex(document, template, sourceReceipt, templateReceipt, outputs);
    return {
      template: template,
      receipts: {
        source: sourceReceipt,
        template: templateReceipt
      },
      outputs: outputs
    };
  }

  return {
    parseTemplate: parseTemplate,
    tangleArtifacts: tangleArtifacts
  };
}));
