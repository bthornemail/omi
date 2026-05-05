(function (root, factory) {
  const api = factory();
  root.OMIBarcodeTemplate = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function fnv1a(text) {
    let hash = 2166136261;
    const data = String(text || "");
    for (let i = 0; i < data.length; i += 1) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function attr(text, name) {
    const pattern = new RegExp(name + "=\"([^\"]*)\"");
    const match = String(text || "").match(pattern);
    return match ? match[1] : "";
  }

  function fromSvg(svgText) {
    const text = String(svgText || "");
    const template = {
      format: "omi-svg-template",
      omi_path: attr(text, "data-omi-path"),
      carrier: attr(text, "data-omi-carrier"),
      scope: attr(text, "data-omi-scope"),
      witness: attr(text, "data-omi-witness"),
      coordinate_receipt: attr(text, "data-omi-coordinate-receipt"),
      closure_receipt: attr(text, "data-omi-closure-receipt"),
      source_receipt: fnv1a(text)
    };
    if (!template.omi_path) {
      return null;
    }
    template.witness = template.witness || String(template.source_receipt);
    return template;
  }

  function toSvg(template) {
    const source = template || {};
    const path = source.omi_path || source.path || "template.proposed";
    const carrier = source.carrier || "Code16K";
    const scope = source.scope || "public.local";
    const witness = source.witness || String(fnv1a(path + carrier + scope));
    return [
      "<svg xmlns=\"http://www.w3.org/2000/svg\" data-omi-path=\"" + path + "\" data-omi-carrier=\"" + carrier + "\" data-omi-scope=\"" + scope + "\" data-omi-witness=\"" + witness + "\">",
      "  <g data-omi-path=\"" + path + "\" data-omi-carrier=\"" + carrier + "\" data-omi-scope=\"" + scope + "\" data-omi-witness=\"" + witness + "\"></g>",
      "</svg>"
    ].join("\n");
  }

  return {
    fromSvg: fromSvg,
    toSvg: toSvg
  };
}));
