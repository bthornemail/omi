(function (root, factory) {
  const api = factory();
  root.OMIDiagramFixtureRegistry = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FIXTURES = [
    {
      id: "fixture.smith-chart",
      family: "Smith chart",
      role: "incidence-360-field",
      template_id: "diagram.smith-chart",
      carrier: "Aztec",
      scope: "public.global",
      source: "docs/temp/Smith_chart_gen.svg"
    },
    {
      id: "fixture.four-bit-adder",
      family: "4-bit adder",
      role: "aztec-component-graph",
      template_id: "diagram.carry-lookahead-adder",
      carrier: "Aztec",
      scope: "protected.global",
      source: "docs/temp/Four_bit_adder_with_carry_lookahead.svg"
    },
    {
      id: "fixture.graph-coloring",
      family: "graph coloring",
      role: "maxicode-mesh-texture-filter",
      template_id: "diagram.qpbo-graph",
      carrier: "MaxiCode",
      scope: "public.local",
      source: "docs/temp/Qpbo.svg"
    },
    {
      id: "fixture.karnaugh-torus",
      family: "Karnaugh torus",
      role: "beecode-truth-selector",
      template_id: "diagram.karnaugh-map-torus",
      carrier: "BeeCode",
      scope: "public.remote",
      source: "docs/temp/Karnaugh_map_torus.svg"
    },
    {
      id: "fixture.double-cube-distances",
      family: "double-cube distances",
      role: "code16k-cons-closure-extrusion",
      template_id: "diagram.double-cube-distance",
      carrier: "Code16K",
      scope: "protected.local",
      source: "docs/temp/Distances_between_double_cube_corners.svg"
    },
    {
      id: "fixture.genaille-rods",
      family: "Genaille rods",
      role: "arithmetic-path-projection",
      template_id: "diagram.genaille-division-rods",
      carrier: "MaxiCode",
      scope: "public.global",
      source: "docs/temp/Genaille_division_rods.svg"
    },
    {
      id: "fixture.polyform-unfoldings",
      family: "polyform unfoldings",
      role: "polyform-2d-25d-3d-basis",
      template_id: "diagram.polyform-unfoldings",
      carrier: "Code16K",
      scope: "protected.global",
      source: "docs/temp/polyform-unfoldings-reference"
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function listFixtures() {
    return FIXTURES.map(clone);
  }

  function getFixture(id) {
    const fixture = FIXTURES.find(function (item) {
      return item.id === id || item.template_id === id || item.family === id;
    });
    return fixture ? clone(fixture) : null;
  }

  function requireFixture(id) {
    return getFixture(id || "fixture.smith-chart");
  }

  return {
    listFixtures: listFixtures,
    getFixture: getFixture,
    requireFixture: requireFixture
  };
}));
