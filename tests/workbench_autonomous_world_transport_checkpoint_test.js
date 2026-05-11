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
    branch: "branch.checkpoint"
  };
}

function admitOverlay(base, overlayInputValue) {
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(base, overlayInputValue);
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(base, overlay);
  return autonomousWorldOverlayAdmission.admitCandidate(base, candidate);
}

function buildCheckpointFixture() {
  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const left = admitOverlay(
    base,
    overlayInput("overlay.checkpoint.left", "world.autonomous-fixture/objects/trailer.001", "checkpoint left")
  );
  const right = admitOverlay(
    base,
    overlayInput("overlay.checkpoint.right", "world.autonomous-fixture/interactions/hitch-link.001", "checkpoint right")
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
    transport: "transport.checkpoint.fixture"
  });
  const peer = autonomousWorldPeerExchange.declarePeer({
    peer_id: "peer.fixture.alice",
    label: "Alice Fixture Peer",
    endpoint: "declared.protocol-only",
    capabilities: ["world.sync.offer"]
  });
  const registry = autonomousWorldPeerExchange.createPeerRegistry([peer]);
  const offer = autonomousWorldPeerExchange.offerPackage(peer, pkg, {
    transport: "transport.checkpoint.fixture"
  });
  const subscription = autonomousWorldSubscriptionCourt.declareSubscription({
    subscription_id: "sub.fixture.transport-checkpoint",
    filters: {
      peer_id: "peer.fixture.alice",
      world_id: "world.autonomous-fixture",
      history_mode: "admitted-only"
    }
  });
  const filePlan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.checkpoint.file-drop",
    adapter: "file-drop",
    endpoint: "file:///tmp/omi-checkpoint-offers"
  });
  const fifoPlan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.checkpoint.fifo",
    adapter: "fifo",
    endpoint: "/run/omi/checkpoint-offers.fifo"
  });
  const eventA = autonomousWorldLiveTransportAdapter.createTransportEvent(filePlan, offer, pkg);
  const eventB = autonomousWorldLiveTransportAdapter.createTransportEvent(fifoPlan, offer, pkg);
  const log = autonomousWorldTransportReplay.createTransportReplayLog({
    log_id: "transport.checkpoint.fixture",
    events: [eventA, eventB]
  });
  const replay = autonomousWorldTransportReplay.replayTransportLog(registry, log, subscription);
  const checkpoint = autonomousWorldTransportCheckpoint.createTransportCheckpoint(log, replay, {
    checkpoint_id: "checkpoint.fixture.0",
    boundary_order: 0
  });
  return { base, left, right, merged, graph, pkg, peer, registry, offer, subscription, filePlan, fifoPlan, eventA, eventB, log, replay, checkpoint };
}

function testDeterministicCheckpointReceipt() {
  console.log("Testing deterministic transport checkpoint receipts");

  const fixture = buildCheckpointFixture();
  const first = autonomousWorldTransportCheckpoint.createTransportCheckpoint(fixture.log, fixture.replay, {
    checkpoint_id: "checkpoint.fixture.0",
    boundary_order: 0
  });
  const second = autonomousWorldTransportCheckpoint.createTransportCheckpoint(fixture.log, fixture.replay, {
    checkpoint_id: "checkpoint.fixture.0",
    boundary_order: 0
  });

  assert.strictEqual(first.checkpoint_receipt, second.checkpoint_receipt);
  assert.strictEqual(first.authority, false);
  assert.strictEqual(first.admission, false);

  console.log("  OK same replay log and boundary produce stable non-authoritative checkpoint\n");
}

function testCheckpointRecordsHeadTailAndSummaries() {
  console.log("Testing checkpoint records log head tail and accepted rejected summaries");

  const fixture = buildCheckpointFixture();
  const tamperedPackage = clone(fixture.pkg);
  tamperedPackage.snapshots[0].admission.source += "\n;; checkpoint tamper";
  const tamperedEvent = autonomousWorldLiveTransportAdapter.createTransportEvent(fixture.fifoPlan, fixture.offer, tamperedPackage);
  const log = autonomousWorldTransportReplay.createTransportReplayLog({
    log_id: "transport.checkpoint.summary",
    events: [fixture.eventA, tamperedEvent]
  });
  const replay = autonomousWorldTransportReplay.replayTransportLog(fixture.registry, log, fixture.subscription);
  const checkpoint = autonomousWorldTransportCheckpoint.createTransportCheckpoint(log, replay, {
    checkpoint_id: "checkpoint.fixture.summary",
    boundary_order: 1
  });

  assert.strictEqual(checkpoint.log_from_receipt, log.entries[0].replay_entry_receipt);
  assert.strictEqual(checkpoint.log_to_receipt, log.entries[1].replay_entry_receipt);
  assert.ok(checkpoint.accepted_snapshot_identities.includes(String(fixture.merged.admission.identity_receipt)));
  assert.ok(checkpoint.rejected_event_receipts.includes(tamperedEvent.transport_event_receipt));
  assert.ok(checkpoint.checkpoint_receipt);

  console.log("  OK checkpoint summarizes accepted and rejected replay evidence without authority\n");
}

function testTamperedLogRejectsBeforeCheckpoint() {
  console.log("Testing tampered log rejects before checkpoint or resume");

  const fixture = buildCheckpointFixture();
  const tampered = clone(fixture.log);
  tampered.entries[0].transport_event_receipt = 42;

  assert.throws(() => {
    autonomousWorldTransportCheckpoint.createTransportCheckpoint(tampered, fixture.replay, {
      checkpoint_id: "checkpoint.fixture.tampered-log",
      boundary_order: 0
    });
  }, /transport-event-receipt-mismatch|transport-log-entry-receipt-mismatch/);
  assert.throws(() => {
    autonomousWorldTransportCheckpoint.resumeTransportReplay(
      fixture.registry,
      tampered,
      fixture.checkpoint,
      fixture.subscription
    );
  }, /transport-event-receipt-mismatch|transport-log-entry-receipt-mismatch/);

  console.log("  OK tampered logs cannot be checkpointed or resumed\n");
}

function testTamperedCheckpointRejects() {
  console.log("Testing tampered checkpoint rejects");

  const fixture = buildCheckpointFixture();
  const tampered = clone(fixture.checkpoint);
  tampered.accepted_snapshot_identities.push("identity.fake");

  assert.throws(() => {
    autonomousWorldTransportCheckpoint.verifyTransportCheckpoint(tampered, fixture.log);
  }, /checkpoint-receipt-mismatch/);
  assert.throws(() => {
    autonomousWorldTransportCheckpoint.resumeTransportReplay(
      fixture.registry,
      fixture.log,
      tampered,
      fixture.subscription
    );
  }, /checkpoint-receipt-mismatch/);

  console.log("  OK checkpoint summaries cannot be modified without receipt failure\n");
}

function testResumeMatchesFullReplay() {
  console.log("Testing checkpoint resume matches full replay accepted identities");

  const fixture = buildCheckpointFixture();
  const resume = autonomousWorldTransportCheckpoint.resumeTransportReplay(
    fixture.registry,
    fixture.log,
    fixture.checkpoint,
    fixture.subscription
  );

  assert.strictEqual(resume.authority, false);
  assert.strictEqual(resume.admission, false);
  assert.strictEqual(resume.verification_recomputed, true);
  assert.deepStrictEqual(resume.accepted_snapshot_identities, fixture.replay.accepted_snapshot_identities);
  assert.ok(resume.resume_receipt);

  console.log("  OK resumed replay converges with full replay while recomputing verification\n");
}

function testStoredAcceptedStatusCannotAdmit() {
  console.log("Testing stored accepted status alone cannot admit snapshots");

  const fixture = buildCheckpointFixture();

  assert.throws(() => {
    autonomousWorldTransportCheckpoint.openCheckpointSnapshot(
      fixture.checkpoint,
      fixture.merged.admission.identity_receipt
    );
  }, /checkpoint-not-admission/);

  console.log("  OK checkpoint memory cannot directly open admitted world projections\n");
}

function testBrowserAndRendererOpenResumedSnapshots() {
  console.log("Testing browser and renderer open resumed verified snapshots");

  const fixture = buildCheckpointFixture();
  const resume = autonomousWorldTransportCheckpoint.resumeTransportReplay(
    fixture.registry,
    fixture.log,
    fixture.checkpoint,
    fixture.subscription
  );
  const browser = autonomousWorldTransportCheckpoint.openResumedSnapshot(
    resume,
    fixture.merged.admission.identity_receipt
  );
  const renderer = autonomousWorldTransportCheckpoint.renderResumedSnapshot(
    resume,
    fixture.merged.admission.identity_receipt,
    { view_mode: "greedy" }
  );

  assert.strictEqual(browser.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.strictEqual(renderer.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.ok(renderer.render_receipt);

  console.log("  OK browser and renderer open only snapshots accepted after resumed verification\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 111 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-transport-checkpoint-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(selfMap.declaration["world-transport-checkpoint-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-transport-checkpoint-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.transport-checkpoint-court");
  assert.strictEqual(parsedA.declaration.rule["checkpoint-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["checkpoint-summary-is-admission"], false);
  assert.strictEqual(parsedA.declaration.rule["checkpoint-resume-bypasses-verification"], false);
  assert.strictEqual(parsedA.declaration.rule["resume-recomputes-verification"], true);
  assert.strictEqual(parsedA.declaration.rule["stored-accepted-status-admits"], false);
  assert.ok(String(guards.get("replay-memory-not-authority")).includes("replay memory not replay authority"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-transport-checkpoint-court" &&
    triplet.predicate === "section" &&
    triplet.object === "checkpoint-workflow"
  )));
  assert.ok(courts.map(recordId).includes("autonomous-world-transport-checkpoint-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-111-AUTONOMOUS-WORLD-TRANSPORT-CHECKPOINT-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-transport-checkpoint-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_transport_checkpoint.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-transport-checkpoint-courts"]).includes("checkpoint_receipt"));

  console.log("  OK Phase 111 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 111 - Autonomous World Transport Checkpoint Court");
console.log("================================================================\n");

testDeterministicCheckpointReceipt();
testCheckpointRecordsHeadTailAndSummaries();
testTamperedLogRejectsBeforeCheckpoint();
testTamperedCheckpointRejects();
testResumeMatchesFullReplay();
testStoredAcceptedStatusCannotAdmit();
testBrowserAndRendererOpenResumedSnapshots();
testDoctrineAndSelfMap();

console.log("\n================================================================");
console.log("ALL PHASE 111 AUTONOMOUS WORLD TRANSPORT CHECKPOINT TESTS PASSED");
