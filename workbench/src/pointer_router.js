(function (root, factory) {
  const api = factory();
  root.OMIPointerRouter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function selectPointer(reference) {
    return {
      fs: "event.pointer-select",
      source: "device.pointer",
      target: reference.path,
      relation: "select",
      depth: reference.depth || "near",
      pointer: reference
    };
  }

  function proposeMove(reference, nextPose) {
    return {
      fs: "intent.move-object",
      source: "device.pointer",
      target: reference.path,
      relation: "move-object",
      proposedEdit: [
        ";; proposed move for " + reference.path,
        "((RS . " + reference.rs + ")",
        "  ((US . pose) . " + (nextPose || "x0.y0.r0") + "))"
      ].join("\n")
    };
  }

  function proposeRelation(sourceReference, targetReference, relation) {
    return {
      fs: "intent.create-relation",
      source: sourceReference.path,
      target: targetReference.path,
      relation: relation || "related-to"
    };
  }

  function proposeTexture(reference, textureId) {
    return {
      fs: "intent.apply-texture",
      source: "device.pointer",
      target: reference.path,
      relation: "apply-texture",
      texture: textureId || "texture.default"
    };
  }

  function datasetToReference(dataset) {
    return {
      id: dataset.omiId || "",
      path: dataset.omiPath || "",
      fs: dataset.omiFs || "",
      gs: dataset.omiGs || "",
      rs: dataset.omiRs || "",
      us: dataset.omiUs || "",
      depth: dataset.omiDepth || ""
    };
  }

  return {
    selectPointer: selectPointer,
    proposeMove: proposeMove,
    proposeRelation: proposeRelation,
    proposeTexture: proposeTexture,
    datasetToReference: datasetToReference
  };
}));
