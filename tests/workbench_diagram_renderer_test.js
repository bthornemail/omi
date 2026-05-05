const assert = require("assert");
const fs = require("fs");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const diagramTangle = require("../workbench/src/diagram_tangle.js");
const fixtureRegistry = require("../workbench/src/diagram_fixture_registry.js");
const renderer = require("../workbench/src/diagram_renderer_adapter.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function makeArtifacts() {
  const source = read("models/world/cargo-yard-demo.alist");
  const document = parser.parseDocument(source);
  const templateText = read("diagrams/qpbo-graph.omilisp");
  const artifacts = diagramTangle.tangleArtifacts({
    document: document,
    templateText: templateText,
    nowebBlocks: []
  });
  return { document, artifacts };
}

function testFixtureRegistry() {
  console.log("Testing deterministic diagram fixture registry");

  const fixturesA = fixtureRegistry.listFixtures();
  const fixturesB = fixtureRegistry.listFixtures();
  const ids = fixturesA.map((fixture) => fixture.id);

  assert.deepStrictEqual(fixturesA, fixturesB);
  assert.ok(ids.includes("fixture.smith-chart"));
  assert.ok(ids.includes("fixture.four-bit-adder"));
  assert.ok(ids.includes("fixture.graph-coloring"));
  assert.ok(ids.includes("fixture.karnaugh-torus"));
  assert.ok(ids.includes("fixture.double-cube-distances"));
  assert.ok(ids.includes("fixture.genaille-rods"));
  assert.ok(ids.includes("fixture.polyform-unfoldings"));
  assert.strictEqual(fixtureRegistry.getFixture("unknown.fixture"), null);

  console.log("  OK all fixture families register deterministically\n");
}

function testRendererModes() {
  console.log("Testing deterministic renderer modes");

  const { document, artifacts } = makeArtifacts();
  const baseOptions = {
    document,
    artifacts,
    fixtureId: "fixture.graph-coloring"
  };

  const fallbackA = renderer.render(Object.assign({}, baseOptions, { mode: "fallback-svg" }));
  const fallbackB = renderer.render(Object.assign({}, baseOptions, { mode: "fallback-svg" }));
  const dot = renderer.render(Object.assign({}, baseOptions, { mode: "dot-source" }));
  const html = renderer.render(Object.assign({}, baseOptions, { mode: "html-inline-svg" }));
  const external = renderer.render(Object.assign({}, baseOptions, { mode: "external-graphviz-optional" }));

  assert.strictEqual(fallbackA, fallbackB);
  assert.ok(fallbackA.includes("<svg"));
  assert.ok(fallbackA.includes("data-omi-path="));
  assert.ok(fallbackA.includes("data-omi-carrier=\"MaxiCode\""));
  assert.ok(fallbackA.includes("data-omi-scope=\"public.local\""));
  assert.ok(fallbackA.includes("data-omi-witness="));
  assert.strictEqual(dot, artifacts.outputs["graph.dot"]);
  assert.ok(dot.includes("hitch-link.001"));
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes("<svg"));
  assert.ok(external.includes("external-graphviz-optional"));
  assert.strictEqual(renderer.render(Object.assign({}, baseOptions, { mode: "unknown-mode" })), null);

  console.log("  OK fallback, DOT, HTML, and optional Graphviz modes stay deterministic\n");
}

function testCoordinateAndScopeModes() {
  console.log("Testing coordinate and scope multi-graph SVG metadata");

  const { document, artifacts } = makeArtifacts();
  const baseOptions = {
    document,
    artifacts,
    fixtureId: "fixture.double-cube-distances"
  };
  const coordinate = renderer.render(Object.assign({}, baseOptions, { mode: "coordinate-overlay-svg" }));
  const scope = renderer.render(Object.assign({}, baseOptions, { mode: "scope-multigraph-svg" }));
  const scopeAgain = renderer.render(Object.assign({}, baseOptions, { mode: "scope-multigraph-svg" }));

  assert.strictEqual(scope, scopeAgain);
  assert.ok(coordinate.includes("data-omi-x="));
  assert.ok(coordinate.includes("data-omi-y="));
  assert.ok(coordinate.includes("data-omi-z="));
  assert.ok(coordinate.includes("data-omi-w="));
  assert.ok(coordinate.includes("data-omi-coordinate-receipt="));
  assert.ok(scope.includes("data-omi-scope="));
  assert.ok(scope.includes("data-omi-visibility="));
  assert.ok(scope.includes("data-omi-location="));
  assert.ok(scope.includes("data-omi-carrier="));
  assert.ok(scope.includes("data-omi-orientation4="));
  assert.ok(scope.includes("data-omi-public-frame240="));
  assert.ok(scope.includes("data-omi-closure-receipt="));

  console.log("  OK coordinate and scope metadata survive renderer projection\n");
}

console.log("Testing Phase 55 - Diagram Renderer Adapter Court");
console.log("==================================================\n");

testFixtureRegistry();
testRendererModes();
testCoordinateAndScopeModes();

console.log("\n==================================================");
console.log("ALL PHASE 55 DIAGRAM RENDERER TESTS PASSED");
