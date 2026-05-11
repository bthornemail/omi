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
const autonomousWorldTransportRequestScheduler = require("../workbench/src/autonomous_world_transport_request_scheduler.js");
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
    branch: "branch.scheduler"
  };
}

function admitOverlay(base, overlayInputValue) {
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(base, overlayInputValue);
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(base, overlay);
  return autonomousWorldOverlayAdmission.admitCandidate(base, candidate);
}

function buildSchedulerFixture() {
  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const left = admitOverlay(
    base,
    overlayInput("overlay.scheduler.left", "world.autonomous-fixture/objects/trailer.001", "scheduler left")
  );
  const right = admitOverlay(
    base,
    overlayInput("overlay.scheduler.right", "world.autonomous-fixture/interactions/hitch-link.001", "scheduler right")
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
    transport: "transport.scheduler.fixture"
  });
  const peer = autonomousWorldPeerExchange.declarePeer({
    peer_id: "peer.fixture.alice",
    label: "Alice Fixture Peer",
    endpoint: "declared.protocol-only",
    capabilities: ["world.sync.offer"]
  });
  const registry = autonomousWorldPeerExchange.createPeerRegistry([peer]);
  const offer = autonomousWorldPeerExchange.offerPackage(peer, pkg, {
    transport: "transport.scheduler.fixture"
  });
  const subscription = autonomousWorldSubscriptionCourt.declareSubscription({
    subscription_id: "sub.fixture.transport-scheduler",
    filters: {
      peer_id: "peer.fixture.alice",
      world_id: "world.autonomous-fixture",
      history_mode: "admitted-only"
    }
  });
  const filePlan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.scheduler.file-drop",
    adapter: "file-drop",
    endpoint: "file:///tmp/omi-scheduler-offers"
  });
  const fifoPlan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.scheduler.fifo",
    adapter: "fifo",
    endpoint: "/run/omi/scheduler-offers.fifo"
  });
  const eventA = autonomousWorldLiveTransportAdapter.createTransportEvent(filePlan, offer, pkg);
  const eventB = autonomousWorldLiveTransportAdapter.createTransportEvent(fifoPlan, offer, pkg);
  const log = autonomousWorldTransportReplay.createTransportReplayLog({
    log_id: "transport.scheduler.fixture",
    events: [eventA, eventB]
  });
  const replay = autonomousWorldTransportReplay.replayTransportLog(registry, log, subscription);
  const checkpoint = autonomousWorldTransportCheckpoint.createTransportCheckpoint(log, replay, {
    checkpoint_id: "checkpoint.scheduler.0",
    boundary_order: 0
  });
  const compaction = autonomousWorldTransportCompaction.createTransportCompaction(log, replay, checkpoint, {
    compaction_id: "compaction.scheduler.0",
    to_order: 0
  });
  const damagedLog = clone(log);
  damagedLog.entries[0].transport_event = null;
  const repairIssue = autonomousWorldTransportRepair.detectTransportEvidenceIssues({ log: damagedLog }).issues[0];
  const repairRequest = autonomousWorldTransportRepair.createRepairRequest(repairIssue);
  const repairPayload = autonomousWorldTransportRepair.createRepairPayload(repairRequest, eventA, {
    supplier: "peer.fixture.alice"
  });
  return { base, merged, graph, pkg, peer, registry, offer, subscription, eventA, eventB, log, replay, checkpoint, compaction, damagedLog, repairPayload };
}

function availabilityInput(fixture, overrides) {
  return Object.assign({
    required_receipts: [
      fixture.eventA.transport_event_receipt,
      fixture.eventB.transport_event_receipt,
      fixture.log.transport_log_receipt,
      fixture.checkpoint.checkpoint_receipt,
      fixture.compaction.compaction_receipt,
      "receipt.unsupplied.fixture"
    ],
    corrupt_receipts: [fixture.eventB.transport_event_receipt],
    inventory: {
      evidence: [fixture.eventB, fixture.log, fixture.checkpoint, fixture.compaction],
      suppliers: [{
        peer_id: "peer.fixture.alice",
        package_receipt: fixture.pkg.package_receipt,
        provides: [fixture.eventA.transport_event_receipt],
        authority: false
      }, {
        peer_id: "peer.fixture.bob",
        package_receipt: "package.fixture.bob",
        provides: [fixture.eventA.transport_event_receipt],
        authority: false
      }]
    }
  }, overrides || {});
}

function createReport(fixture, overrides) {
  return autonomousWorldTransportAvailability.createAvailabilityReport(availabilityInput(fixture, overrides));
}

function testDeterministicScheduleReceipts() {
  console.log("Testing deterministic request schedule receipts");

  const fixture = buildSchedulerFixture();
  const report = createReport(fixture);
  const first = autonomousWorldTransportRequestScheduler.createRequestSchedule(report, {
    policy_id: "deterministic.fixture"
  });
  const second = autonomousWorldTransportRequestScheduler.createRequestSchedule(report, {
    policy_id: "deterministic.fixture"
  });

  assert.strictEqual(first.schedule_receipt, second.schedule_receipt);
  assert.strictEqual(first.authority, false);
  assert.strictEqual(first.admission, false);
  assert.strictEqual(first.dispatch, false);

  console.log("  OK same availability report and policy produce stable schedule receipt\n");
}

function testChangedPolicyChangesScheduleReceipt() {
  console.log("Testing changed scheduling policy changes schedule receipt");

  const fixture = buildSchedulerFixture();
  const report = createReport(fixture);
  const first = autonomousWorldTransportRequestScheduler.createRequestSchedule(report, {
    policy_id: "deterministic.fixture"
  });
  const second = autonomousWorldTransportRequestScheduler.createRequestSchedule(report, {
    policy_id: "deterministic.fixture.reversed",
    order: ["repairable", "missing", "corrupt"]
  });

  assert.notStrictEqual(first.schedule_receipt, second.schedule_receipt);
  assert.notStrictEqual(first.requests[0].reason, second.requests[0].reason);

  console.log("  OK policy changes are witnessed by schedule receipt changes\n");
}

function testRequestClassifications() {
  console.log("Testing missing corrupt and repairable request entries");

  const fixture = buildSchedulerFixture();
  const report = createReport(fixture);
  const schedule = autonomousWorldTransportRequestScheduler.createRequestSchedule(report, {
    policy_id: "deterministic.fixture"
  });
  const byReceipt = new Map(schedule.requests.map((request) => [request.target_receipt, request]));
  const eventARequest = byReceipt.get(fixture.eventA.transport_event_receipt);
  const eventBRequest = byReceipt.get(fixture.eventB.transport_event_receipt);
  const missingRequest = byReceipt.get("receipt.unsupplied.fixture");

  assert.ok(eventARequest);
  assert.strictEqual(eventARequest.reason, "repairable");
  assert.strictEqual(eventARequest.candidate_suppliers.length, 2);
  assert.deepStrictEqual(eventARequest.candidate_suppliers.map((supplier) => supplier.peer_id), [
    "peer.fixture.alice",
    "peer.fixture.bob"
  ]);
  assert.ok(eventARequest.candidate_suppliers.every((supplier) => supplier.authority === false));
  assert.ok(eventARequest.candidate_suppliers.every((supplier) => supplier.priority_is_trust === false));

  assert.ok(eventBRequest);
  assert.strictEqual(eventBRequest.reason, "corrupt");
  assert.strictEqual(eventBRequest.candidate_suppliers.length, 0);

  assert.ok(missingRequest);
  assert.strictEqual(missingRequest.reason, "missing");
  assert.ok(schedule.unsatisfied.map((record) => record.target_receipt).includes("receipt.unsupplied.fixture"));

  console.log("  OK request plan names missing corrupt and repairable receipts without hiding unsatisfied evidence\n");
}

function testRequestPlanCannotOpenSnapshots() {
  console.log("Testing request schedule cannot open snapshots");

  const fixture = buildSchedulerFixture();
  const report = createReport(fixture);
  const schedule = autonomousWorldTransportRequestScheduler.createRequestSchedule(report);

  assert.throws(() => {
    autonomousWorldTransportRequestScheduler.openScheduledSnapshot(schedule, fixture.merged.admission.identity_receipt);
  }, /schedule-not-admission/);

  console.log("  OK request schedules cannot project admitted snapshots\n");
}

function testScheduledRepairFeedsPhase113() {
  console.log("Testing scheduled repair feeds Phase 113 verification path");

  const fixture = buildSchedulerFixture();
  const report = createReport(fixture);
  const schedule = autonomousWorldTransportRequestScheduler.createRequestSchedule(report);
  const plan = autonomousWorldTransportRequestScheduler.buildScheduledRepairPlan(schedule, [fixture.repairPayload]);
  const result = autonomousWorldTransportRequestScheduler.executeScheduledRepair(
    fixture.registry,
    { log: fixture.damagedLog, checkpoint: fixture.checkpoint, compaction: fixture.compaction },
    plan,
    fixture.subscription
  );

  assert.strictEqual(plan.authority, false);
  assert.strictEqual(plan.dispatch, false);
  assert.ok(plan.actions.some((action) => action.repair_payload && action.repair_payload.repair_payload_receipt));
  assert.strictEqual(result.verification_recomputed, true);
  assert.deepStrictEqual(result.accepted_snapshot_identities, fixture.replay.accepted_snapshot_identities);

  console.log("  OK scheduled repair chooses payloads but Phase 113 restores admissibility by verification\n");
}

function testTamperedDeliveryStillRejects() {
  console.log("Testing delivered tampered payload rejects through Phase 113");

  const fixture = buildSchedulerFixture();
  const report = createReport(fixture);
  const schedule = autonomousWorldTransportRequestScheduler.createRequestSchedule(report);
  const tamperedPayload = clone(fixture.repairPayload);
  tamperedPayload.evidence_receipt = "tampered";
  const plan = autonomousWorldTransportRequestScheduler.buildScheduledRepairPlan(schedule, [tamperedPayload]);

  assert.throws(() => {
    autonomousWorldTransportRequestScheduler.executeScheduledRepair(
      fixture.registry,
      { log: fixture.damagedLog, checkpoint: fixture.checkpoint, compaction: fixture.compaction },
      plan,
      fixture.subscription
    );
  }, /repair-payload-receipt-mismatch/);

  console.log("  OK delivery does not bypass repair payload verification\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 115 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-transport-request-scheduler-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(selfMap.declaration["world-transport-request-scheduler-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-transport-request-scheduler-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.transport-request-scheduler-court");
  assert.strictEqual(parsedA.declaration.rule["scheduler-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["request-plan-is-admission"], false);
  assert.strictEqual(parsedA.declaration.rule["supplier-priority-is-trust"], false);
  assert.strictEqual(parsedA.declaration.rule["delivery-success-is-receipt-validity"], false);
  assert.strictEqual(parsedA.declaration.rule["retry-policy-bypasses-verification"], false);
  assert.ok(String(guards.get("request-next-not-trust")).includes("without trusting the request"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-transport-request-scheduler-court" &&
    triplet.predicate === "section" &&
    triplet.object === "scheduler-workflow"
  )));
  assert.ok(courts.map(recordId).includes("autonomous-world-transport-request-scheduler-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-115-AUTONOMOUS-WORLD-TRANSPORT-REQUEST-SCHEDULER-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-transport-request-scheduler-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_transport_request_scheduler.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-transport-request-scheduler-courts"]).includes("schedule_receipt"));

  console.log("  OK Phase 115 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 115 - Autonomous World Transport Request Scheduler Court");
console.log("========================================================================\n");

testDeterministicScheduleReceipts();
testChangedPolicyChangesScheduleReceipt();
testRequestClassifications();
testRequestPlanCannotOpenSnapshots();
testScheduledRepairFeedsPhase113();
testTamperedDeliveryStillRejects();
testDoctrineAndSelfMap();

console.log("\n========================================================================");
console.log("ALL PHASE 115 AUTONOMOUS WORLD TRANSPORT REQUEST SCHEDULER TESTS PASSED");
