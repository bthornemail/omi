const assert = require("assert");
const fs = require("fs");
const path = require("path");

const autonomousWorldBuilder = require("../workbench/src/autonomous_world_builder.js");
const autonomousWorldBrowser = require("../workbench/src/autonomous_world_browser.js");
const autonomousWorldLiveRenderer = require("../workbench/src/autonomous_world_live_renderer.js");
const autonomousWorldInterjectionOverlay = require("../workbench/src/autonomous_world_interjection_overlay.js");
const autonomousWorldOverlayAdmission = require("../workbench/src/autonomous_world_overlay_admission.js");
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

function overlayInput(overrides) {
  return Object.assign({
    overlay_id: "overlay.admission.example",
    target_path: "world.autonomous-fixture/objects/trailer.001",
    kind: "annotation",
    body: "admit observer note",
    modality: "projection.interjection",
    observer: "observer.local",
    branch: "branch.admission"
  }, overrides || {});
}

function testDeterministicCandidateReceipt() {
  console.log("Testing deterministic candidate edit receipts");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(built, overlayInput());
  const first = autonomousWorldOverlayAdmission.createCandidateEdit(built, overlay);
  const second = autonomousWorldOverlayAdmission.createCandidateEdit(built, overlay);

  assert.strictEqual(first.original_world_identity_receipt, built.admission.identity_receipt);
  assert.strictEqual(first.candidate_edit_receipt, second.candidate_edit_receipt);
  assert.strictEqual(first.overlay.overlay_receipt, overlay.overlay_receipt);
  assert.strictEqual(first.authority, false);
  assert.strictEqual(first.admitted_history, false);

  console.log("  OK same overlay and world produce stable non-authoritative candidate receipt\n");
}

function testRejectKeepsWorldIdentityStable() {
  console.log("Testing rejected candidate keeps world identity stable");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(built, overlayInput());
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(built, overlay);
  const rejected = autonomousWorldOverlayAdmission.rejectCandidate(built, candidate, "fixture-reject");

  assert.strictEqual(rejected.admitted, false);
  assert.strictEqual(rejected.world_identity_receipt, built.admission.identity_receipt);
  assert.strictEqual(rejected.report.original_world_identity_receipt, built.admission.identity_receipt);
  assert.strictEqual(rejected.report.overlay_receipt, overlay.overlay_receipt);
  assert.strictEqual(rejected.report.candidate_edit_receipt, candidate.candidate_edit_receipt);
  assert.strictEqual(rejected.report.new_world_identity_receipt, null);
  assert.strictEqual(rejected.report.mutation, false);

  console.log("  OK rejection emits decision receipt without mutating world identity\n");
}

function testAdmitEmitsNewWorldSnapshot() {
  console.log("Testing admitted candidate emits new world snapshot");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(built, overlayInput());
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(built, overlay);
  const admitted = autonomousWorldOverlayAdmission.admitCandidate(built, candidate);

  assert.strictEqual(admitted.admission.original_world_identity_receipt, built.admission.identity_receipt);
  assert.notStrictEqual(admitted.admission.identity_receipt, built.admission.identity_receipt);
  assert.strictEqual(admitted.report.old_world_identity_receipt, built.admission.identity_receipt);
  assert.strictEqual(admitted.report.new_world_identity_receipt, admitted.admission.identity_receipt);
  assert.strictEqual(admitted.report.overlay_receipt, overlay.overlay_receipt);
  assert.strictEqual(admitted.report.candidate_edit_receipt, candidate.candidate_edit_receipt);
  assert.ok(admitted.report.admission_decision_receipt);
  assert.ok(admitted.admission.source.includes("admitted-overlays"));
  assert.ok(admitted.admission.document.groups.some((group) => group.id === "admitted-overlays"));

  console.log("  OK admission creates a new declaration snapshot and preserves old identity reference\n");
}

function testBrowserAndRendererOpenNewSnapshot() {
  console.log("Testing browser and renderer open admitted snapshot");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const admitted = autonomousWorldOverlayAdmission.admitCandidate(
    built,
    autonomousWorldOverlayAdmission.createCandidateEdit(built, overlayInput())
  );
  const browser = autonomousWorldOverlayAdmission.openAdmitted(admitted);
  const renderer = autonomousWorldOverlayAdmission.renderAdmitted(admitted, {
    view_mode: "greedy"
  });
  const directBrowser = autonomousWorldBrowser.openWorld({
    admission: admitted.admission,
    triangulation: admitted.triangulation,
    report: admitted.report
  });
  const directRenderer = autonomousWorldLiveRenderer.createRenderPlan(directBrowser);

  assert.strictEqual(browser.identity_receipt, admitted.admission.identity_receipt);
  assert.strictEqual(renderer.identity_receipt, admitted.admission.identity_receipt);
  assert.strictEqual(directBrowser.identity_receipt, admitted.admission.identity_receipt);
  assert.strictEqual(directRenderer.identity_receipt, admitted.admission.identity_receipt);
  assert.ok(renderer.render_receipt);

  console.log("  OK browser and renderer project the new admitted snapshot\n");
}

function testRegeneratedWitnessesValidate() {
  console.log("Testing package closure and raw-binary witnesses regenerate");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const admitted = autonomousWorldOverlayAdmission.admitCandidate(
    built,
    autonomousWorldOverlayAdmission.createCandidateEdit(built, overlayInput())
  );
  const imported = composerShell.importPackage(admitted.package);

  assert.strictEqual(imported.manifest.manifest_receipt, admitted.package.manifest.manifest_receipt);
  assert.strictEqual(admitted.report.package.manifest_receipt, admitted.package.manifest.manifest_receipt);
  assert.strictEqual(admitted.report.package.imported_manifest_receipt, imported.manifest.manifest_receipt);
  assert.strictEqual(admitted.report.raw_binary.identity_receipt, admitted.raw_binary.identity_receipt);
  assert.strictEqual(admitted.report.raw_binary.index_receipt, admitted.raw_binary.index_receipt);
  assert.strictEqual(admitted.report.closure.character_identity_receipt, admitted.closure.character.identity_receipt);
  assert.strictEqual(admitted.report.closure.binary64_identity_receipt, admitted.closure.binary64.identity_receipt);
  assert.notStrictEqual(admitted.report.raw_binary.identity_receipt, built.report.raw_binary.identity_receipt);
  assert.notStrictEqual(admitted.report.closure.character_identity_receipt, built.report.closure.character_identity_receipt);

  console.log("  OK package export/import raw-binary and closure witnesses regenerate\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 103 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-overlay-admission-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(selfMap.declaration["world-overlay-admission-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-overlay-admission-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.overlay-admission-court");
  assert.strictEqual(parsedA.declaration.rule["overlay-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["candidate-edit-is-admitted-history"], false);
  assert.strictEqual(parsedA.declaration.rule["rejected-candidate-mutates-world-identity"], false);
  assert.strictEqual(parsedA.declaration.rule["admitted-candidate-emits-new-world-snapshot"], true);
  assert.ok(String(guards.get("accountable-mutation")).includes("accountable mutation"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-overlay-admission-court" &&
    triplet.predicate === "section" &&
    triplet.object === "admission-workflow"
  )));
  assert.ok(courts.map(recordId).includes("autonomous-world-overlay-admission-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-103-AUTONOMOUS-WORLD-OVERLAY-ADMISSION-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-overlay-admission-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_overlay_admission.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-overlay-admission-courts"]).includes("candidate-edit"));

  console.log("  OK Phase 103 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 103 - Autonomous World Overlay Admission Court");
console.log("============================================================\n");

testDeterministicCandidateReceipt();
testRejectKeepsWorldIdentityStable();
testAdmitEmitsNewWorldSnapshot();
testBrowserAndRendererOpenNewSnapshot();
testRegeneratedWitnessesValidate();
testDoctrineAndSelfMap();

console.log("\n============================================================");
console.log("ALL PHASE 103 AUTONOMOUS WORLD OVERLAY ADMISSION TESTS PASSED");
