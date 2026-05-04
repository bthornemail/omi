(function (root, factory) {
  const api = factory();
  root.OMISourceBuffer = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createSourceBuffer(source) {
    let current = String(source || "");
    return {
      getSource: function () { return current; },
      setSource: function (next) { current = String(next || ""); return current; }
    };
  }

  function proposePropertyEdit(document, recordId, unitKey, unitValue) {
    const target = recordId || "RS.new-record";
    const key = unitKey || "US.key";
    const value = unitValue || "value";
    const root = document && document.id ? document.id : "document.unknown";
    return [
      ";; proposed visual edit for " + root,
      "((RS . " + target + ")",
      "  ((" + key + ") . " + value + "))"
    ].join("\n");
  }

  function proposeMoveEdit(path, poseValue) {
    const parts = String(path || "").split("/");
    const recordId = parts[2] || "RS.unknown";
    return [
      ";; proposed move from pointer route",
      "((RS . " + recordId + ")",
      "  ((US . pose) . " + (poseValue || "x0.y0.r0") + "))"
    ].join("\n");
  }

  function proposeRelationEdit(sourcePath, targetPath, relationValue) {
    const sourceParts = String(sourcePath || "").split("/");
    const targetParts = String(targetPath || "").split("/");
    const recordId = "interaction." + (sourceParts[2] || "source") + "." + (targetParts[2] || "target");
    return [
      ";; proposed relation from workbench",
      "((RS . " + recordId + ")",
      "  ((US . source) . " + (sourcePath || "source.path") + ")",
      "  ((US . target) . " + (targetPath || "target.path") + ")",
      "  ((US . relation) . " + (relationValue || "related-to") + "))"
    ].join("\n");
  }

  function proposeTextureEdit(path, textureValue) {
    const parts = String(path || "").split("/");
    const recordId = parts[2] || "RS.unknown";
    return [
      ";; proposed texture assignment from workbench",
      "((RS . " + recordId + ")",
      "  ((US . texture) . " + (textureValue || "texture.default") + "))"
    ].join("\n");
  }

  return {
    createSourceBuffer: createSourceBuffer,
    proposePropertyEdit: proposePropertyEdit,
    proposeMoveEdit: proposeMoveEdit,
    proposeRelationEdit: proposeRelationEdit,
    proposeTextureEdit: proposeTextureEdit
  };
}));
