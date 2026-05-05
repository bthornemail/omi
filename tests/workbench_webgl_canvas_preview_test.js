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
const webglCanvasPreview = require("../workbench/src/webgl_canvas_preview.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function buildPlan(mode) {
  const document = parser.parseDocument(read("models/trailer/wike-ebike-cargo-trailer.alist"));
  const blocks = [
    polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/form/body"),
    polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/wheel.left"),
    polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/wheel.right"),
    polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/tow-arm")
  ];
  const scene = compositionScene.createScene("preview.scene");
  return webglRuntimeAdapter.adapt(gpuCommandStream.project({
    mode: mode,
    scene: scene,
    blocks: blocks
  }));
}

function buildScopePlan() {
  const document = parser.parseDocument(read("models/trailer/wike-ebike-cargo-trailer.alist"));
  const from = polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/wheel.left");
  const to = polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/panels/panel.floor");
  const closure = polyformCoordinate.closureFromBlocks(from, to);
  const edge = scopeMultigraph.canonicalEdge(from, to, closure, scopeMultigraph.VISIBILITY.public, scopeMultigraph.LOCATION.global);
  return webglRuntimeAdapter.adapt(gpuCommandStream.project({
    mode: "scope-graph-3d",
    scene: compositionScene.createScene("scope.preview.scene"),
    edges: [edge]
  }));
}

function buildBarcodePlan() {
  const scene = composerShell.createComposer(read("models/world/cargo-yard-demo.alist")).scene;
  return webglRuntimeAdapter.adapt(gpuCommandStream.project({
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
  }));
}

function testPreviewModes() {
  console.log("Testing deterministic WebGL canvas preview modes");

  const plan2d = buildPlan("polyform-2d");
  const plan25d = buildPlan("polyform-2_5d");
  const plan3d = buildPlan("polyform-3d");

  const preview2d = webglCanvasPreview.preparePreview(plan2d);
  const preview2dAgain = webglCanvasPreview.project(plan2d);
  const preview25d = webglCanvasPreview.preparePreview(plan25d);
  const preview3d = webglCanvasPreview.preparePreview(plan3d);

  assert.ok(preview2d);
  assert.ok(preview25d);
  assert.ok(preview3d);
  assert.deepStrictEqual(preview2d, preview2dAgain);
  assert.notDeepStrictEqual(preview2d.records, preview25d.records);
  assert.notDeepStrictEqual(preview25d.records, preview3d.records);
  assert.strictEqual(preview2d.backend, "webgl-canvas-preview");
  assert.strictEqual(preview2d.mode, "polyform-2d");
  assert.ok(preview2d.records.length > 0);
  assert.ok(preview2d.records.some((record) => record.kind === "buffer"));
  assert.ok(preview2d.records.some((record) => record.kind === "material"));
  assert.ok(preview2d.records.some((record) => record.kind === "draw"));
  assert.ok(preview2d.records.every((record) => record.metadata && record.metadata.omi_path !== undefined));
  assert.ok(preview2d.preview_receipt);
  assert.strictEqual(webglCanvasPreview.preparePreview(null), null);
  assert.strictEqual(webglCanvasPreview.preparePreview({ mode: "polyform-2d" }), null);

  console.log("  OK preview accepts 2D, 2.5D, and 3D WebGL plans deterministically\n");
}

function testLookupAndPointerSelection() {
  console.log("Testing preview metadata lookup and pointer proposals");

  const plan = buildBarcodePlan();
  const preview = webglCanvasPreview.preparePreview(plan);
  const record = webglCanvasPreview.findRecord(preview, "world.cargo-yard-demo/objects/trailer.001");
  const proposal = webglCanvasPreview.selectByPath(preview, "world.cargo-yard-demo/objects/trailer.001");
  const missing = webglCanvasPreview.selectByPath(preview, "world.cargo-yard-demo/objects/missing.001");
  const planAgain = webglCanvasPreview.preparePreview(plan);

  assert.ok(record);
  assert.strictEqual(record.metadata.omi_path, "world.cargo-yard-demo/objects/trailer.001");
  assert.strictEqual(proposal.fs, "event.pointer-select");
  assert.strictEqual(proposal.target, "world.cargo-yard-demo/objects/trailer.001");
  assert.strictEqual(proposal.relation, "select");
  assert.ok(proposal.pointer);
  assert.strictEqual(missing, null);
  assert.deepStrictEqual(preview, planAgain);
  assert.strictEqual(preview.preview_receipt, planAgain.preview_receipt);
  assert.ok(preview.records.every((record) => record.metadata.omi_path === "" || typeof record.metadata.witness !== "undefined"));

  console.log("  OK metadata lookup and pointer selection stay deterministic\n");
}

function testScopeAndInvalidPlans() {
  console.log("Testing scope graph preview and invalid plan rejection");

  const scopePlan = buildScopePlan();
  const preview = webglCanvasPreview.preparePreview(scopePlan);
  const again = webglCanvasPreview.preparePreview(scopePlan);
  const badMode = webglCanvasPreview.preparePreview({
    mode: "polyform-2d",
    scene_id: "bad.scene",
    plan_receipt: 1,
    buffers: [],
    materials: [],
    draw_calls: [{ kind: "BOGUS" }],
    attachments: [],
    metadata: {}
  });

  assert.ok(preview);
  assert.deepStrictEqual(preview, again);
  assert.ok(preview.records.some((record) => record.kind === "draw"));
  assert.ok(preview.records.some((record) => record.metadata && record.metadata.scope === "public.global"));
  assert.ok(preview.records.some((record) => record.metadata && record.metadata.closure_receipt));
  assert.strictEqual(badMode, null);

  console.log("  OK scope preview and invalid plan rejection are deterministic\n");
}

console.log("Testing Phase 59A - WebGL Canvas Preview Court");
console.log("================================================\n");

testPreviewModes();
testLookupAndPointerSelection();
testScopeAndInvalidPlans();

console.log("\n================================================");
console.log("ALL PHASE 59A WEBGL CANVAS PREVIEW TESTS PASSED");
