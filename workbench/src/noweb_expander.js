(function (root, factory) {
  const api = factory();
  root.OMINowebExpander = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function indexBlocks(blocks) {
    const lookup = {};
    (blocks || []).forEach(function (block) {
      if (block && block.name) {
        lookup[block.name] = block.text || "";
      }
    });
    return lookup;
  }

  function expand(text, blocks) {
    const lookup = indexBlocks(blocks);
    return String(text || "").replace(/<<([^>]+)>>/g, function (_, name) {
      return Object.prototype.hasOwnProperty.call(lookup, name) ? lookup[name] : "";
    });
  }

  return {
    expand: expand
  };
}));
