(function (root, factory) {
  const api = factory();
  root.OMIObjMtlExporter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalizeName(path) {
    return path.replace(/\//g, "__");
  }

  function build(document, solids, depth, options) {
    const rootMetadata = options && options.rootMetadata ? options.rootMetadata : null;
    const obj = ["mtllib trailer.mtl"];
    const mtl = ["newmtl omi_default", "Kd 0.2 0.7 0.65"];
    const receipt = {
      omi_root: rootMetadata ? rootMetadata.omi_path : document.id,
      omi_depth: depth,
      omi_edit_receipt: options && options.editReceipt ? options.editReceipt : 0,
      omi_coordinate_receipt: rootMetadata ? rootMetadata.coordinate_receipt : 0,
      omi_closure_receipt: rootMetadata ? rootMetadata.closure_receipt : 0,
      omi_scope: rootMetadata ? rootMetadata.scope : "",
      omi_carrier: rootMetadata ? rootMetadata.carrier : 255,
      omi_witness: rootMetadata ? rootMetadata.witness : 0,
      omi_projection_intent: rootMetadata ? rootMetadata.projection_intent : "",
      objects: {}
    };

    solids.forEach(function (solid, index) {
      const name = normalizeName(solid.path);
      obj.push("o " + name);
      obj.push("g " + name);
      obj.push("usemtl omi_default");
      obj.push("v " + (index + 1) + " 0 0");
      receipt.objects[name] = solid.path;
      if (!receipt.metadata) {
        receipt.metadata = {};
      }
      receipt.metadata[name] = solid.metadata || {
        omi_path: solid.path,
        coordinate_receipt: 0,
        closure_receipt: 0,
        scope: rootMetadata ? rootMetadata.scope : "",
        carrier: rootMetadata ? rootMetadata.carrier : 255,
        witness: rootMetadata ? rootMetadata.witness : 0,
        projection_intent: "projection"
      };
    });

    return {
      obj: obj.join("\n"),
      mtl: mtl.join("\n"),
      receipt: JSON.stringify(receipt, null, 2)
    };
  }

  return {
    build: build
  };
}));
