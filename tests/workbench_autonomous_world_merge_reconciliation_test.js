const assert = require("assert");
const fs = require("fs");
const path = require("path");

const autonomousWorldBuilder = require("../workbench/src/autonomous_world_builder.js");
const autonomousWorldInterjectionOverlay = require("../workbench/src/autonomous_world_interjection_overlay.js");
const autonomousWorldOverlayAdmission = require("../workbench/src/autonomous_world_overlay_admission.js");
const autonomousWorldVersionHistory = require("../workbench/src/autonomous_world_version_history.js");
const autonomousWorldMergeReconciliation = require("../workbench/src/autonomous_world_merge_reconciliation.js");
const composerShell = require("../workbench/src/composer_shell.js");
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

function overlayInput(id, targetPath, body) {
  return {
    overlay_id: id,
    target_path: targetPath,
    kind: "annotation",
    body: body,
    modality: "projection.interjection",
    observer: "observer.local",
    branch: "branch.merge"
  };
}

function admitOverlay(base, overlayInputValue) {
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(base, overlayInputValue);
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(base, overlay);
  return autonomousWorldOverlayAdmission.admitCandidate(base, candidate);
}

function branchPair() {
  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const left = admitOverlay(
    base,
    overlayInput("overlay.merge.left", "world.autonomous-fixture/objects/trailer.001", "left branch note")
  );
  const right = admitOverlay(
    base,
    overlayInput("overlay.merge.right", "world.autonomous-fixture/interactions/hitch-link.001", "right branch note")
  );
  return { base, left, right };
}

function conflictPair() {
  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const left = admitOverlay(
    base,
    overlayInput("overlay.merge.conflict.left", "world.autonomous-fixture/objects/trailer.001", "left conflict note")
  );
  const right = admitOverlay(
    base,
    overlayInput("overlay.merge.conflict.right", "world.autonomous-fixture/objects/trailer.001", "right conflict note")
  );
  return { base, left, right };
}

function testDeterministicMergeCandidate() {
  console.log("Testing deterministic merge candidate receipts");

  const { base, left, right } = branchPair();
  const first = autonomousWorldMergeReconciliation.createMergeCandidate(base, left, right);
  const second = autonomousWorldMergeReconciliation.createMergeCandidate(base, left, right);

  assert.strictEqual(first.base_identity_receipt, base.admission.identity_receipt);
  assert.strictEqual(first.left_identity_receipt, left.admission.identity_receipt);
  assert.strictEqual(first.right_identity_receipt, right.admission.identity_receipt);
  assert.strictEqual(first.merge_candidate_receipt, second.merge_candidate_receipt);
  assert.strictEqual(first.authority, false);
  assert.strictEqual(first.admitted_history, false);

  console.log("  OK same base left and right branches produce stable non-authoritative candidate\n");
}

function testNonConflictingCandidate() {
  console.log("Testing non-conflicting branches produce admissible candidate");

  const { base, left, right } = branchPair();
  const candidate = autonomousWorldMergeReconciliation.createMergeCandidate(base, left, right);

  assert.strictEqual(candidate.admissible, true);
  assert.strictEqual(candidate.conflict_count, 0);
  assert.deepStrictEqual(candidate.conflict_receipts, []);

  console.log("  OK distinct branch targets reconcile without conflict records\n");
}

function testConflictingCandidateRecords() {
  console.log("Testing conflicting branches produce deterministic conflict records");

  const { base, left, right } = conflictPair();
  const first = autonomousWorldMergeReconciliation.createMergeCandidate(base, left, right);
  const second = autonomousWorldMergeReconciliation.createMergeCandidate(base, left, right);

  assert.strictEqual(first.admissible, false);
  assert.strictEqual(first.conflict_count, 1);
  assert.strictEqual(first.conflicts[0].authority, false);
  assert.strictEqual(first.conflicts[0].target_path, "world.autonomous-fixture/objects/trailer.001");
  assert.strictEqual(first.conflicts[0].conflict_receipt, second.conflicts[0].conflict_receipt);
  assert.deepStrictEqual(first.conflict_receipts, second.conflict_receipts);

  console.log("  OK shared divergent target emits stable non-authoritative conflict record\n");
}

function testRejectPreservesBranches() {
  console.log("Testing rejected merge preserves both branch identities");

  const { base, left, right } = conflictPair();
  const candidate = autonomousWorldMergeReconciliation.createMergeCandidate(base, left, right);
  const rejected = autonomousWorldMergeReconciliation.rejectMerge(base, left, right, candidate, "conflict-review");

  assert.strictEqual(rejected.admitted, false);
  assert.strictEqual(rejected.left_identity_receipt, left.admission.identity_receipt);
  assert.strictEqual(rejected.right_identity_receipt, right.admission.identity_receipt);
  assert.strictEqual(rejected.report.new_world_identity_receipt, null);
  assert.strictEqual(rejected.report.mutation, false);
  assert.strictEqual(rejected.report.merge_candidate_receipt, candidate.merge_candidate_receipt);
  assert.deepStrictEqual(rejected.report.conflict_receipts, candidate.conflict_receipts);

  console.log("  OK rejection reports the candidate without mutating admitted branches\n");
}

function testAdmitMergeEmitsSnapshot() {
  console.log("Testing admitted merge emits new world snapshot");

  const { base, left, right } = branchPair();
  const candidate = autonomousWorldMergeReconciliation.createMergeCandidate(base, left, right);
  const merged = autonomousWorldMergeReconciliation.admitMerge(base, left, right, candidate);

  assert.strictEqual(merged.admission.base_identity_receipt, base.admission.identity_receipt);
  assert.strictEqual(merged.admission.left_identity_receipt, left.admission.identity_receipt);
  assert.strictEqual(merged.admission.right_identity_receipt, right.admission.identity_receipt);
  assert.notStrictEqual(merged.admission.identity_receipt, left.admission.identity_receipt);
  assert.notStrictEqual(merged.admission.identity_receipt, right.admission.identity_receipt);
  assert.strictEqual(merged.report.new_world_identity_receipt, merged.admission.identity_receipt);
  assert.strictEqual(merged.report.merged_world_identity_receipt, merged.admission.identity_receipt);
  assert.strictEqual(merged.report.merge_candidate_receipt, candidate.merge_candidate_receipt);
  assert.ok(merged.report.admission_decision_receipt);
  assert.ok(merged.admission.source.includes("admitted-merges"));
  assert.ok(merged.admission.document.groups.some((group) => group.id === "admitted-merges"));

  console.log("  OK admission creates a merged declaration snapshot with base left and right references\n");
}

function testHistoryLinksMergedIdentity() {
  console.log("Testing history graph links merged identity after admission");

  const { base, left, right } = branchPair();
  const merged = autonomousWorldMergeReconciliation.admitMerge(
    base,
    left,
    right,
    autonomousWorldMergeReconciliation.createMergeCandidate(base, left, right)
  );
  let graph = autonomousWorldVersionHistory.createHistoryGraph({
    admission: base.admission,
    triangulation: base.triangulation,
    report: base.report
  });
  graph = autonomousWorldVersionHistory.addAdmission(graph, left).graph;
  graph = autonomousWorldVersionHistory.addAdmission(graph, right).graph;
  const linked = autonomousWorldMergeReconciliation.linkMergedHistory(graph, merged);

  assert.strictEqual(linked.edge.from_identity_receipt, base.admission.identity_receipt);
  assert.strictEqual(linked.edge.to_identity_receipt, merged.admission.identity_receipt);
  assert.strictEqual(linked.edge.candidate_edit_receipt, merged.report.merge_candidate_receipt);
  assert.ok(linked.graph.snapshots[String(merged.admission.identity_receipt)]);
  assert.strictEqual(linked.graph.authority, false);

  console.log("  OK merged identities are indexed only after admission\n");
}

function testBrowserRendererAndWitnesses() {
  console.log("Testing browser renderer package closure and raw-binary witnesses for merged snapshot");

  const { base, left, right } = branchPair();
  const merged = autonomousWorldMergeReconciliation.admitMerge(
    base,
    left,
    right,
    autonomousWorldMergeReconciliation.createMergeCandidate(base, left, right)
  );
  const browser = autonomousWorldMergeReconciliation.openMerged(merged);
  const renderer = autonomousWorldMergeReconciliation.renderMerged(merged, { view_mode: "greedy" });
  const imported = composerShell.importPackage(merged.package);

  assert.strictEqual(browser.identity_receipt, merged.admission.identity_receipt);
  assert.strictEqual(renderer.identity_receipt, merged.admission.identity_receipt);
  assert.ok(renderer.render_receipt);
  assert.strictEqual(imported.manifest.manifest_receipt, merged.package.manifest.manifest_receipt);
  assert.strictEqual(merged.report.package.manifest_receipt, merged.package.manifest.manifest_receipt);
  assert.strictEqual(merged.report.raw_binary.identity_receipt, merged.raw_binary.identity_receipt);
  assert.strictEqual(merged.report.raw_binary.index_receipt, merged.raw_binary.index_receipt);
  assert.strictEqual(merged.report.closure.character_identity_receipt, merged.closure.character.identity_receipt);
  assert.strictEqual(merged.report.closure.binary64_identity_receipt, merged.closure.binary64.identity_receipt);
  assert.notStrictEqual(merged.report.raw_binary.identity_receipt, left.report.raw_binary.identity_receipt);

  console.log("  OK merged snapshot is projectable and regenerates package closure raw-binary witnesses\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 105 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-merge-reconciliation-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(selfMap.declaration["world-merge-reconciliation-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-merge-reconciliation-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.merge-reconciliation-court");
  assert.strictEqual(parsedA.declaration.rule["merge-candidate-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["conflict-record-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["rejected-merge-mutates-branches"], false);
  assert.strictEqual(parsedA.declaration.rule["admitted-merge-emits-new-world-snapshot"], true);
  assert.ok(String(guards.get("histories-meet")).includes("histories meet"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-merge-reconciliation-court" &&
    triplet.predicate === "section" &&
    triplet.object === "merge-workflow"
  )));
  assert.ok(courts.map(recordId).includes("autonomous-world-merge-reconciliation-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-105-AUTONOMOUS-WORLD-MERGE-RECONCILIATION-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-merge-reconciliation-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_merge_reconciliation.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-merge-reconciliation-courts"]).includes("conflict_receipts"));

  console.log("  OK Phase 105 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 105 - Autonomous World Merge / Reconciliation Court");
console.log("================================================================\n");

testDeterministicMergeCandidate();
testNonConflictingCandidate();
testConflictingCandidateRecords();
testRejectPreservesBranches();
testAdmitMergeEmitsSnapshot();
testHistoryLinksMergedIdentity();
testBrowserRendererAndWitnesses();
testDoctrineAndSelfMap();

console.log("\n================================================================");
console.log("ALL PHASE 105 AUTONOMOUS WORLD MERGE RECONCILIATION TESTS PASSED");
