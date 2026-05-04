(function (root, factory) {
  const api = factory();
  root.OMIPolyform25D = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function build(document) {
    return [
      {
        kind: "extruded-panel",
        path: document.id + "/panels/panel.floor",
        width: 136,
        height: 62,
        depth: 8
      },
      {
        kind: "extruded-line",
        path: document.id + "/motion/tow-arm",
        width: 48,
        height: 10,
        depth: 6
      }
    ];
  }

  return {
    build: build
  };
}));
