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
    const obj = ["mtllib trailer.mtl"];
    const mtl = ["newmtl omi_default", "Kd 0.2 0.7 0.65"];
    const receipt = {
      omi_root: document.id,
      omi_depth: depth,
      omi_edit_receipt: options && options.editReceipt ? options.editReceipt : 0,
      objects: {}
    };

    solids.forEach(function (solid, index) {
      const name = normalizeName(solid.path);
      obj.push("o " + name);
      obj.push("g " + name);
      obj.push("usemtl omi_default");
      obj.push("v " + (index + 1) + " 0 0");
      receipt.objects[name] = solid.path;
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
