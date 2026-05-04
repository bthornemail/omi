(function (root, factory) {
  const api = factory();
  root.OMIGltfExporter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function build(document, solids, depth, options) {
    return {
      asset: { version: "2.0", generator: "OMI Workbench" },
      scene: 0,
      scenes: [{ nodes: solids.map(function (_, index) { return index; }) }],
      nodes: solids.map(function (solid) {
        return {
          name: solid.path.split("/").slice(-1)[0],
          extras: {
            omi_path: solid.path,
            omi_depth: depth,
            omi_root: document.id
          }
        };
      }),
      extras: {
        omi_root: document.id,
        omi_projection: "gltf",
        omi_depth: depth,
        omi_edit_receipt: options && options.editReceipt ? options.editReceipt : 0
      }
    };
  }

  return {
    build: build
  };
}));
