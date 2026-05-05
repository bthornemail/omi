(function (root, factory) {
  const api = factory();
  root.OMIGltfExporter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function nodeExtras(document, solid, depth, rootMetadata) {
    const extras = {
      omi_path: solid.path,
      omi_depth: depth,
      omi_root: document.id
    };
    if (solid.metadata) {
      extras.omi_coordinate_receipt = solid.metadata.coordinate_receipt || 0;
      extras.omi_closure_receipt = solid.metadata.closure_receipt || 0;
      extras.omi_scope = solid.metadata.scope || "";
      extras.omi_carrier = solid.metadata.carrier == null ? 255 : solid.metadata.carrier;
      extras.omi_witness = solid.metadata.witness || 0;
      extras.omi_projection_intent = solid.metadata.projection_intent || "";
    }
    if (rootMetadata) {
      extras.omi_root_metadata = rootMetadata.omi_path || document.id;
    }
    return extras;
  }

  function build(document, solids, depth, options) {
    const rootMetadata = options && options.rootMetadata ? options.rootMetadata : null;
    return {
      asset: { version: "2.0", generator: "OMI Workbench" },
      scene: 0,
      scenes: [{ nodes: solids.map(function (_, index) { return index; }) }],
      nodes: solids.map(function (solid) {
        return {
          name: solid.path.split("/").slice(-1)[0],
          extras: nodeExtras(document, solid, depth, rootMetadata)
        };
      }),
      extras: {
        omi_root: rootMetadata ? rootMetadata.omi_path : document.id,
        omi_projection: "gltf",
        omi_depth: depth,
        omi_edit_receipt: options && options.editReceipt ? options.editReceipt : 0,
        omi_coordinate_receipt: rootMetadata ? rootMetadata.coordinate_receipt : 0,
        omi_closure_receipt: rootMetadata ? rootMetadata.closure_receipt : 0,
        omi_scope: rootMetadata ? rootMetadata.scope : "",
        omi_carrier: rootMetadata ? rootMetadata.carrier : 255,
        omi_witness: rootMetadata ? rootMetadata.witness : 0,
        omi_projection_intent: rootMetadata ? rootMetadata.projection_intent : ""
      }
    };
  }

  return {
    build: build
  };
}));
