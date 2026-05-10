const assert = require("assert");
const fs = require("fs");
const path = require("path");

const autonomousWorldBuilder = require("../workbench/src/autonomous_world_builder.js");
const autonomousWorldInterjectionOverlay = require("../workbench/src/autonomous_world_interjection_overlay.js");
const autonomousWorldOverlayAdmission = require("../workbench/src/autonomous_world_overlay_admission.js");
const autonomousWorldVersionHistory = require("../workbench/src/autonomous_world_version_history.js");
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

function overlayInput(id, body) {
  return {
    overlay_id: id,
    target_path: "world.autonomous-fixture/objects/trailer.001",
    kind: "annotation",
    body: body,
    modality: "projection.interjection",
    observer: "observer.local",
    branch: "branch.history"
  };
}

function admitOverlay(base, overlay) {
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(base, overlay);
  return autonomousWorldOverlayAdmission.admitCandidate(base, candidate);
}

function testDeterministicHistoryEdge() {
  console.log("Testing deterministic history edge receipts");

  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(base, overlayInput("overlay.history.001", "history note"));
  const admitted = admitOverlay(base, overlay);
  const first = autonomousWorldVersionHistory.createHistoryEdge(admitted);
  const second = autonomousWorldVersionHistory.createHistoryEdge(admitted);

  assert.strictEqual(first.from_identity_receipt, base.admission.identity_receipt);
  assert.strictEqual(first.to_identity_receipt, admitted.admission.identity_receipt);
  assert.strictEqual(first.overlay_receipt, overlay.overlay_receipt);
  assert.strictEqual(first.candidate_edit_receipt, admitted.candidate.candidate_edit_receipt);
  assert.strictEqual(first.admission_decision_receipt, admitted.report.admission_decision_receipt);
  assert.strictEqual(first.history_edge_receipt, second.history_edge_receipt);
  assert.strictEqual(first.authority, false);

  console.log("  OK same admission report produces stable history edge receipt\n");
}

function testHistoryGraphPreservesIdentities() {
  console.log("Testing history graph preserves old and new identities");

  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const admitted = admitOverlay(
    base,
    autonomousWorldInterjectionOverlay.createOverlay(base, overlayInput("overlay.history.002", "identity note"))
  );
  const root = {
    admission: base.admission,
    triangulation: base.triangulation,
    report: base.report
  };
  const created = autonomousWorldVersionHistory.createHistoryGraph(root);
  const added = autonomousWorldVersionHistory.addAdmission(created, admitted);

  assert.strictEqual(added.graph.root_identity_receipt, base.admission.identity_receipt);
  assert.ok(added.graph.snapshots[String(base.admission.identity_receipt)]);
  assert.ok(added.graph.snapshots[String(admitted.admission.identity_receipt)]);
  assert.strictEqual(added.graph.edges.length, 1);
  assert.strictEqual(added.edge.from_identity_receipt, base.admission.identity_receipt);
  assert.strictEqual(added.edge.to_identity_receipt, admitted.admission.identity_receipt);
  assert.strictEqual(added.graph.authority, false);

  console.log("  OK graph indexes old and new admitted snapshots by identity\n");
}

function testBranchingAllowed() {
  console.log("Testing branching from the same old identity");

  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const first = admitOverlay(
    base,
    autonomousWorldInterjectionOverlay.createOverlay(base, overlayInput("overlay.history.branch.a", "branch A"))
  );
  const second = admitOverlay(
    base,
    autonomousWorldInterjectionOverlay.createOverlay(base, overlayInput("overlay.history.branch.b", "branch B"))
  );
  let graph = autonomousWorldVersionHistory.createHistoryGraph({
    admission: base.admission,
    triangulation: base.triangulation,
    report: base.report
  });
  graph = autonomousWorldVersionHistory.addAdmission(graph, first).graph;
  graph = autonomousWorldVersionHistory.addAdmission(graph, second).graph;
  const outgoing = autonomousWorldVersionHistory.outgoingEdges(graph, base.admission.identity_receipt);

  assert.strictEqual(outgoing.length, 2);
  assert.notStrictEqual(outgoing[0].history_edge_receipt, outgoing[1].history_edge_receipt);
  assert.ok(outgoing.every((edge) => edge.from_identity_receipt === base.admission.identity_receipt));

  console.log("  OK multiple admitted edges may branch from the same old identity\n");
}

function testInvalidEdgesReject() {
  console.log("Testing invalid history edges reject");

  assert.throws(() => {
    autonomousWorldVersionHistory.createHistoryEdge({
      decision: "admit",
      original_world_identity_receipt: 1,
      overlay_receipt: 2,
      candidate_edit_receipt: 3,
      new_world_identity_receipt: 4
    });
  }, /missing-history-receipt:admission_decision_receipt/);
  assert.throws(() => {
    autonomousWorldVersionHistory.createHistoryEdge({
      decision: "admit",
      original_world_identity_receipt: 1,
      candidate_edit_receipt: 3,
      admission_decision_receipt: 4,
      new_world_identity_receipt: 5
    });
  }, /missing-history-receipt:overlay_receipt/);

  console.log("  OK missing overlay candidate or decision receipts reject\n");
}

function testReplayLatestIdentity() {
  console.log("Testing version graph replay reconstructs latest identity");

  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const first = admitOverlay(
    base,
    autonomousWorldInterjectionOverlay.createOverlay(base, overlayInput("overlay.history.replay.a", "replay A"))
  );
  const second = admitOverlay(
    first,
    autonomousWorldInterjectionOverlay.createOverlay(first, {
      overlay_id: "overlay.history.replay.b",
      target_path: "world.autonomous-fixture/admitted-overlays/candidate.overlay.history.replay.a",
      kind: "annotation",
      body: "replay B",
      modality: "projection.interjection",
      observer: "observer.local",
      branch: "branch.history"
    })
  );
  let graph = autonomousWorldVersionHistory.createHistoryGraph({
    admission: base.admission,
    triangulation: base.triangulation,
    report: base.report
  });
  graph = autonomousWorldVersionHistory.addAdmission(graph, first).graph;
  graph = autonomousWorldVersionHistory.addAdmission(graph, second).graph;
  const replay = autonomousWorldVersionHistory.replayLatest(graph, base.admission.identity_receipt);

  assert.strictEqual(replay.latest_identity_receipt, second.admission.identity_receipt);
  assert.strictEqual(replay.path.length, 2);
  assert.strictEqual(replay.authority, false);
  assert.ok(replay.replay_receipt);

  console.log("  OK replay follows admitted edges to the latest identity\n");
}

function testOpenAndRenderByIdentity() {
  console.log("Testing browser and renderer open any admitted snapshot by identity");

  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const admitted = admitOverlay(
    base,
    autonomousWorldInterjectionOverlay.createOverlay(base, overlayInput("overlay.history.open", "open note"))
  );
  let graph = autonomousWorldVersionHistory.createHistoryGraph({
    admission: base.admission,
    triangulation: base.triangulation,
    report: base.report
  });
  graph = autonomousWorldVersionHistory.addAdmission(graph, admitted).graph;
  const browser = autonomousWorldVersionHistory.openSnapshot(graph, admitted.admission.identity_receipt);
  const renderer = autonomousWorldVersionHistory.renderSnapshot(graph, admitted.admission.identity_receipt);

  assert.strictEqual(browser.identity_receipt, admitted.admission.identity_receipt);
  assert.strictEqual(renderer.identity_receipt, admitted.admission.identity_receipt);
  assert.ok(renderer.render_receipt);

  console.log("  OK browser and renderer project admitted versions by identity\n");
}

function testSnapshotReceiptsVisible() {
  console.log("Testing package closure and raw-binary receipts remain visible per snapshot");

  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const admitted = admitOverlay(
    base,
    autonomousWorldInterjectionOverlay.createOverlay(base, overlayInput("overlay.history.receipts", "receipt note"))
  );
  let graph = autonomousWorldVersionHistory.createHistoryGraph({
    admission: base.admission,
    triangulation: base.triangulation,
    report: base.report
  });
  graph = autonomousWorldVersionHistory.addAdmission(graph, admitted).graph;
  const receipts = autonomousWorldVersionHistory.receiptPanel(graph, admitted.admission.identity_receipt);

  assert.strictEqual(receipts.identity_receipt, admitted.admission.identity_receipt);
  assert.strictEqual(receipts.package.manifest_receipt, admitted.report.package.manifest_receipt);
  assert.strictEqual(receipts.raw_binary.identity_receipt, admitted.report.raw_binary.identity_receipt);
  assert.strictEqual(receipts.closure.character_identity_receipt, admitted.report.closure.character_identity_receipt);
  assert.strictEqual(receipts.history.edge_receipts.length, 1);
  assert.strictEqual(receipts.authority, false);

  console.log("  OK snapshot package closure raw-binary and history receipts stay visible\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 104 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-version-history-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(selfMap.declaration["world-version-history-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-version-history-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.version-history-court");
  assert.strictEqual(parsedA.declaration.rule["history-graph-is-world-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["history-edge-is-admitted-world-state"], false);
  assert.strictEqual(parsedA.declaration.rule["branching-from-same-old-identity-allowed"], true);
  assert.strictEqual(parsedA.declaration.rule["invalid-edge-missing-admission-receipts-rejects"], true);
  assert.ok(String(guards.get("memory-without-present-mutation")).includes("world memory"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-version-history-court" &&
    triplet.predicate === "section" &&
    triplet.object === "history-workflow"
  )));
  assert.ok(courts.map(recordId).includes("autonomous-world-version-history-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-104-AUTONOMOUS-WORLD-VERSION-HISTORY-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-version-history-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_version_history.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-version-history-courts"]).includes("history-edge"));

  console.log("  OK Phase 104 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 104 - Autonomous World Version History Court");
console.log("===========================================================\n");

testDeterministicHistoryEdge();
testHistoryGraphPreservesIdentities();
testBranchingAllowed();
testInvalidEdgesReject();
testReplayLatestIdentity();
testOpenAndRenderByIdentity();
testSnapshotReceiptsVisible();
testDoctrineAndSelfMap();

console.log("\n===========================================================");
console.log("ALL PHASE 104 AUTONOMOUS WORLD VERSION HISTORY TESTS PASSED");
