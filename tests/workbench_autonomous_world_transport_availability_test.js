const assert = require("assert");
const fs = require("fs");
const path = require("path");

const autonomousWorldBuilder = require("../workbench/src/autonomous_world_builder.js");
const autonomousWorldInterjectionOverlay = require("../workbench/src/autonomous_world_interjection_overlay.js");
const autonomousWorldOverlayAdmission = require("../workbench/src/autonomous_world_overlay_admission.js");
const autonomousWorldVersionHistory = require("../workbench/src/autonomous_world_version_history.js");
const autonomousWorldMergeReconciliation = require("../workbench/src/autonomous_world_merge_reconciliation.js");
const autonomousWorldPackageSync = require("../workbench/src/autonomous_world_package_sync.js");
const autonomousWorldPeerExchange = require("../workbench/src/autonomous_world_peer_exchange.js");
const autonomousWorldSubscriptionCourt = require("../workbench/src/autonomous_world_subscription_court.js");
const autonomousWorldLiveTransportAdapter = require("../workbench/src/autonomous_world_live_transport_adapter.js");
const autonomousWorldTransportReplay = require("../workbench/src/autonomous_world_transport_replay.js");
const autonomousWorldTransportCheckpoint = require("../workbench/src/autonomous_world_transport_checkpoint.js");
const autonomousWorldTransportCompaction = require("../workbench/src/autonomous_world_transport_compaction.js");
const autonomousWorldTransportRepair = require("../workbench/src/autonomous_world_transport_repair.js");
const autonomousWorldTransportAvailability = require("../workbench/src/autonomous_world_transport_availability.js");
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
    branch: "branch.availability"
  };
}

function admitOverlay(base, overlayInputValue) {
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(base, overlayInputValue);
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(base, overlay);
  return autonomousWorldOverlayAdmission.admitCandidate(base, candidate);
}

function buildAvailabilityFixture() {
  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const left = admitOverlay(
    base,
    overlayInput("overlay.availability.left", "world.autonomous-fixture/objects/trailer.001", "availability left")
  );
  const right = admitOverlay(
    base,
    overlayInput("overlay.availability.right", "world.autonomous-fixture/interactions/hitch-link.001", "availability right")
  );
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
  graph = autonomousWorldMergeReconciliation.linkMergedHistory(graph, merged).graph;
  const pkg = autonomousWorldPackageSync.exportSyncPackage(graph, {
    sender: "peer.fixture.alice",
    transport: "transport.availability.fixture"
  });
  const peer = autonomousWorldPeerExchange.declarePeer({
    peer_id: "peer.fixture.alice",
    label: "Alice Fixture Peer",
    endpoint: "declared.protocol-only",
    capabilities: ["world.sync.offer"]
  });
  const registry = autonomousWorldPeerExchange.createPeerRegistry([peer]);
  const offer = autonomousWorldPeerExchange.offerPackage(peer, pkg, {
    transport: "transport.availability.fixture"
  });
  const subscription = autonomousWorldSubscriptionCourt.declareSubscription({
    subscription_id: "sub.fixture.transport-availability",
    filters: {
      peer_id: "peer.fixture.alice",
      world_id: "world.autonomous-fixture",
      history_mode: "admitted-only"
    }
  });
  const filePlan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.availability.file-drop",
    adapter: "file-drop",
    endpoint: "file:///tmp/omi-availability-offers"
  });
  const fifoPlan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.availability.fifo",
    adapter: "fifo",
    endpoint: "/run/omi/availability-offers.fifo"
  });
  const eventA = autonomousWorldLiveTransportAdapter.createTransportEvent(filePlan, offer, pkg);
  const eventB = autonomousWorldLiveTransportAdapter.createTransportEvent(fifoPlan, offer, pkg);
  const log = autonomousWorldTransportReplay.createTransportReplayLog({
    log_id: "transport.availability.fixture",
    events: [eventA, eventB]
  });
  const replay = autonomousWorldTransportReplay.replayTransportLog(registry, log, subscription);
  const checkpoint = autonomousWorldTransportCheckpoint.createTransportCheckpoint(log, replay, {
    checkpoint_id: "checkpoint.availability.0",
    boundary_order: 0
  });
  const compaction = autonomousWorldTransportCompaction.createTransportCompaction(log, replay, checkpoint, {
    compaction_id: "compaction.availability.0",
    to_order: 0
  });
  const damagedLog = clone(log);
  damagedLog.entries[0].transport_event = null;
  const repairIssue = autonomousWorldTransportRepair.detectTransportEvidenceIssues({ log: damagedLog }).issues[0];
  const repairRequest = autonomousWorldTransportRepair.createRepairRequest(repairIssue);
  const repairPayload = autonomousWorldTransportRepair.createRepairPayload(repairRequest, eventA, {
    supplier: "peer.fixture.alice"
  });
  return { base, left, right, merged, graph, pkg, peer, registry, offer, subscription, filePlan, fifoPlan, eventA, eventB, log, replay, checkpoint, compaction, damagedLog, repairPayload };
}

function availabilityInput(fixture, overrides) {
  return Object.assign({
    required_receipts: [
      fixture.eventA.transport_event_receipt,
      fixture.eventB.transport_event_receipt,
      fixture.log.transport_log_receipt,
      fixture.checkpoint.checkpoint_receipt,
      fixture.compaction.compaction_receipt,
      "receipt.missing.fixture"
    ],
    corrupt_receipts: [],
    inventory: {
      evidence: [fixture.eventB, fixture.log, fixture.checkpoint, fixture.compaction],
      suppliers: [{
        peer_id: "peer.fixture.alice",
        package_receipt: fixture.pkg.package_receipt,
        provides: [fixture.eventA.transport_event_receipt],
        authority: false
      }]
    }
  }, overrides || {});
}

function testDeterministicAvailabilityReceipt() {
  console.log("Testing deterministic availability receipts");

  const fixture = buildAvailabilityFixture();
  const first = autonomousWorldTransportAvailability.createAvailabilityReport(availabilityInput(fixture));
  const second = autonomousWorldTransportAvailability.createAvailabilityReport(availabilityInput(fixture));

  assert.strictEqual(first.availability_receipt, second.availability_receipt);
  assert.strictEqual(first.authority, false);

  console.log("  OK same inventory and required receipt set produce stable availability receipt\n");
}

function testDetectsAvailableEvidenceReceipts() {
  console.log("Testing available transport log checkpoint and compaction receipts");

  const fixture = buildAvailabilityFixture();
  const report = autonomousWorldTransportAvailability.createAvailabilityReport(availabilityInput(fixture));
  const available = report.available.map((record) => record.receipt);

  assert.ok(available.includes(fixture.eventB.transport_event_receipt));
  assert.ok(available.includes(fixture.log.transport_log_receipt));
  assert.ok(available.includes(fixture.checkpoint.checkpoint_receipt));
  assert.ok(available.includes(fixture.compaction.compaction_receipt));

  console.log("  OK local inventory classifies available transport evidence\n");
}

function testDetectsMissingAndCorruptEvidence() {
  console.log("Testing missing and corrupt evidence classification");

  const fixture = buildAvailabilityFixture();
  const missingReport = autonomousWorldTransportAvailability.createAvailabilityReport(availabilityInput(fixture));
  const corruptReport = autonomousWorldTransportAvailability.createAvailabilityReport(availabilityInput(fixture, {
    corrupt_receipts: [fixture.eventB.transport_event_receipt]
  }));

  assert.ok(missingReport.missing.map((record) => record.receipt).includes("receipt.missing.fixture"));
  assert.ok(corruptReport.corrupt.map((record) => record.receipt).includes(fixture.eventB.transport_event_receipt));
  assert.ok(!corruptReport.available.map((record) => record.receipt).includes(fixture.eventB.transport_event_receipt));

  console.log("  OK missing evidence stays visible and corrupt evidence is unavailable\n");
}

function testRepairableSupplierIsNonAuthoritative() {
  console.log("Testing repairable receipts and candidate suppliers");

  const fixture = buildAvailabilityFixture();
  const report = autonomousWorldTransportAvailability.createAvailabilityReport(availabilityInput(fixture));
  const repairable = report.repairable.find((record) => record.receipt === fixture.eventA.transport_event_receipt);

  assert.ok(repairable);
  assert.strictEqual(repairable.authority, false);
  assert.strictEqual(repairable.candidate_suppliers[0].peer_id, "peer.fixture.alice");
  assert.strictEqual(repairable.candidate_suppliers[0].authority, false);
  assert.ok(report.candidate_suppliers.every((supplier) => supplier.authority === false));

  console.log("  OK candidate suppliers guide repair without becoming trust\n");
}

function testAvailabilityCannotOpenSnapshots() {
  console.log("Testing availability report cannot open snapshots");

  const fixture = buildAvailabilityFixture();
  const report = autonomousWorldTransportAvailability.createAvailabilityReport(availabilityInput(fixture));

  assert.throws(() => {
    autonomousWorldTransportAvailability.openAvailabilitySnapshot(
      report,
      fixture.merged.admission.identity_receipt
    );
  }, /availability-not-admission/);

  console.log("  OK availability reports cannot project admitted snapshots\n");
}

function testRepairPlanFeedsPhase113() {
  console.log("Testing availability repair plan feeds Phase 113 repair path");

  const fixture = buildAvailabilityFixture();
  const report = autonomousWorldTransportAvailability.createAvailabilityReport(availabilityInput(fixture));
  const plan = autonomousWorldTransportAvailability.buildRepairPlan(report, [fixture.repairPayload]);
  const result = autonomousWorldTransportAvailability.executeRepairPlan(
    fixture.registry,
    { log: fixture.damagedLog, checkpoint: fixture.checkpoint, compaction: fixture.compaction },
    plan,
    fixture.subscription
  );

  assert.strictEqual(plan.authority, false);
  assert.ok(plan.actions[0].repair_request.repair_request_receipt);
  assert.ok(plan.actions[0].repair_payload.repair_payload_receipt);
  assert.strictEqual(result.verification_recomputed, true);
  assert.deepStrictEqual(result.accepted_snapshot_identities, fixture.replay.accepted_snapshot_identities);

  console.log("  OK repair plan guides Phase 113 while repaired replay restores admissibility by verification\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 114 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-transport-availability-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(selfMap.declaration["world-transport-availability-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-transport-availability-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.transport-availability-court");
  assert.strictEqual(parsedA.declaration.rule["availability-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["availability-match-is-admission"], false);
  assert.strictEqual(parsedA.declaration.rule["candidate-supplier-is-trust"], false);
  assert.strictEqual(parsedA.declaration.rule["repairable-is-repaired"], false);
  assert.strictEqual(parsedA.declaration.rule["availability-report-opens-snapshots"], false);
  assert.ok(String(guards.get("node-map-not-admission")).includes("only verification can admit history"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-transport-availability-court" &&
    triplet.predicate === "section" &&
    triplet.object === "availability-workflow"
  )));
  assert.ok(courts.map(recordId).includes("autonomous-world-transport-availability-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-114-AUTONOMOUS-WORLD-TRANSPORT-AVAILABILITY-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-transport-availability-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_transport_availability.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-transport-availability-courts"]).includes("availability_receipt"));

  console.log("  OK Phase 114 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 114 - Autonomous World Transport Availability Court");
console.log("==================================================================\n");

testDeterministicAvailabilityReceipt();
testDetectsAvailableEvidenceReceipts();
testDetectsMissingAndCorruptEvidence();
testRepairableSupplierIsNonAuthoritative();
testAvailabilityCannotOpenSnapshots();
testRepairPlanFeedsPhase113();
testDoctrineAndSelfMap();

console.log("\n==================================================================");
console.log("ALL PHASE 114 AUTONOMOUS WORLD TRANSPORT AVAILABILITY TESTS PASSED");
