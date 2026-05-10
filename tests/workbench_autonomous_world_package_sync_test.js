const assert = require("assert");
const fs = require("fs");
const path = require("path");

const autonomousWorldBuilder = require("../workbench/src/autonomous_world_builder.js");
const autonomousWorldInterjectionOverlay = require("../workbench/src/autonomous_world_interjection_overlay.js");
const autonomousWorldOverlayAdmission = require("../workbench/src/autonomous_world_overlay_admission.js");
const autonomousWorldVersionHistory = require("../workbench/src/autonomous_world_version_history.js");
const autonomousWorldMergeReconciliation = require("../workbench/src/autonomous_world_merge_reconciliation.js");
const autonomousWorldPackageSync = require("../workbench/src/autonomous_world_package_sync.js");
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function overlayInput(id, targetPath, body) {
  return {
    overlay_id: id,
    target_path: targetPath,
    kind: "annotation",
    body: body,
    modality: "projection.interjection",
    observer: "observer.local",
    branch: "branch.sync"
  };
}

function admitOverlay(base, overlayInputValue) {
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(base, overlayInputValue);
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(base, overlay);
  return autonomousWorldOverlayAdmission.admitCandidate(base, candidate);
}

function buildSyncFixture() {
  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const left = admitOverlay(
    base,
    overlayInput("overlay.sync.left", "world.autonomous-fixture/objects/trailer.001", "sync left")
  );
  const right = admitOverlay(
    base,
    overlayInput("overlay.sync.right", "world.autonomous-fixture/interactions/hitch-link.001", "sync right")
  );
  const mergeCandidate = autonomousWorldMergeReconciliation.createMergeCandidate(base, left, right);
  const merged = autonomousWorldMergeReconciliation.admitMerge(base, left, right, mergeCandidate);
  let graph = autonomousWorldVersionHistory.createHistoryGraph({
    admission: base.admission,
    triangulation: base.triangulation,
    report: base.report
  });
  graph = autonomousWorldVersionHistory.addAdmission(graph, left).graph;
  graph = autonomousWorldVersionHistory.addAdmission(graph, right).graph;
  graph = autonomousWorldMergeReconciliation.linkMergedHistory(graph, merged).graph;
  return { base, left, right, merged, graph };
}

function testDeterministicPackageReceipt() {
  console.log("Testing deterministic autonomous world sync package receipt");

  const fixture = buildSyncFixture();
  const first = autonomousWorldPackageSync.exportSyncPackage(fixture.graph, {
    sender: "local.fixture"
  });
  const second = autonomousWorldPackageSync.exportSyncPackage(fixture.graph, {
    sender: "local.fixture"
  });

  assert.strictEqual(first.kind, "omi.autonomous-world.sync-package");
  assert.strictEqual(first.package_receipt, second.package_receipt);
  assert.strictEqual(first.source.authority, false);
  assert.strictEqual(first.admission.verified, false);

  console.log("  OK same admitted history produces stable non-authoritative sync package\n");
}

function testPackageCarriesHistoryAndWitnesses() {
  console.log("Testing package carries snapshots, branches, merges, and witnesses");

  const fixture = buildSyncFixture();
  const pkg = autonomousWorldPackageSync.exportSyncPackage(fixture.graph);
  const identities = pkg.snapshots.map((snapshot) => snapshot.identity_receipt);

  assert.strictEqual(pkg.snapshots.length, 4);
  assert.strictEqual(pkg.history_edges.length, 3);
  assert.strictEqual(pkg.branches.length, 1);
  assert.strictEqual(pkg.merge_reports.length, 1);
  assert.ok(identities.includes(fixture.base.admission.identity_receipt));
  assert.ok(identities.includes(fixture.left.admission.identity_receipt));
  assert.ok(identities.includes(fixture.right.admission.identity_receipt));
  assert.ok(identities.includes(fixture.merged.admission.identity_receipt));
  assert.strictEqual(pkg.witnesses.package.length, pkg.snapshots.length);
  assert.strictEqual(pkg.witnesses.closure.length, pkg.snapshots.length);
  assert.strictEqual(pkg.witnesses.raw_binary.length, pkg.snapshots.length);
  pkg.snapshots.forEach((snapshot) => {
    assert.ok(snapshot.witnesses.package.manifest_receipt);
    assert.ok(snapshot.witnesses.closure.character_identity_receipt);
    assert.ok(snapshot.witnesses.raw_binary.index_receipt);
  });

  console.log("  OK sync package carries admitted world history and receipt witnesses\n");
}

function testTamperRejection() {
  console.log("Testing tampered sync packages reject");

  const fixture = buildSyncFixture();
  const pkg = autonomousWorldPackageSync.exportSyncPackage(fixture.graph);
  const snapshotTamper = clone(pkg);
  snapshotTamper.snapshots[0].admission.source += "\n;; tampered";
  const edgeTamper = clone(pkg);
  edgeTamper.history_edges[0].to_identity_receipt = "tampered";
  const witnessTamper = clone(pkg);
  delete witnessTamper.snapshots[0].witnesses.raw_binary.index_receipt;

  assert.throws(() => {
    autonomousWorldPackageSync.verifySyncPackage(snapshotTamper);
  }, /invalid-sync-package-receipt/);
  assert.throws(() => {
    autonomousWorldPackageSync.verifySyncPackage(edgeTamper);
  }, /invalid-sync-package-receipt/);
  assert.throws(() => {
    autonomousWorldPackageSync.verifySyncPackage(witnessTamper);
  }, /invalid-sync-package-receipt/);

  console.log("  OK snapshot, history edge, and witness tampering reject before local admission\n");
}

function testImportVerifiesBeforeAdmission() {
  console.log("Testing import verifies receipts before local admission");

  const fixture = buildSyncFixture();
  const pkg = autonomousWorldPackageSync.exportSyncPackage(fixture.graph);
  const imported = autonomousWorldPackageSync.importSyncPackage(pkg);
  const tampered = clone(pkg);
  tampered.source.sender = "untrusted-peer";

  assert.strictEqual(imported.admission.verified, true);
  assert.strictEqual(imported.admission.sync_package_authority, false);
  assert.strictEqual(imported.admission.sender_authority, false);
  assert.strictEqual(imported.admission.transport_authority, false);
  assert.ok(imported.graph.snapshots[String(fixture.merged.admission.identity_receipt)]);
  assert.throws(() => {
    autonomousWorldPackageSync.importSyncPackage(tampered);
  }, /invalid-sync-package-receipt/);

  console.log("  OK import admits locally only after receipt verification\n");
}

function testImportedSnapshotsProject() {
  console.log("Testing imported admitted snapshots preserve identity and project");

  const fixture = buildSyncFixture();
  const pkg = autonomousWorldPackageSync.exportSyncPackage(fixture.graph);
  const imported = autonomousWorldPackageSync.importSyncPackage(pkg);
  const browser = autonomousWorldPackageSync.openImportedSnapshot(
    imported,
    fixture.merged.admission.identity_receipt
  );
  const renderer = autonomousWorldPackageSync.renderImportedSnapshot(
    imported,
    fixture.merged.admission.identity_receipt,
    { view_mode: "greedy" }
  );

  assert.strictEqual(browser.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.strictEqual(renderer.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.ok(renderer.render_receipt);
  assert.strictEqual(browser.build.report.raw_binary.index_receipt, fixture.merged.report.raw_binary.index_receipt);

  console.log("  OK browser and renderer can project imported verified snapshots\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 106 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-package-sync-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(selfMap.declaration["world-package-sync-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-package-sync-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.package-sync-court");
  assert.strictEqual(parsedA.declaration.rule["sync-package-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["sender-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["transport-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["import-before-verification-is-admission"], false);
  assert.ok(String(guards.get("portable-before-networked")).includes("portable before it makes them networked"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-package-sync-court" &&
    triplet.predicate === "section" &&
    triplet.object === "sync-workflow"
  )));
  assert.ok(courts.map(recordId).includes("autonomous-world-package-sync-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-106-AUTONOMOUS-WORLD-PACKAGE-SYNC-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-package-sync-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_package_sync.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-package-sync-courts"]).includes("history_edges"));

  console.log("  OK Phase 106 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 106 - Autonomous World Package Sync Court");
console.log("========================================================\n");

testDeterministicPackageReceipt();
testPackageCarriesHistoryAndWitnesses();
testTamperRejection();
testImportVerifiesBeforeAdmission();
testImportedSnapshotsProject();
testDoctrineAndSelfMap();

console.log("\n========================================================");
console.log("ALL PHASE 106 AUTONOMOUS WORLD PACKAGE SYNC TESTS PASSED");
