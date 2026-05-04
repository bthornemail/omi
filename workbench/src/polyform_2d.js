(function (root, factory) {
  const api = factory();
  root.OMIPolyform2D = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function trailerShapes(document, depth) {
    const base = {
      far: [
        { kind: "rect", x: 50, y: 40, w: 140, h: 70, path: document.id + "/form/body" },
        { kind: "circle", x: 80, y: 130, r: 18, path: document.id + "/motion/wheel.left" },
        { kind: "circle", x: 160, y: 130, r: 18, path: document.id + "/motion/wheel.right" },
        { kind: "polyline", points: [190, 80, 220, 95, 235, 70], path: document.id + "/motion/tow-arm" }
      ],
      middle: [
        { kind: "rect", x: 52, y: 45, w: 136, h: 62, path: document.id + "/panels/panel.floor" },
        { kind: "line", x1: 52, y1: 45, x2: 52, y2: 107, path: document.id + "/frame/rail.bottom.left" },
        { kind: "line", x1: 188, y1: 45, x2: 188, y2: 107, path: document.id + "/frame/rail.bottom.right" },
        { kind: "circle", x: 80, y: 128, r: 18, path: document.id + "/motion/wheel.left" },
        { kind: "circle", x: 160, y: 128, r: 18, path: document.id + "/motion/wheel.right" },
        { kind: "polyline", points: [188, 76, 220, 92, 234, 68], path: document.id + "/motion/tow-arm" }
      ],
      near: [
        { kind: "line", x1: 52, y1: 45, x2: 188, y2: 45, path: document.id + "/frame/rail.top.left" },
        { kind: "line", x1: 52, y1: 107, x2: 188, y2: 107, path: document.id + "/frame/rail.bottom.left" },
        { kind: "rect", x: 64, y: 72, w: 14, h: 10, path: document.id + "/panels/panel.left" },
        { kind: "rect", x: 164, y: 72, w: 14, h: 10, path: document.id + "/panels/panel.right" },
        { kind: "circle", x: 68, y: 52, r: 5, path: document.id + "/markings/triangle-emblem" },
        { kind: "circle", x: 172, y: 52, r: 5, path: document.id + "/markings/logo" },
        { kind: "polyline", points: [188, 76, 220, 92, 234, 68], path: document.id + "/motion/tow-arm" }
      ],
      inspect: [
        { kind: "rect", x: 52, y: 45, w: 136, h: 62, path: document.id + "/form/body" }
      ]
    };
    return base[depth] || base.far;
  }

  function worldShapes(document) {
    return [
      { kind: "node", x: 60, y: 70, label: "trailer.001", path: document.id + "/objects/trailer.001" },
      { kind: "node", x: 200, y: 40, label: "bicycle.001", path: document.id + "/objects/bicycle.001" },
      { kind: "node", x: 210, y: 130, label: "cargo.001", path: document.id + "/objects/cargo.001" }
    ];
  }

  function build(document, depth) {
    if (document.kind === "world") {
      return worldShapes(document);
    }
    return trailerShapes(document, depth || "far");
  }

  return {
    build: build
  };
}));
