const assert = require("assert");
const fs = require("fs");
const path = require("path");

const autonomousWorldBuilder = require("../workbench/src/autonomous_world_builder.js");
const autonomousWorldBrowser = require("../workbench/src/autonomous_world_browser.js");
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

function testOpenAndNavigate() {
  console.log("Testing admitted world open and navigation");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const browser = autonomousWorldBrowser.openWorld(built);
  const objects = autonomousWorldBrowser.listObjects(browser);
  const relations = autonomousWorldBrowser.listRelations(browser);

  assert.strictEqual(browser.document.id, "world.autonomous-fixture");
  assert.strictEqual(browser.identity_receipt, built.admission.identity_receipt);
  assert.strictEqual(objects.length, 3);
  assert.strictEqual(relations.length, 3);
  assert.ok(objects.some((object) => object.id === "trailer.001" && object.authority === false));
  assert.ok(relations.some((relation) => relation.id === "hitch-link.001" && relation.relation === "coupled-traction"));

  console.log("  OK admitted world opens with navigable object and relation lists\n");
}

function testInspectors() {
  console.log("Testing object and relation inspector paths");

  const browser = autonomousWorldBrowser.openWorld(autonomousWorldBuilder.buildAutonomousWorld());
  const object = autonomousWorldBrowser.inspectPath(browser, "world.autonomous-fixture/objects/trailer.001");
  const relation = autonomousWorldBrowser.inspectPath(browser, "world.autonomous-fixture/interactions/hitch-link.001");

  assert.strictEqual(object.plane, "RS");
  assert.strictEqual(object.rs, "trailer.001");
  assert.strictEqual(object.identity_receipt, browser.identity_receipt);
  assert.strictEqual(object.authority, false);
  assert.strictEqual(relation.plane, "RS");
  assert.strictEqual(relation.rs, "hitch-link.001");
  assert.strictEqual(relation.identity_receipt, browser.identity_receipt);
  assert.strictEqual(relation.authority, false);

  console.log("  OK inspector resolves object and relation paths as projections\n");
}

function testViewModesDoNotMutateIdentity() {
  console.log("Testing browser view modes preserve admitted identity");

  const browser = autonomousWorldBrowser.openWorld(autonomousWorldBuilder.buildAutonomousWorld());
  const before = browser.identity_receipt;
  const lazy = autonomousWorldBrowser.setViewMode(browser, "lazy");
  const greedy = autonomousWorldBrowser.setViewMode(browser, "greedy");
  const staticView = autonomousWorldBrowser.setViewMode(browser, "static");
  const animated = autonomousWorldBrowser.setViewMode(browser, "animated");

  assert.strictEqual(browser.identity_receipt, before);
  assert.strictEqual(lazy.identity_receipt, before);
  assert.strictEqual(greedy.identity_receipt, before);
  assert.strictEqual(staticView.identity_receipt, before);
  assert.strictEqual(animated.identity_receipt, before);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);
  assert.strictEqual(lazy.authority, false);
  assert.strictEqual(animated.authority, false);

  console.log("  OK lazy/greedy/static/animated views change view receipts only\n");
}

function testSpomAndReceiptPanel() {
  console.log("Testing S-P-O-M browser and receipt panel");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const browser = autonomousWorldBrowser.openWorld(built);
  const spom = autonomousWorldBrowser.browseSpom(browser, 8);
  const receipts = autonomousWorldBrowser.receiptPanel(browser);
  const summary = autonomousWorldBrowser.smokeSummary(browser);

  assert.strictEqual(spom.identity_receipt, browser.identity_receipt);
  assert.ok(spom.triplets.length > 0);
  assert.ok(browser.triangulation.triplets.some((triplet) => (
    triplet.subject === "trailer.001" &&
    triplet.predicate === "model" &&
    triplet.object === "model.trailer.wike-ebike-cargo"
  )));
  assert.strictEqual(receipts.identity_receipt, browser.identity_receipt);
  assert.strictEqual(receipts.package.manifest_receipt, built.report.package.manifest_receipt);
  assert.strictEqual(receipts.raw_binary.identity_receipt, built.report.raw_binary.identity_receipt);
  assert.strictEqual(receipts.closure.character_identity_receipt, built.report.closure.character_identity_receipt);
  assert.strictEqual(summary.object_count, 3);
  assert.strictEqual(summary.relation_count, 3);
  assert.strictEqual(summary.authority, false);

  console.log("  OK S-P-O-M and package/closure/raw-binary receipts remain visible\n");
}

function testChangedSnapshotChangesIdentity() {
  console.log("Testing changed admitted world snapshot changes browser identity");

  const first = autonomousWorldBrowser.openWorld(autonomousWorldBuilder.buildAutonomousWorld());
  const changed = autonomousWorldBrowser.openWorld(autonomousWorldBuilder.buildAutonomousWorld({
    seed: "world.autonomous-fixture.changed"
  }));

  assert.notStrictEqual(first.identity_receipt, changed.identity_receipt);
  assert.notStrictEqual(first.document.id, changed.document.id);

  console.log("  OK changed admitted world snapshot changes identity\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 100 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-browser-smoke-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const browsers = asArray(selfMap.declaration["world-browser-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-browser-smoke-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.browser-smoke-court");
  assert.strictEqual(parsedA.declaration.rule["browser-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["traversal-is-mutation"], false);
  assert.strictEqual(parsedA.declaration.rule["view-mode-is-identity"], false);
  assert.ok(String(guards.get("projection-navigator")).includes("projection navigator"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-browser-smoke-court" &&
    triplet.predicate === "section" &&
    triplet.object === "browser-workflow"
  )));
  assert.ok(browsers.map(recordId).includes("autonomous-world-browser-smoke-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-100-AUTONOMOUS-WORLD-UX-BROWSER-SMOKE-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-browser-smoke-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_browser.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-browser-courts"]).includes("object-list"));

  console.log("  OK Phase 100 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 100 - Autonomous World UX / Browser Smoke Court");
console.log("==============================================================\n");

testOpenAndNavigate();
testInspectors();
testViewModesDoNotMutateIdentity();
testSpomAndReceiptPanel();
testChangedSnapshotChangesIdentity();
testDoctrineAndSelfMap();

console.log("\n==============================================================");
console.log("ALL PHASE 100 AUTONOMOUS WORLD BROWSER SMOKE TESTS PASSED");
