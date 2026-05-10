const assert = require("assert");
const fs = require("fs");
const path = require("path");

const autonomousWorldBuilder = require("../workbench/src/autonomous_world_builder.js");
const autonomousWorldBrowser = require("../workbench/src/autonomous_world_browser.js");
const autonomousWorldLiveRenderer = require("../workbench/src/autonomous_world_live_renderer.js");
const omilispDeclaration = require("../workbench/src/omilisp_declaration.js");
const spomAdapter = require("../workbench/src/spom_adapter.js");

const repoRoot = path.join(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function recordId(record) {
  return record && record.values ? record.values[0] : record.sid || record.name;
}

function testDeterministicRenderPlan() {
  console.log("Testing deterministic render plan receipts");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const first = autonomousWorldLiveRenderer.createRenderPlan(built);
  const second = autonomousWorldLiveRenderer.createRenderPlan(built);

  assert.strictEqual(first.world_id, "world.autonomous-fixture");
  assert.strictEqual(first.identity_receipt, built.admission.identity_receipt);
  assert.strictEqual(first.render_receipt, second.render_receipt);
  assert.strictEqual(first.authority, false);
  assert.strictEqual(first.mutation, false);

  console.log("  OK same admitted world emits stable render plan receipt\n");
}

function testDeterministicAnimationPlan() {
  console.log("Testing deterministic animation plan receipts");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const first = autonomousWorldLiveRenderer.createAnimationPlan(built, {
    frame_count: 5,
    timeline: { frame: 11, period: 5040 }
  });
  const second = autonomousWorldLiveRenderer.createAnimationPlan(built, {
    frame_count: 5,
    timeline: { frame: 11, period: 5040 }
  });

  assert.strictEqual(first.identity_receipt, built.admission.identity_receipt);
  assert.strictEqual(first.animation_receipt, second.animation_receipt);
  assert.strictEqual(first.timeline.frame_count, 5);
  assert.strictEqual(first.frames.length, 5);
  assert.ok(first.frames.every((frame) => frame.identity_receipt === first.identity_receipt));
  assert.strictEqual(first.authority, false);

  console.log("  OK same admitted world emits stable animation plan receipt\n");
}

function testProjectionChangesDoNotChangeIdentity() {
  console.log("Testing view camera and timeline changes preserve world identity");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const base = autonomousWorldLiveRenderer.createRenderPlan(built, {
    view_mode: "greedy",
    camera: { mode: "orthographic", target: "world.root", zoom: 1 },
    timeline: { frame: 0, period: 5040 }
  });
  const viewChanged = autonomousWorldLiveRenderer.createRenderPlan(built, {
    view_mode: "animated",
    camera: { mode: "orthographic", target: "world.root", zoom: 1 },
    timeline: { frame: 0, period: 5040 }
  });
  const cameraChanged = autonomousWorldLiveRenderer.createRenderPlan(built, {
    view_mode: "greedy",
    camera: { mode: "orthographic", target: "trailer.001", zoom: 2 },
    timeline: { frame: 0, period: 5040 }
  });
  const timelineChanged = autonomousWorldLiveRenderer.createRenderPlan(built, {
    view_mode: "greedy",
    camera: { mode: "orthographic", target: "world.root", zoom: 1 },
    timeline: { frame: 37, period: 5040 }
  });

  assert.strictEqual(viewChanged.identity_receipt, base.identity_receipt);
  assert.strictEqual(cameraChanged.identity_receipt, base.identity_receipt);
  assert.strictEqual(timelineChanged.identity_receipt, base.identity_receipt);
  assert.notStrictEqual(viewChanged.render_receipt, base.render_receipt);
  assert.notStrictEqual(cameraChanged.render_receipt, base.render_receipt);
  assert.notStrictEqual(timelineChanged.render_receipt, base.render_receipt);
  assert.notStrictEqual(viewChanged.view_receipt, base.view_receipt);

  console.log("  OK projection changes update render/view receipts only\n");
}

function testChangedWorldChangesIdentity() {
  console.log("Testing changed admitted world changes render identity");

  const first = autonomousWorldLiveRenderer.createRenderPlan(autonomousWorldBuilder.buildAutonomousWorld());
  const changed = autonomousWorldLiveRenderer.createRenderPlan(autonomousWorldBuilder.buildAutonomousWorld({
    seed: "world.autonomous-fixture.changed"
  }));

  assert.notStrictEqual(first.identity_receipt, changed.identity_receipt);
  assert.notStrictEqual(first.render_receipt, changed.render_receipt);
  assert.notStrictEqual(first.world_id, changed.world_id);

  console.log("  OK changed admitted world changes identity and render receipt\n");
}

function testRendererDoesNotMutateBrowserOrBuilder() {
  console.log("Testing renderer actions do not mutate builder or browser authority");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const browser = autonomousWorldBrowser.openWorld(built);
  const beforeIdentity = browser.identity_receipt;
  const beforeObjectCount = autonomousWorldBrowser.listObjects(browser).length;
  const plan = autonomousWorldLiveRenderer.createRenderPlan(browser);
  const animation = autonomousWorldLiveRenderer.createAnimationPlan(browser);

  assert.strictEqual(browser.identity_receipt, beforeIdentity);
  assert.strictEqual(autonomousWorldBrowser.listObjects(browser).length, beforeObjectCount);
  assert.strictEqual(built.report.authority.builder_authority, false);
  assert.strictEqual(plan.identity_receipt, beforeIdentity);
  assert.strictEqual(animation.identity_receipt, beforeIdentity);
  assert.strictEqual(plan.authority, false);
  assert.strictEqual(animation.authority, false);

  console.log("  OK renderer emits projections without mutating builder/browser authority\n");
}

function testRenderPlanPathsAndReceipts() {
  console.log("Testing render plan paths and visible receipts");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const plan = autonomousWorldLiveRenderer.createRenderPlan(built);
  const summary = autonomousWorldLiveRenderer.renderSummary(built);

  assert.ok(plan.objects.some((object) => object.path === "world.autonomous-fixture/objects/trailer.001"));
  assert.ok(plan.relations.some((relation) => relation.path === "world.autonomous-fixture/interactions/hitch-link.001"));
  assert.ok(plan.spom_paths.some((spom) => (
    spom.subject === "trailer.001" &&
    spom.predicate === "model" &&
    spom.object === "model.trailer.wike-ebike-cargo"
  )));
  assert.strictEqual(plan.receipts.package.manifest_receipt, built.report.package.manifest_receipt);
  assert.strictEqual(plan.receipts.raw_binary.identity_receipt, built.report.raw_binary.identity_receipt);
  assert.strictEqual(plan.receipts.closure.character_identity_receipt, built.report.closure.character_identity_receipt);
  assert.strictEqual(summary.identity_receipt, plan.identity_receipt);
  assert.strictEqual(summary.object_path_count, plan.objects.length);
  assert.strictEqual(summary.relation_path_count, plan.relations.length);
  assert.strictEqual(summary.authority, false);

  console.log("  OK render plan exposes object relation S-P-O-M and receipt paths\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 101 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-live-renderer.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const renderers = asArray(selfMap.declaration["world-renderer-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-live-renderer");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.live-renderer");
  assert.strictEqual(parsedA.declaration.rule["renderer-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["render-plan-is-world-state"], false);
  assert.strictEqual(parsedA.declaration.rule["animation-is-mutation"], false);
  assert.ok(String(guards.get("projection-body")).includes("renderable body"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-live-renderer" &&
    triplet.predicate === "section" &&
    triplet.object === "render-workflow"
  )));
  assert.ok(renderers.map(recordId).includes("autonomous-world-live-renderer"));
  assert.ok(declaredPaths.includes("docs/PHASE-101-AUTONOMOUS-WORLD-LIVE-RENDERER.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-live-renderer.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_live_renderer.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-renderer-courts"]).includes("object-paths"));

  console.log("  OK Phase 101 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 101 - Autonomous World Live Renderer");
console.log("====================================================\n");

testDeterministicRenderPlan();
testDeterministicAnimationPlan();
testProjectionChangesDoNotChangeIdentity();
testChangedWorldChangesIdentity();
testRendererDoesNotMutateBrowserOrBuilder();
testRenderPlanPathsAndReceipts();
testDoctrineAndSelfMap();

console.log("\n====================================================");
console.log("ALL PHASE 101 AUTONOMOUS WORLD LIVE RENDERER TESTS PASSED");
