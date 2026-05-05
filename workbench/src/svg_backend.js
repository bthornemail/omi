(function (root, factory) {
  const api = factory();
  root.OMISvgBackend = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function metadataAttrs(metadata) {
    if (!metadata) {
      return "";
    }
    return [
      "data-omi-coordinate-receipt=\"" + escapeHtml(String(metadata.coordinate_receipt || 0)) + "\"",
      "data-omi-closure-receipt=\"" + escapeHtml(String(metadata.closure_receipt || 0)) + "\"",
      "data-omi-scope=\"" + escapeHtml(metadata.scope || "") + "\"",
      "data-omi-carrier=\"" + escapeHtml(String(metadata.carrier == null ? 255 : metadata.carrier)) + "\"",
      "data-omi-witness=\"" + escapeHtml(String(metadata.witness || 0)) + "\"",
      "data-omi-projection-intent=\"" + escapeHtml(metadata.projection_intent || "") + "\""
    ].join(" ");
  }

  function attrs(document, path, depth, metadata) {
    const parts = path.split("/");
    const meta = metadataAttrs(metadata);
    return [
      "data-omi-id=\"" + escapeHtml(parts[parts.length - 1]) + "\"",
      "data-omi-path=\"" + escapeHtml(path) + "\"",
      "data-omi-fs=\"" + escapeHtml(document.id) + "\"",
      "data-omi-gs=\"" + escapeHtml(parts[1] || "") + "\"",
      "data-omi-rs=\"" + escapeHtml(parts[2] || "") + "\"",
      "data-omi-depth=\"" + escapeHtml(depth) + "\"",
      meta
    ].join(" ");
  }

  function elementForShape(document, shape, depth) {
    const common = attrs(document, shape.path, depth, shape.metadata || null);
    if (shape.kind === "rect") {
      return "<rect x=\"" + shape.x + "\" y=\"" + shape.y + "\" width=\"" + shape.w + "\" height=\"" + shape.h + "\" " + common + " />";
    }
    if (shape.kind === "circle") {
      return "<circle cx=\"" + shape.x + "\" cy=\"" + shape.y + "\" r=\"" + shape.r + "\" " + common + " />";
    }
    if (shape.kind === "line") {
      return "<line x1=\"" + shape.x1 + "\" y1=\"" + shape.y1 + "\" x2=\"" + shape.x2 + "\" y2=\"" + shape.y2 + "\" " + common + " />";
    }
    if (shape.kind === "polyline") {
      return "<polyline points=\"" + shape.points.join(" ") + "\" " + common + " />";
    }
    if (shape.kind === "node") {
      return "<circle cx=\"" + shape.x + "\" cy=\"" + shape.y + "\" r=\"18\" " + common + " />";
    }
    return "";
  }

  function buildSvg(document, shapes, depth, options) {
    const rootMetadata = options && options.rootMetadata ? options.rootMetadata : null;
    const editReceipt = options && options.editReceipt ? " data-omi-edit-receipt=\"" + escapeHtml(String(options.editReceipt)) + "\"" : "";
    const rootAttrs = rootMetadata ? [
      "data-omi-root=\"" + escapeHtml(rootMetadata.omi_path || document.id) + "\"",
      "data-omi-path=\"" + escapeHtml(rootMetadata.omi_path || document.id) + "\"",
      "data-omi-coordinate-receipt=\"" + escapeHtml(String(rootMetadata.coordinate_receipt || 0)) + "\"",
      "data-omi-closure-receipt=\"" + escapeHtml(String(rootMetadata.closure_receipt || 0)) + "\"",
      "data-omi-scope=\"" + escapeHtml(rootMetadata.scope || "") + "\"",
      "data-omi-carrier=\"" + escapeHtml(String(rootMetadata.carrier == null ? 255 : rootMetadata.carrier)) + "\"",
      "data-omi-witness=\"" + escapeHtml(String(rootMetadata.witness || 0)) + "\"",
      "data-omi-projection-intent=\"" + escapeHtml(rootMetadata.projection_intent || "") + "\""
    ].join(" ") : "data-omi-root=\"" + escapeHtml(document.id) + "\"";
    return "<svg viewBox=\"0 0 260 170\" " + rootAttrs + " data-omi-depth=\"" + escapeHtml(depth) + "\"" + editReceipt + ">" +
      shapes.map(function (shape) { return elementForShape(document, shape, depth); }).join("") +
      "</svg>";
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return {
    buildSvg: buildSvg
  };
}));
