const assert = require("assert");
const fs = require("fs");
const path = require("path");

const autonomousWorldBuilder = require("../workbench/src/autonomous_world_builder.js");
const autonomousWorldBrowser = require("../workbench/src/autonomous_world_browser.js");
const autonomousWorldInterjectionOverlay = require("../workbench/src/autonomous_world_interjection_overlay.js");
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

function baseInterjection(overrides) {
  return Object.assign({
    overlay_id: "overlay.example",
    target_path: "world.autonomous-fixture/objects/trailer.001",
    kind: "annotation",
    body: "observer note",
    modality: "projection.interjection",
    observer: "observer.local",
    branch: "branch.local"
  }, overrides || {});
}

function testDeterministicOverlayReceipt() {
  console.log("Testing deterministic interjection overlay receipts");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const first = autonomousWorldInterjectionOverlay.createOverlay(built, baseInterjection());
  const second = autonomousWorldInterjectionOverlay.createOverlay(built, baseInterjection());

  assert.strictEqual(first.world_identity_receipt, built.admission.identity_receipt);
  assert.strictEqual(first.overlay_receipt, second.overlay_receipt);
  assert.strictEqual(first.view_receipt, second.view_receipt);
  assert.strictEqual(first.authority, false);
  assert.strictEqual(first.target_found, true);

  console.log("  OK same admitted world and same interjection produce stable overlay receipt\n");
}

function testInterjectionChangesOverlayNotWorldIdentity() {
  console.log("Testing interjection changes overlay receipt but not world identity");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const first = autonomousWorldInterjectionOverlay.createOverlay(built, baseInterjection({
    body: "observer note"
  }));
  const changed = autonomousWorldInterjectionOverlay.createOverlay(built, baseInterjection({
    body: "alternate observer note"
  }));

  assert.strictEqual(first.world_identity_receipt, built.admission.identity_receipt);
  assert.strictEqual(changed.world_identity_receipt, built.admission.identity_receipt);
  assert.notStrictEqual(first.overlay_receipt, changed.overlay_receipt);
  assert.notStrictEqual(first.view_receipt, changed.view_receipt);

  console.log("  OK interjection content changes overlay receipts only\n");
}

function testTargetPathChangesOverlayReceipt() {
  console.log("Testing object relation and S-P-O-M target paths");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const objectOverlay = autonomousWorldInterjectionOverlay.createOverlay(built, baseInterjection({
    target_path: "world.autonomous-fixture/objects/trailer.001"
  }));
  const relationOverlay = autonomousWorldInterjectionOverlay.createOverlay(built, baseInterjection({
    target_path: "world.autonomous-fixture/interactions/hitch-link.001"
  }));
  const spomOverlay = autonomousWorldInterjectionOverlay.createOverlay(built, baseInterjection({
    target_path: "spom/0/trailer.001/model/model.trailer.wike-ebike-cargo"
  }));

  assert.strictEqual(objectOverlay.target_kind, "object");
  assert.strictEqual(relationOverlay.target_kind, "relation");
  assert.strictEqual(spomOverlay.target_kind, "spom");
  assert.notStrictEqual(objectOverlay.overlay_receipt, relationOverlay.overlay_receipt);
  assert.notStrictEqual(objectOverlay.overlay_receipt, spomOverlay.overlay_receipt);
  assert.notStrictEqual(relationOverlay.overlay_receipt, spomOverlay.overlay_receipt);
  assert.strictEqual(objectOverlay.world_identity_receipt, relationOverlay.world_identity_receipt);
  assert.strictEqual(relationOverlay.world_identity_receipt, spomOverlay.world_identity_receipt);

  console.log("  OK different target paths change overlay receipt without changing world identity\n");
}

function testBranchSnapshotProjectionOnly() {
  console.log("Testing branch snapshot is projection-only");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(built, baseInterjection());
  const branch = autonomousWorldInterjectionOverlay.createBranchSnapshot(built, overlay, {
    branch_id: "branch.fixture"
  });

  assert.strictEqual(branch.world_identity_receipt, built.admission.identity_receipt);
  assert.strictEqual(branch.branch_id, "branch.fixture");
  assert.strictEqual(branch.overlays.length, 1);
  assert.strictEqual(branch.overlays[0].overlay_receipt, overlay.overlay_receipt);
  assert.strictEqual(branch.authority, false);
  assert.strictEqual(branch.canonical_history, false);
  assert.ok(branch.branch_receipt);

  console.log("  OK branch snapshot carries overlay receipts without becoming canonical history\n");
}

function testBrowserAndRendererOverlayProjection() {
  console.log("Testing browser and renderer overlay projections preserve identity");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const browser = autonomousWorldBrowser.openWorld(built);
  const beforeIdentity = browser.identity_receipt;
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(browser, baseInterjection());
  const browserProjection = autonomousWorldInterjectionOverlay.overlayBrowser(browser, overlay);
  const renderProjection = autonomousWorldInterjectionOverlay.overlayRenderPlan(browser, overlay, {
    view_mode: "greedy"
  });

  assert.strictEqual(browser.identity_receipt, beforeIdentity);
  assert.strictEqual(browserProjection.identity_receipt, beforeIdentity);
  assert.strictEqual(renderProjection.identity_receipt, beforeIdentity);
  assert.strictEqual(browserProjection.overlay_count, 1);
  assert.strictEqual(renderProjection.overlay_count, 1);
  assert.strictEqual(browserProjection.overlays[0].overlay_receipt, overlay.overlay_receipt);
  assert.strictEqual(renderProjection.overlays[0].overlay_receipt, overlay.overlay_receipt);
  assert.strictEqual(browserProjection.authority, false);
  assert.strictEqual(renderProjection.authority, false);
  assert.strictEqual(renderProjection.mutation, false);

  console.log("  OK browser and renderer show overlays without admitting them as world state\n");
}

function testReceiptPanelRemainsVisible() {
  console.log("Testing package closure and raw-binary receipts remain visible");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(built, baseInterjection());
  const receipts = autonomousWorldInterjectionOverlay.overlayReceiptPanel(built, overlay);

  assert.strictEqual(receipts.identity_receipt, built.admission.identity_receipt);
  assert.strictEqual(receipts.package.manifest_receipt, built.report.package.manifest_receipt);
  assert.strictEqual(receipts.raw_binary.identity_receipt, built.report.raw_binary.identity_receipt);
  assert.strictEqual(receipts.closure.character_identity_receipt, built.report.closure.character_identity_receipt);
  assert.strictEqual(receipts.overlays[0].overlay_receipt, overlay.overlay_receipt);
  assert.strictEqual(receipts.overlays[0].authority, false);

  console.log("  OK package closure raw-binary and overlay receipts remain visible\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 102 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-interjection-overlay.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const overlays = asArray(selfMap.declaration["world-interjection-overlays"].overlay);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-interjection-overlay");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.interjection-overlay");
  assert.strictEqual(parsedA.declaration.rule["interjection-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["overlay-is-canonical-world-state"], false);
  assert.strictEqual(parsedA.declaration.rule["branch-snapshot-is-canonical-history"], false);
  assert.strictEqual(parsedA.declaration.rule["observer-input-requires-receipt-witness"], true);
  assert.ok(String(guards.get("projected-interjection")).includes("observer speak"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-interjection-overlay" &&
    triplet.predicate === "section" &&
    triplet.object === "overlay-workflow"
  )));
  assert.ok(overlays.map(recordId).includes("autonomous-world-interjection-overlay"));
  assert.ok(declaredPaths.includes("docs/PHASE-102-AUTONOMOUS-WORLD-INTERJECTION-OVERLAY.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-interjection-overlay.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_interjection_overlay.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-interjection-overlays"]).includes("overlay-record"));

  console.log("  OK Phase 102 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 102 - Autonomous World Interjection Overlay");
console.log("==========================================================\n");

testDeterministicOverlayReceipt();
testInterjectionChangesOverlayNotWorldIdentity();
testTargetPathChangesOverlayReceipt();
testBranchSnapshotProjectionOnly();
testBrowserAndRendererOverlayProjection();
testReceiptPanelRemainsVisible();
testDoctrineAndSelfMap();

console.log("\n==========================================================");
console.log("ALL PHASE 102 AUTONOMOUS WORLD INTERJECTION OVERLAY TESTS PASSED");
