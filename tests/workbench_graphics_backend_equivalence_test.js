const assert = require("assert");
const fs = require("fs");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const polyformCoordinate = require("../workbench/src/polyform_coordinate.js");
const scopeMultigraph = require("../workbench/src/scope_multigraph.js");
const compositionScene = require("../workbench/src/composition_scene.js");
const composerShell = require("../workbench/src/composer_shell.js");
const gpuCommandStream = require("../workbench/src/gpu_command_stream.js");
const backendEquivalence = require("../workbench/src/graphics_backend_equivalence.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function buildTrailerStream(mode) {
  const document = parser.parseDocument(read("models/trailer/wike-ebike-cargo-trailer.alist"));
  const blocks = [
    polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/form/body"),
    polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/wheel.left"),
    polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/wheel.right"),
    polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/tow-arm")
  ];
  return gpuCommandStream.project({
    mode: mode,
    scene: compositionScene.createScene("equiv.scene." + mode),
    blocks: blocks
  });
}

function buildScopeStream() {
  const document = parser.parseDocument(read("models/trailer/wike-ebike-cargo-trailer.alist"));
  const from = polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/wheel.left");
  const to = polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/panels/panel.floor");
  const closure = polyformCoordinate.closureFromBlocks(from, to);
  const edge = scopeMultigraph.canonicalEdge(from, to, closure, scopeMultigraph.VISIBILITY.public, scopeMultigraph.LOCATION.global);
  return gpuCommandStream.project({
    mode: "scope-graph-3d",
    scene: compositionScene.createScene("equiv.scope.scene"),
    edges: [edge]
  });
}

function buildBarcodeStream() {
  const scene = composerShell.createComposer(read("models/world/cargo-yard-demo.alist")).scene;
  return gpuCommandStream.project({
    mode: "barcode-template-scene",
    scene: scene,
    templates: [{
      omi_path: "world.cargo-yard-demo/objects/trailer.001",
      carrier: "Aztec",
      scope: "public.global",
      witness: "fixture-witness-001",
      coordinate_receipt: 123,
      closure_receipt: 456
    }]
  });
}

function testEquivalentModes() {
  console.log("Testing deterministic graphics backend equivalence");

  ["polyform-2d", "polyform-2_5d", "polyform-3d", "scope-graph-3d", "barcode-template-scene"].forEach(function (mode) {
    const stream = mode === "scope-graph-3d" ? buildScopeStream() : mode === "barcode-template-scene" ? buildBarcodeStream() : buildTrailerStream(mode);
    const comparison = backendEquivalence.compareFromStream(stream, mode);
    assert.ok(comparison);
    assert.strictEqual(comparison.same, true);
    assert.strictEqual(comparison.summaries.length, 3);
    assert.strictEqual(comparison.summaries[0].backend, "webgl");
    assert.strictEqual(comparison.summaries[1].backend, "gles");
    assert.strictEqual(comparison.summaries[2].backend, "opengl");
    assert.deepStrictEqual(comparison.summaries[0].counts, comparison.summaries[1].counts);
    assert.deepStrictEqual(comparison.summaries[1].counts, comparison.summaries[2].counts);
    assert.deepStrictEqual(comparison.summaries[0].metadata, comparison.summaries[1].metadata);
    assert.deepStrictEqual(comparison.summaries[1].metadata, comparison.summaries[2].metadata);
    assert.strictEqual(comparison.receipt, stream.command_receipt);
    assert.ok(comparison.witness);
    assert.deepStrictEqual(comparison, backendEquivalence.compareFromStream(stream, mode));
  });

  console.log("  OK WebGL, GLES, and OpenGL backend summaries are equivalent\n");
}

function testNormalizationAndRejection() {
  console.log("Testing normalized summary and rejection handling");

  const stream = buildTrailerStream("polyform-2d");
  const webglPlan = require("../workbench/src/webgl_runtime_adapter.js").adapt(stream);
  const normalized = backendEquivalence.normalizePlan(webglPlan);
  const bad = backendEquivalence.normalizePlan(null);

  assert.ok(normalized);
  assert.strictEqual(bad, null);
  assert.strictEqual(normalized.backend, "webgl");
  assert.strictEqual(normalized.counts.buffers > 0, true);
  assert.strictEqual(normalized.counts.materials > 0, true);
  assert.strictEqual(normalized.counts.draw_calls > 0, true);
  assert.strictEqual(normalized.counts.attachments > 0, true);
  assert.ok(normalized.draw_calls.every((draw) => draw.topology));

  console.log("  OK normalized summaries and invalid inputs behave deterministically\n");
}

console.log("Testing Phase 59D - Graphics Backend Equivalence Court");
console.log("======================================================\n");

testEquivalentModes();
testNormalizationAndRejection();

console.log("\n======================================================");
console.log("ALL PHASE 59D GRAPHICS BACKEND EQUIVALENCE TESTS PASSED");
