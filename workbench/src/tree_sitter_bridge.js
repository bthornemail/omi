(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./org_babel_blocks.js") : root.OMIOrgBabelBlocks
  );
  root.OMITreeSitterBridge = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (babelBlocks) {
  "use strict";

  function extractOmiBlocks(text) {
    return babelBlocks.parse(text).filter(function (block) {
      return block.language === "omilisp";
    });
  }

  function extractGraphBlocks(text) {
    return babelBlocks.parse(text).filter(function (block) {
      return block.language === "dot";
    });
  }

  function extractSvgPointers(text) {
    const pointers = [];
    const pattern = /data-omi-path="([^"]+)"/g;
    let match;
    while ((match = pattern.exec(String(text || "")))) {
      pointers.push(match[1]);
    }
    return pointers;
  }

  return {
    extractOmiBlocks: extractOmiBlocks,
    extractGraphBlocks: extractGraphBlocks,
    extractSvgPointers: extractSvgPointers
  };
}));
