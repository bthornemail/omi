const assert = require("assert");
const fs = require("fs");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const polyformCoordinate = require("../workbench/src/polyform_coordinate.js");
const scopeMultigraph = require("../workbench/src/scope_multigraph.js");
const compositionScene = require("../workbench/src/composition_scene.js");
const composerShell = require("../workbench/src/composer_shell.js");
const gpuCommandStream = require("../workbench/src/gpu_command_stream.js");
const webglRuntimeAdapter = require("../workbench/src/webgl_runtime_adapter.js");

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
  const scene = compositionScene.createScene("webgl.scene");
  return gpuCommandStream.project({
    mode: mode,
    scene: scene,
    blocks: blocks
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

function buildScopeStream() {
  const document = parser.parseDocument(read("models/trailer/wike-ebike-cargo-trailer.alist"));
  const from = polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/wheel.left");
  const to = polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/panels/panel.floor");
  const closure = polyformCoordinate.closureFromBlocks(from, to);
  const edge = scopeMultigraph.canonicalEdge(from, to, closure, scopeMultigraph.VISIBILITY.public, scopeMultigraph.LOCATION.global);
  return gpuCommandStream.project({
    mode: "scope-graph-3d",
    scene: compositionScene.createScene("scope.webgl.scene"),
    edges: [edge]
  });
}

function testProjectionModes() {
  console.log("Testing deterministic WebGL runtime plan modes");

  const stream2d = buildTrailerStream("polyform-2d");
  const stream25d = buildTrailerStream("polyform-2_5d");
  const stream3d = buildTrailerStream("polyform-3d");

  const plan2d = webglRuntimeAdapter.adapt(stream2d);
  const plan2dAgain = webglRuntimeAdapter.project(stream2d);
  const plan25d = webglRuntimeAdapter.adapt(stream25d);
  const plan3d = webglRuntimeAdapter.adapt(stream3d);

  assert.ok(plan2d);
  assert.ok(plan25d);
  assert.ok(plan3d);
  assert.deepStrictEqual(plan2d, plan2dAgain);
  assert.notDeepStrictEqual(plan2d, plan25d);
  assert.notDeepStrictEqual(plan25d, plan3d);
  assert.strictEqual(plan2d.mode, "polyform-2d");
  assert.strictEqual(plan2d.begin.kind, "BEGIN_PLAN");
  assert.strictEqual(plan2d.end.kind, "END_PLAN");
  assert.ok(plan2d.buffers.some((buffer) => buffer.target === "ARRAY_BUFFER"));
  assert.ok(plan2d.buffers.some((buffer) => buffer.target === "ELEMENT_ARRAY_BUFFER"));
  assert.ok(plan2d.materials.some((material) => material.metadata && material.metadata.omi_path));
  assert.ok(plan2d.draw_calls.some((draw) => draw.topology === "triangle-fan"));
  assert.ok(plan25d.draw_calls.some((draw) => draw.topology === "triangle-strip"));
  assert.ok(plan3d.draw_calls.some((draw) => draw.topology === "triangles"));
  assert.ok(plan2d.draw_calls.every((draw) => draw.metadata && draw.metadata.omi_path));
  assert.ok(plan2d.plan_receipt);
  assert.strictEqual(webglRuntimeAdapter.adapt({
    mode: "polyform-2d",
    scene_id: "bad.scene",
    command_receipt: 1,
    commands: [
      { kind: "BEGIN_SCENE" },
      { kind: "BOGUS_COMMAND" },
      { kind: "END_SCENE" }
    ]
  }), null);

  console.log("  OK 2D, 2.5D, and 3D WebGL plans are deterministic and distinct\n");
}

function testScopeAndBarcodePlans() {
  console.log("Testing scope graph and barcode template WebGL plans");

  const scopeStream = buildScopeStream();
  const barcodeStream = buildBarcodeStream();
  const scopePlan = webglRuntimeAdapter.adapt(scopeStream);
  const barcodePlan = webglRuntimeAdapter.adapt(barcodeStream);
  const barcodePlanAgain = webglRuntimeAdapter.project(barcodeStream);

  assert.ok(scopePlan);
  assert.ok(barcodePlan);
  assert.deepStrictEqual(barcodePlan, barcodePlanAgain);
  assert.ok(scopePlan.draw_calls.some((draw) => draw.topology === "line-list" || draw.topology === "line-strip"));
  assert.ok(scopePlan.draw_calls.some((draw) => draw.metadata && draw.metadata.scope === "public.global"));
  assert.ok(scopePlan.draw_calls.some((draw) => draw.metadata && draw.metadata.closure_receipt));
  assert.ok(barcodePlan.attachments.some((attachment) => attachment.metadata && attachment.metadata.carrier === "Aztec"));
  assert.ok(barcodePlan.attachments.some((attachment) => attachment.metadata && attachment.metadata.scope === "public.global"));
  assert.ok(barcodePlan.attachments.some((attachment) => attachment.metadata && attachment.metadata.omi_path));
  assert.strictEqual(barcodePlan.plan_receipt, barcodePlanAgain.plan_receipt);

  console.log("  OK scope and barcode plans preserve OMI metadata deterministically\n");
}

console.log("Testing Phase 58 - WebGL Runtime Adapter Court");
console.log("================================================\n");

testProjectionModes();
testScopeAndBarcodePlans();

console.log("\n================================================");
console.log("ALL PHASE 58 WEBGL RUNTIME ADAPTER TESTS PASSED");
