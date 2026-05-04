(function (root, factory) {
  const api = factory();
  root.OMIAFrameBackend = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function attrs(document, path, depth) {
    const parts = path.split("/");
    return [
      "data-omi-id=\"" + escapeHtml(parts[parts.length - 1]) + "\"",
      "data-omi-path=\"" + escapeHtml(path) + "\"",
      "data-omi-fs=\"" + escapeHtml(document.id) + "\"",
      "data-omi-gs=\"" + escapeHtml(parts[1] || "") + "\"",
      "data-omi-rs=\"" + escapeHtml(parts[2] || "") + "\"",
      "data-omi-depth=\"" + escapeHtml(depth) + "\""
    ].join(" ");
  }

  function entity(document, solid, depth) {
    if (solid.kind === "polycube") {
      return "<a-box width=\"" + solid.size[0] + "\" height=\"" + solid.size[1] + "\" depth=\"" + solid.size[2] + "\" " +
        attrs(document, solid.path, depth) + "></a-box>";
    }
    if (solid.kind === "cylinder") {
      return "<a-cylinder radius=\"" + solid.radius + "\" height=\"" + solid.depth + "\" rotation=\"90 0 0\" " +
        attrs(document, solid.path, depth) + "></a-cylinder>";
    }
    return "<a-entity " + attrs(document, solid.path, depth) + "></a-entity>";
  }

  function buildScene(document, solids, depth, options) {
    const editReceipt = options && options.editReceipt ? " data-omi-edit-receipt=\"" + escapeHtml(String(options.editReceipt)) + "\"" : "";
    return "<a-scene embedded data-omi-root=\"" + escapeHtml(document.id) + "\"" + editReceipt + ">" +
      solids.map(function (solid) { return entity(document, solid, depth); }).join("") +
      "</a-scene>";
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return {
    buildScene: buildScene
  };
}));
