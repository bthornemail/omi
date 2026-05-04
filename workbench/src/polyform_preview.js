(function (root, factory) {
  const api = factory();
  root.OMIPolyformPreview = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function buildPreview(document) {
    if (document.kind === "model") {
      return {
        far: document.render.far && document.render.far.output || "",
        middle: document.render.middle && document.render.middle.output || "",
        near: document.render.near && document.render.near.output || "",
        inspect: document.render.inspect && document.render.inspect.output || ""
      };
    }
    if (document.kind === "world") {
      return {
        far: document.render.resolution && document.render.resolution.far || "",
        middle: document.render.resolution && document.render.resolution.middle || "",
        near: document.render.resolution && document.render.resolution.near || "",
        inspect: document.render.resolution && document.render.resolution.inspect || ""
      };
    }
    return { far: "", middle: "", near: "", inspect: "" };
  }

  function renderPreview(document) {
    const preview = buildPreview(document);
    return ["far", "middle", "near", "inspect"].map(function (depth) {
      return "<div class=\"preview-card\"><strong>" + depth.toUpperCase() + "</strong><pre>" +
        escapeHtml(preview[depth]) + "</pre></div>";
    }).join("");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return {
    buildPreview: buildPreview,
    renderPreview: renderPreview
  };
}));
