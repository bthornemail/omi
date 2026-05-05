const assert = require("assert");
const fs = require("fs");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const polyformCoordinate = require("../workbench/src/polyform_coordinate.js");
const scopeMultigraph = require("../workbench/src/scope_multigraph.js");
const compositionScene = require("../workbench/src/composition_scene.js");
const composerShell = require("../workbench/src/composer_shell.js");
const gpuCommandStream = require("../workbench/src/gpu_command_stream.js");
const openglRuntimeAdapter = require("../workbench/src/opengl_runtime_adapter.js");

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
  const scene = compositionScene.createScene("opengl.scene");
  return gpuCommandStream.project({
    mode: mode,
    scene: scene,
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
    scene: compositionScene.createScene("opengl.scope.scene"),
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

function testProjectionModes() {
  console.log("Testing deterministic OpenGL runtime plan modes");

  const stream2d = buildTrailerStream("polyform-2d");
  const stream25d = buildTrailerStream("polyform-2_5d");
  const stream3d = buildTrailerStream("polyform-3d");

  const plan2d = openglRuntimeAdapter.adapt(stream2d);
  const plan2dAgain = openglRuntimeAdapter.project(stream2d);
  const plan25d = openglRuntimeAdapter.adapt(stream25d);
  const plan3d = openglRuntimeAdapter.adapt(stream3d);

  assert.ok(plan2d);
  assert.ok(plan25d);
  assert.ok(plan3d);
  assert.deepStrictEqual(plan2d, plan2dAgain);
  assert.notDeepStrictEqual(plan2d, plan25d);
  assert.notDeepStrictEqual(plan25d, plan3d);
  assert.strictEqual(plan2d.backend, "opengl-runtime-plan");
  assert.strictEqual(plan2d.mode, "polyform-2d");
  assert.strictEqual(plan2d.begin.kind, "BEGIN_OPENGL_PLAN");
  assert.strictEqual(plan2d.end.kind, "END_OPENGL_PLAN");
  assert.ok(plan2d.buffers.some((buffer) => buffer.kind === "OPENGL_BUFFER_PLAN" && buffer.target === "ARRAY_BUFFER"));
  assert.ok(plan2d.buffers.some((buffer) => buffer.kind === "OPENGL_BUFFER_PLAN" && buffer.target === "ELEMENT_ARRAY_BUFFER"));
  assert.ok(plan2d.materials.some((material) => material.kind === "OPENGL_MATERIAL_PLAN"));
  assert.ok(plan2d.draw_calls.some((draw) => draw.primitive_mode === "GL_TRIANGLE_FAN"));
  assert.ok(plan25d.draw_calls.some((draw) => draw.primitive_mode === "GL_TRIANGLE_STRIP"));
  assert.ok(plan3d.draw_calls.some((draw) => draw.primitive_mode === "GL_TRIANGLES"));
  assert.ok(plan2d.draw_calls.every((draw) => draw.metadata && draw.metadata.omi_path !== undefined));
  assert.ok(plan2d.plan_receipt);
  assert.strictEqual(openglRuntimeAdapter.adapt({
    mode: "polyform-2d",
    scene_id: "bad.scene",
    command_receipt: 1,
    commands: [
      { kind: "BEGIN_SCENE" },
      { kind: "BOGUS_COMMAND" },
      { kind: "END_SCENE" }
    ]
  }), null);

  console.log("  OK polyform command streams map to deterministic OpenGL plans\n");
}

function testScopeAndBarcodeModes() {
  console.log("Testing scope graph and barcode template OpenGL plans");

  const scopeStream = buildScopeStream();
  const barcodeStream = buildBarcodeStream();
  const scopePlan = openglRuntimeAdapter.adapt(scopeStream);
  const barcodePlan = openglRuntimeAdapter.adapt(barcodeStream);
  const barcodePlanAgain = openglRuntimeAdapter.project(barcodeStream);

  assert.ok(scopePlan);
  assert.ok(barcodePlan);
  assert.deepStrictEqual(barcodePlan, barcodePlanAgain);
  assert.ok(scopePlan.draw_calls.some((draw) => draw.primitive_mode === "GL_LINES" || draw.primitive_mode === "GL_LINE_STRIP"));
  assert.ok(scopePlan.draw_calls.some((draw) => draw.metadata && draw.metadata.scope === "public.global"));
  assert.ok(scopePlan.draw_calls.some((draw) => draw.metadata && draw.metadata.closure_receipt));
  assert.ok(barcodePlan.attachments.some((attachment) => attachment.metadata && attachment.metadata.carrier === "Aztec"));
  assert.ok(barcodePlan.attachments.some((attachment) => attachment.metadata && attachment.metadata.scope === "public.global"));
  assert.ok(barcodePlan.attachments.some((attachment) => attachment.metadata && attachment.metadata.omi_path));
  assert.strictEqual(barcodePlan.plan_receipt, barcodePlanAgain.plan_receipt);

  console.log("  OK scope and barcode projections preserve OMI metadata deterministically\n");
}

console.log("Testing Phase 59C - OpenGL Desktop Adapter Court");
console.log("===============================================\n");

testProjectionModes();
testScopeAndBarcodeModes();

console.log("\n===============================================");
console.log("ALL PHASE 59C OPENGL ADAPTER TESTS PASSED");
