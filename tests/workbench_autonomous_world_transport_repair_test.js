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
    branch: "branch.repair"
  };
}

function admitOverlay(base, overlayInputValue) {
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(base, overlayInputValue);
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(base, overlay);
  return autonomousWorldOverlayAdmission.admitCandidate(base, candidate);
}

function buildRepairFixture() {
  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const left = admitOverlay(
    base,
    overlayInput("overlay.repair.left", "world.autonomous-fixture/objects/trailer.001", "repair left")
  );
  const right = admitOverlay(
    base,
    overlayInput("overlay.repair.right", "world.autonomous-fixture/interactions/hitch-link.001", "repair right")
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
    transport: "transport.repair.fixture"
  });
  const peer = autonomousWorldPeerExchange.declarePeer({
    peer_id: "peer.fixture.alice",
    label: "Alice Fixture Peer",
    endpoint: "declared.protocol-only",
    capabilities: ["world.sync.offer"]
  });
  const registry = autonomousWorldPeerExchange.createPeerRegistry([peer]);
  const offer = autonomousWorldPeerExchange.offerPackage(peer, pkg, {
    transport: "transport.repair.fixture"
  });
  const subscription = autonomousWorldSubscriptionCourt.declareSubscription({
    subscription_id: "sub.fixture.transport-repair",
    filters: {
      peer_id: "peer.fixture.alice",
      world_id: "world.autonomous-fixture",
      history_mode: "admitted-only"
    }
  });
  const filePlan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.repair.file-drop",
    adapter: "file-drop",
    endpoint: "file:///tmp/omi-repair-offers"
  });
  const fifoPlan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.repair.fifo",
    adapter: "fifo",
    endpoint: "/run/omi/repair-offers.fifo"
  });
  const eventA = autonomousWorldLiveTransportAdapter.createTransportEvent(filePlan, offer, pkg);
  const eventB = autonomousWorldLiveTransportAdapter.createTransportEvent(fifoPlan, offer, pkg);
  const log = autonomousWorldTransportReplay.createTransportReplayLog({
    log_id: "transport.repair.fixture",
    events: [eventA, eventB]
  });
  const replay = autonomousWorldTransportReplay.replayTransportLog(registry, log, subscription);
  const checkpoint = autonomousWorldTransportCheckpoint.createTransportCheckpoint(log, replay, {
    checkpoint_id: "checkpoint.repair.0",
    boundary_order: 0
  });
  const compaction = autonomousWorldTransportCompaction.createTransportCompaction(log, replay, checkpoint, {
    compaction_id: "compaction.repair.0",
    to_order: 0
  });
  return { base, left, right, merged, graph, pkg, peer, registry, offer, subscription, filePlan, fifoPlan, eventA, eventB, log, replay, checkpoint, compaction };
}

function firstIssue(report, kind, reason) {
  return report.issues.find((issue) => (
    issue.target_kind === kind &&
    (!reason || issue.reason === reason)
  ));
}

function testMissingEventDetectedByReceipt() {
  console.log("Testing missing transport event is detected by receipt");

  const fixture = buildRepairFixture();
  const damaged = clone(fixture.log);
  damaged.entries[0].transport_event = null;
  const report = autonomousWorldTransportRepair.detectTransportEvidenceIssues({
    log: damaged,
    compaction: fixture.compaction
  });
  const issue = firstIssue(report, "transport-event", "missing-event");

  assert.ok(issue);
  assert.strictEqual(issue.target_receipt, fixture.eventA.transport_event_receipt);
  assert.strictEqual(issue.authority, false);

  console.log("  OK missing events are named by receipt for repair\n");
}

function testCorruptEvidenceDetected() {
  console.log("Testing corrupt event chain and compaction evidence are detected");

  const fixture = buildRepairFixture();
  const corruptEventLog = clone(fixture.log);
  corruptEventLog.entries[0].transport_event.transport_event_receipt = 123;
  const corruptChainLog = clone(fixture.log);
  corruptChainLog.entries[1].previous_entry_receipt = 456;
  const corruptCompaction = clone(fixture.compaction);
  corruptCompaction.retained_evidence_receipts.push(789);

  const eventReport = autonomousWorldTransportRepair.detectTransportEvidenceIssues({ log: corruptEventLog });
  const chainReport = autonomousWorldTransportRepair.detectTransportEvidenceIssues({ log: corruptChainLog });
  const compactionReport = autonomousWorldTransportRepair.detectTransportEvidenceIssues({
    log: fixture.log,
    compaction: corruptCompaction
  });

  assert.ok(firstIssue(eventReport, "transport-event", "corrupt-event"));
  assert.ok(firstIssue(chainReport, "transport-log-chain"));
  assert.ok(firstIssue(compactionReport, "compaction-bundle"));

  console.log("  OK corrupt transport events logs and compaction bundles produce repair issues\n");
}

function testRepairRequestIsDeterministic() {
  console.log("Testing deterministic repair requests");

  const fixture = buildRepairFixture();
  const damaged = clone(fixture.log);
  damaged.entries[0].transport_event = null;
  const issue = firstIssue(
    autonomousWorldTransportRepair.detectTransportEvidenceIssues({ log: damaged }),
    "transport-event",
    "missing-event"
  );
  const first = autonomousWorldTransportRepair.createRepairRequest(issue);
  const second = autonomousWorldTransportRepair.createRepairRequest(issue);

  assert.strictEqual(first.repair_request_receipt, second.repair_request_receipt);
  assert.strictEqual(first.authority, false);
  assert.strictEqual(first.target_receipt, fixture.eventA.transport_event_receipt);

  console.log("  OK repair requests are stable non-authoritative receipt-addressed records\n");
}

function testRepairPayloadRestoresEvidenceShape() {
  console.log("Testing repair payload restores missing evidence shape");

  const fixture = buildRepairFixture();
  const damaged = clone(fixture.log);
  damaged.entries[0].transport_event = null;
  const issue = firstIssue(
    autonomousWorldTransportRepair.detectTransportEvidenceIssues({ log: damaged }),
    "transport-event",
    "missing-event"
  );
  const request = autonomousWorldTransportRepair.createRepairRequest(issue);
  const payload = autonomousWorldTransportRepair.createRepairPayload(request, fixture.eventA);
  const repaired = autonomousWorldTransportRepair.applyRepairPayload(damaged, payload);

  assert.strictEqual(repaired.entries[0].transport_event.transport_event_receipt, fixture.eventA.transport_event_receipt);
  assert.doesNotThrow(() => autonomousWorldTransportReplay.verifyTransportReplayLog(repaired));

  console.log("  OK repair payloads restore evidence shape before verification\n");
}

function testTamperedRepairPayloadRejects() {
  console.log("Testing tampered repair payload rejects");

  const fixture = buildRepairFixture();
  const damaged = clone(fixture.log);
  damaged.entries[0].transport_event = null;
  const issue = firstIssue(
    autonomousWorldTransportRepair.detectTransportEvidenceIssues({ log: damaged }),
    "transport-event",
    "missing-event"
  );
  const request = autonomousWorldTransportRepair.createRepairRequest(issue);
  const payload = autonomousWorldTransportRepair.createRepairPayload(request, fixture.eventA);
  const tampered = clone(payload);
  tampered.evidence_receipt = 42;

  assert.throws(() => autonomousWorldTransportRepair.verifyRepairPayload(tampered), /repair-payload-receipt-mismatch|repair-payload-target-mismatch/);
  assert.throws(() => autonomousWorldTransportRepair.applyRepairPayload(damaged, tampered), /repair-payload-receipt-mismatch|repair-payload-target-mismatch/);

  console.log("  OK repair payloads cannot be modified without receipt failure\n");
}

function testRepairedReplayMatchesFullReplay() {
  console.log("Testing repaired replay matches original full replay accepted identities");

  const fixture = buildRepairFixture();
  const damaged = clone(fixture.log);
  damaged.entries[0].transport_event = null;
  const issue = firstIssue(
    autonomousWorldTransportRepair.detectTransportEvidenceIssues({
      log: damaged,
      compaction: fixture.compaction
    }),
    "transport-event",
    "missing-event"
  );
  const request = autonomousWorldTransportRepair.createRepairRequest(issue);
  const payload = autonomousWorldTransportRepair.createRepairPayload(request, fixture.eventA);
  const result = autonomousWorldTransportRepair.repairAndReplay(
    fixture.registry,
    { log: damaged, checkpoint: fixture.checkpoint, compaction: fixture.compaction },
    [payload],
    fixture.subscription
  );

  assert.strictEqual(result.authority, false);
  assert.strictEqual(result.admission, false);
  assert.strictEqual(result.verification_recomputed, true);
  assert.deepStrictEqual(result.accepted_snapshot_identities, fixture.replay.accepted_snapshot_identities);
  assert.ok(result.repair_result_receipt);

  console.log("  OK repaired replay converges with original full replay through verification\n");
}

function testStoredRepairStatusCannotOpenSnapshots() {
  console.log("Testing stored repair status alone cannot open snapshots");

  const fixture = buildRepairFixture();
  assert.throws(() => {
    autonomousWorldTransportRepair.openRepairStatusSnapshot(
      { repaired: true, accepted_snapshot_identities: [fixture.merged.admission.identity_receipt] },
      fixture.merged.admission.identity_receipt
    );
  }, /repair-status-not-admission/);

  console.log("  OK stored repair status cannot become projection authority\n");
}

function testBrowserAndRendererOpenAfterRepairVerification() {
  console.log("Testing browser and renderer open after repaired verification");

  const fixture = buildRepairFixture();
  const damaged = clone(fixture.log);
  damaged.entries[0].transport_event = null;
  const issue = firstIssue(
    autonomousWorldTransportRepair.detectTransportEvidenceIssues({ log: damaged }),
    "transport-event",
    "missing-event"
  );
  const request = autonomousWorldTransportRepair.createRepairRequest(issue);
  const payload = autonomousWorldTransportRepair.createRepairPayload(request, fixture.eventA);
  const result = autonomousWorldTransportRepair.repairAndReplay(
    fixture.registry,
    { log: damaged, checkpoint: fixture.checkpoint, compaction: fixture.compaction },
    [payload],
    fixture.subscription
  );
  const browser = autonomousWorldTransportRepair.openRepairSnapshot(
    result,
    fixture.merged.admission.identity_receipt
  );
  const renderer = autonomousWorldTransportRepair.renderRepairSnapshot(
    result,
    fixture.merged.admission.identity_receipt,
    { view_mode: "greedy" }
  );

  assert.strictEqual(browser.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.strictEqual(renderer.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.ok(renderer.render_receipt);

  console.log("  OK browser and renderer open only snapshots accepted after repair verification\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 113 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-transport-repair-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(selfMap.declaration["world-transport-repair-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-transport-repair-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.transport-repair-court");
  assert.strictEqual(parsedA.declaration.rule["repair-request-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["repair-payload-is-admission"], false);
  assert.strictEqual(parsedA.declaration.rule["repaired-log-is-admitted-history"], false);
  assert.strictEqual(parsedA.declaration.rule["verification-after-repair-required"], true);
  assert.strictEqual(parsedA.declaration.rule["tampered-repair-payload-accepted"], false);
  assert.ok(String(guards.get("repair-survivable-not-trusted")).includes("survivable without making repair trustworthy"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-transport-repair-court" &&
    triplet.predicate === "section" &&
    triplet.object === "repair-workflow"
  )));
  assert.ok(courts.map(recordId).includes("autonomous-world-transport-repair-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-113-AUTONOMOUS-WORLD-TRANSPORT-REPAIR-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-transport-repair-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_transport_repair.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-transport-repair-courts"]).includes("repair_payload_receipt"));

  console.log("  OK Phase 113 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 113 - Autonomous World Transport Repair Court");
console.log("============================================================\n");

testMissingEventDetectedByReceipt();
testCorruptEvidenceDetected();
testRepairRequestIsDeterministic();
testRepairPayloadRestoresEvidenceShape();
testTamperedRepairPayloadRejects();
testRepairedReplayMatchesFullReplay();
testStoredRepairStatusCannotOpenSnapshots();
testBrowserAndRendererOpenAfterRepairVerification();
testDoctrineAndSelfMap();

console.log("\n============================================================");
console.log("ALL PHASE 113 AUTONOMOUS WORLD TRANSPORT REPAIR TESTS PASSED");
