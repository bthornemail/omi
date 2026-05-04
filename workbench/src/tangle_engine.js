(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./noweb_expander.js") : root.OMINowebExpander
  );
  root.OMITangleEngine = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (nowebExpander) {
  "use strict";

  function tangle(blocks) {
    const outputs = {};
    (blocks || []).forEach(function (block) {
      const target = block && block.headerArgs ? block.headerArgs.tangle : "";
      if (!target) {
        return;
      }
      let text = block.text || "";
      if (String(block.headerArgs.noweb || "").toLowerCase() === "yes") {
        text = nowebExpander.expand(text, blocks);
      }
      if (!outputs[target]) {
        outputs[target] = [];
      }
      outputs[target].push(text);
    });

    Object.keys(outputs).forEach(function (target) {
      outputs[target] = outputs[target].join("\n");
    });

    return outputs;
  }

  return {
    tangle: tangle
  };
}));
