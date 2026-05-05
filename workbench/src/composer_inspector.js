(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./polyform_coordinate.js") : root.OMIPolyformCoordinate,
    typeof require === "function" ? require("./scope_multigraph.js") : root.OMIScopeMultigraph,
    typeof require === "function" ? require("./edit_log.js") : root.OMIEditLog
  );
  root.OMIComposerInspector = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (polyformCoordinate, scopeMultigraph, editLog) {
  "use strict";

  function findFirstCoordinate(document, selectedPath, fallback) {
    if (!document || !document.graph || !Array.isArray(document.graph.nodes) || document.graph.nodes.length === 0) {
      return fallback;
    }
    const node = document.graph.nodes.find(function (item) {
      return item.path !== selectedPath;
    }) || document.graph.nodes[0];
    return polyformCoordinate.fromPath(document, node.path) || fallback;
  }

  function inspectPath(state, path) {
    const coord = polyformCoordinate.fromPath(state.document, path);
    const other = findFirstCoordinate(state.document, path, coord);
    const closure = coord && other && coord.receipt_hash !== other.receipt_hash
      ? polyformCoordinate.closureFromBlocks(other, coord)
      : null;
    const scope = scopeMultigraph.decodeScope("public.global");
    const edge = closure
      ? scopeMultigraph.barcodeEdge(other, coord, closure, scope.visibility, scope.location, closure.orientation4)
      : null;
    return {
      path: path,
      coordinate: coord,
      coordinate_receipt: coord ? coord.receipt_hash : 0,
      closure: closure,
      closure_receipt: closure ? closure.receipt_hash : 0,
      scope: edge ? edge.scope_class : "public.global",
      carrier: edge ? edge.carrier : 255,
      scope_edge: edge,
      edit_receipt: editLog.receipt(state.editLog)
    };
  }

  return {
    inspectPath: inspectPath
  };
}));
