(function (root, factory) {
  const api = factory();
  root.OMIPolyformBasis = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const registry = {
    "2d": [
      { id: "polyomino", cell: "square", dimension: 2, output: ["svg", "canvas"] },
      { id: "polyiamond", cell: "equilateral-triangle", dimension: 2, output: ["svg", "canvas"] },
      { id: "polyhex", cell: "hexagon", dimension: 2, output: ["svg", "canvas"] },
      { id: "polyround", cell: "circle", dimension: 2, output: ["svg", "canvas"] }
    ],
    "2.5d": [
      { id: "extruded-panel", source: "2d-polyform", operation: "extrude", dimension: 2.5, output: ["aframe", "gltf", "obj"] },
      { id: "layered-panel", source: "rectangle", operation: "stack", dimension: 2.5, output: ["aframe", "gltf", "obj"] }
    ],
    "3d": [
      { id: "polycube", cell: "cube", dimension: 3, output: ["aframe", "gltf", "obj"] },
      { id: "polytope", notation: "schlafli", dimension: 3, output: ["gltf", "obj"] }
    ]
  };

  function getRegistry() {
    return JSON.parse(JSON.stringify(registry));
  }

  return {
    getRegistry: getRegistry
  };
}));
