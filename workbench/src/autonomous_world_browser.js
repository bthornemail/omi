(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_builder.js") : root.OMIAutonomousWorldBuilder,
    typeof require === "function" ? require("./model_parser.js") : root.OMIModelParser,
    typeof require === "function" ? require("./spom_adapter.js") : root.OMISPOMAdapter,
    typeof require === "function" ? require("./view_switcher.js") : root.OMIViewSwitcher
  );
  root.OMIAutonomousWorldBrowser = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldBuilder,
  modelParser,
  spomAdapter,
  viewSwitcher
) {
  "use strict";

  function fnv1a(text) {
    return artifactIdentity.fnv1a(String(text || ""));
  }

  function stableString(value) {
    return artifactIdentity.stableString(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeBuild(input) {
    if (!input) {
      return autonomousWorldBuilder.buildAutonomousWorld();
    }
    if (input.admission && input.report) {
      return input;
    }
    if (typeof input === "string") {
      const document = modelParser.parseDocument(input);
      return {
        admission: {
          source: input,
          document: document,
          identity_receipt: fnv1a(stableString({
            source: input,
            counts: document.counts,
            graph: document.graph
          }))
        },
        triangulation: spomAdapter.triangulateDocument(document, { mode: "lazy" }),
        report: {
          package: {},
          raw_binary: {},
          closure: {}
        }
      };
    }
    throw new Error("invalid-world-build");
  }

  function openWorld(input, options) {
    const build = normalizeBuild(input);
    const document = modelParser.parseDocument(build.admission.source);
    const triangulation = spomAdapter.triangulateDocument(document, { mode: "lazy" });
    const switcher = viewSwitcher.createViewSwitcher(document.id, {
      scene: document.id,
      mode: options && options.mode ? options.mode : "lazy"
    });
    const state = {
      kind: "autonomous-world-browser",
      build: build,
      document: document,
      identity_receipt: build.admission.identity_receipt,
      source_identity_receipt: build.admission.identity_receipt,
      triangulation: triangulation,
      viewSwitcher: switcher,
      authority: false
    };
    state.open_receipt = fnv1a(stableString({
      world: document.id,
      identity_receipt: state.identity_receipt,
      graph: document.graph
    }));
    return state;
  }

  function listObjects(state) {
    return state.document.graph.nodes.map(function (node) {
      return {
        id: node.id,
        path: node.path,
        label: node.label,
        authority: false
      };
    });
  }

  function listRelations(state) {
    return state.document.graph.edges.map(function (edge) {
      return {
        id: edge.id,
        path: edge.path,
        source: edge.source,
        target: edge.target,
        relation: edge.relation,
        authority: false
      };
    });
  }

  function inspectPath(state, path) {
    const resolved = modelParser.resolvePath(state.document, path);
    if (!resolved) {
      return null;
    }
    const result = {
      path: path,
      plane: resolved.plane,
      fs: resolved.fs,
      gs: resolved.gs,
      rs: resolved.rs,
      us: resolved.us || null,
      value: clone(resolved.value),
      identity_receipt: state.identity_receipt,
      projection_receipt: fnv1a(stableString({
        identity_receipt: state.identity_receipt,
        path: path,
        resolved: resolved
      })),
      authority: false
    };
    return result;
  }

  function setViewMode(state, mode) {
    const view = state.viewSwitcher.setMode(mode);
    return {
      mode: view.mode,
      identity_receipt: state.identity_receipt,
      view_identity_receipt: view.identity_receipt,
      view_receipt: view.view_receipt,
      authority: false,
      projection: view
    };
  }

  function browseSpom(state, limit) {
    const max = Number.isInteger(limit) && limit >= 0 ? limit : state.triangulation.triplets.length;
    return {
      root: state.triangulation.root,
      identity_receipt: state.identity_receipt,
      triangulation_receipt: state.triangulation.identity_receipt,
      triplets: state.triangulation.triplets.slice(0, max).map(clone),
      authority: false
    };
  }

  function receiptPanel(state) {
    return {
      identity_receipt: state.identity_receipt,
      open_receipt: state.open_receipt,
      package: clone(state.build.report.package || {}),
      raw_binary: clone(state.build.report.raw_binary || {}),
      closure: clone(state.build.report.closure || {}),
      authority: false
    };
  }

  function smokeSummary(state) {
    const lazy = setViewMode(state, "lazy");
    const greedy = setViewMode(state, "greedy");
    const staticView = setViewMode(state, "static");
    const animated = setViewMode(state, "animated");
    return {
      world: state.document.id,
      identity_receipt: state.identity_receipt,
      object_count: listObjects(state).length,
      relation_count: listRelations(state).length,
      triplet_count: state.triangulation.triplets.length,
      view_receipts: {
        lazy: lazy.view_receipt,
        greedy: greedy.view_receipt,
        static: staticView.view_receipt,
        animated: animated.view_receipt
      },
      receipt_panel: receiptPanel(state),
      authority: false
    };
  }

  return {
    openWorld: openWorld,
    listObjects: listObjects,
    listRelations: listRelations,
    inspectPath: inspectPath,
    setViewMode: setViewMode,
    browseSpom: browseSpom,
    receiptPanel: receiptPanel,
    smokeSummary: smokeSummary
  };
}));
