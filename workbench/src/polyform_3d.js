(function (root, factory) {
  const api = factory();
  root.OMIPolyform3D = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function build(document) {
    return [
      {
        kind: "polycube",
        path: document.id + "/form/body",
        size: [1.36, 0.62, 0.54]
      },
      {
        kind: "cylinder",
        path: document.id + "/motion/wheel.left",
        radius: 0.18,
        depth: 0.08
      },
      {
        kind: "cylinder",
        path: document.id + "/motion/wheel.right",
        radius: 0.18,
        depth: 0.08
      }
    ];
  }

  return {
    build: build
  };
}));
