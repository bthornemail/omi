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
    branch: "branch.replay"
  };
}

function admitOverlay(base, overlayInputValue) {
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(base, overlayInputValue);
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(base, overlay);
  return autonomousWorldOverlayAdmission.admitCandidate(base, candidate);
}

function buildReplayFixture() {
  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const left = admitOverlay(
    base,
    overlayInput("overlay.replay.left", "world.autonomous-fixture/objects/trailer.001", "replay left")
  );
  const right = admitOverlay(
    base,
    overlayInput("overlay.replay.right", "world.autonomous-fixture/interactions/hitch-link.001", "replay right")
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
    transport: "transport.replay.fixture"
  });
  const peer = autonomousWorldPeerExchange.declarePeer({
    peer_id: "peer.fixture.alice",
    label: "Alice Fixture Peer",
    endpoint: "declared.protocol-only",
    capabilities: ["world.sync.offer"]
  });
  const registry = autonomousWorldPeerExchange.createPeerRegistry([peer]);
  const offer = autonomousWorldPeerExchange.offerPackage(peer, pkg, {
    transport: "transport.replay.fixture"
  });
  const subscription = autonomousWorldSubscriptionCourt.declareSubscription({
    subscription_id: "sub.fixture.transport-replay",
    filters: {
      peer_id: "peer.fixture.alice",
      world_id: "world.autonomous-fixture",
      history_mode: "admitted-only"
    }
  });
  const plan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.replay.file-drop",
    adapter: "file-drop",
    endpoint: "file:///tmp/omi-replay-offers",
    mode: "offer-carrier"
  });
  const event = autonomousWorldLiveTransportAdapter.createTransportEvent(plan, offer, pkg);
  const log = autonomousWorldTransportReplay.createTransportReplayLog({
    log_id: "transport.replay.fixture",
    events: [event]
  });
  return { base, left, right, merged, graph, pkg, peer, registry, offer, subscription, plan, event, log };
}

function testDeterministicReplayLogReceipt() {
  console.log("Testing deterministic transport replay log receipts");

  const fixture = buildReplayFixture();
  const first = autonomousWorldTransportReplay.createTransportReplayLog({
    log_id: "transport.replay.fixture",
    events: [fixture.event]
  });
  const second = autonomousWorldTransportReplay.createTransportReplayLog({
    log_id: "transport.replay.fixture",
    events: [fixture.event]
  });

  assert.strictEqual(first.transport_log_receipt, second.transport_log_receipt);
  assert.strictEqual(first.authority, false);
  assert.strictEqual(first.admission, false);
  assert.strictEqual(first.entries[0].admission, false);

  console.log("  OK same transport events produce stable non-authoritative replay log\n");
}

function testChangedEventChangesReplayLogReceipt() {
  console.log("Testing changed transport event changes replay log receipt");

  const fixture = buildReplayFixture();
  const fifoPlan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.replay.fifo",
    adapter: "fifo",
    endpoint: "/run/omi/world-replay.fifo"
  });
  const changedEvent = autonomousWorldLiveTransportAdapter.createTransportEvent(fifoPlan, fixture.offer, fixture.pkg);
  const first = autonomousWorldTransportReplay.createTransportReplayLog({
    log_id: "transport.replay.fixture",
    events: [fixture.event]
  });
  const second = autonomousWorldTransportReplay.createTransportReplayLog({
    log_id: "transport.replay.fixture",
    events: [changedEvent]
  });

  assert.notStrictEqual(first.transport_log_receipt, second.transport_log_receipt);

  console.log("  OK replay logs witness carrier event changes\n");
}

function testReplayVerifiesAndExposesSnapshots() {
  console.log("Testing replay recomputes verification before exposing snapshots");

  const fixture = buildReplayFixture();
  const replay = autonomousWorldTransportReplay.replayTransportLog(
    fixture.registry,
    fixture.log,
    fixture.subscription
  );

  assert.strictEqual(replay.authority, false);
  assert.strictEqual(replay.admission, false);
  assert.ok(replay.accepted_snapshot_identities.includes(String(fixture.merged.admission.identity_receipt)));
  assert.strictEqual(replay.processing[0].exchange.verification_status, "accepted");
  assert.strictEqual(replay.processing[0].subscription_evaluation.match, true);
  assert.ok(replay.replay_receipt);

  console.log("  OK replay repeats Phase 109/107/106/108 verification instead of trusting the log\n");
}

function testTamperedLogRejectsBeforeReplay() {
  console.log("Testing tampered transport replay log rejects before replay");

  const fixture = buildReplayFixture();
  const tampered = clone(fixture.log);
  tampered.entries[0].transport_event_receipt = 12345;

  assert.throws(() => {
    autonomousWorldTransportReplay.verifyTransportReplayLog(tampered);
  }, /transport-event-receipt-mismatch|transport-log-entry-receipt-mismatch/);
  assert.throws(() => {
    autonomousWorldTransportReplay.replayTransportLog(fixture.registry, tampered, fixture.subscription);
  }, /transport-event-receipt-mismatch|transport-log-entry-receipt-mismatch/);

  console.log("  OK log tampering is caught before carrier evidence is replayed\n");
}

function testTamperedPackageStillRejectsOnReplay() {
  console.log("Testing tampered package still rejects during replay");

  const fixture = buildReplayFixture();
  const tamperedPackage = clone(fixture.pkg);
  tamperedPackage.snapshots[0].admission.source += "\n;; replay tamper";
  const tamperedEvent = autonomousWorldLiveTransportAdapter.createTransportEvent(fixture.plan, fixture.offer, tamperedPackage);
  const log = autonomousWorldTransportReplay.createTransportReplayLog({
    log_id: "transport.replay.tampered-package",
    events: [tamperedEvent]
  });
  const replay = autonomousWorldTransportReplay.replayTransportLog(
    fixture.registry,
    log,
    fixture.subscription
  );

  assert.strictEqual(replay.processing[0].exchange.verification_status, "rejected");
  assert.strictEqual(replay.processing[0].subscription_evaluation.match, false);
  assert.deepStrictEqual(replay.accepted_snapshot_identities, []);

  console.log("  OK replayed transport events still reject invalid package evidence\n");
}

function testUnmatchedReplayStaysIgnored() {
  console.log("Testing unmatched replayed transport event remains ignored");

  const fixture = buildReplayFixture();
  const unmatched = autonomousWorldSubscriptionCourt.declareSubscription({
    subscription_id: "sub.fixture.transport-replay-unmatched",
    filters: {
      peer_id: "peer.fixture.bob",
      world_id: "world.autonomous-fixture",
      history_mode: "admitted-only"
    }
  });
  const replay = autonomousWorldTransportReplay.replayTransportLog(
    fixture.registry,
    fixture.log,
    unmatched
  );

  assert.strictEqual(replay.processing[0].exchange.verification_status, "accepted");
  assert.strictEqual(replay.processing[0].subscription_evaluation.match, false);
  assert.deepStrictEqual(replay.accepted_snapshot_identities, []);
  assert.throws(() => {
    autonomousWorldTransportReplay.openReplayedSnapshot(replay, fixture.merged.admission.identity_receipt);
  }, /snapshot-not-admitted-by-replay/);

  console.log("  OK replayed valid events remain invisible when subscription filters do not match\n");
}

function testBrowserAndRendererOpenReplayedSnapshots() {
  console.log("Testing browser and renderer open replayed verified snapshots");

  const fixture = buildReplayFixture();
  const replay = autonomousWorldTransportReplay.replayTransportLog(
    fixture.registry,
    fixture.log,
    fixture.subscription
  );
  const browser = autonomousWorldTransportReplay.openReplayedSnapshot(
    replay,
    fixture.merged.admission.identity_receipt
  );
  const renderer = autonomousWorldTransportReplay.renderReplayedSnapshot(
    replay,
    fixture.merged.admission.identity_receipt,
    { view_mode: "greedy" }
  );

  assert.strictEqual(browser.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.strictEqual(renderer.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.ok(renderer.render_receipt);

  console.log("  OK replayed verified snapshots are projectable without mutating authority\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 110 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-transport-replay-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(selfMap.declaration["world-transport-replay-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-transport-replay-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.transport-replay-court");
  assert.strictEqual(parsedA.declaration.rule["transport-log-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["replay-entry-is-admission"], false);
  assert.strictEqual(parsedA.declaration.rule["stored-processing-is-trusted"], false);
  assert.strictEqual(parsedA.declaration.rule["replay-recomputes-verification"], true);
  assert.strictEqual(parsedA.declaration.rule["live-network-runtime-added"], false);
  assert.ok(String(guards.get("offers-not-admissions")).includes("only receipt verification can replay admission"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-transport-replay-court" &&
    triplet.predicate === "section" &&
    triplet.object === "replay-workflow"
  )));
  assert.ok(courts.map(recordId).includes("autonomous-world-transport-replay-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-110-AUTONOMOUS-WORLD-TRANSPORT-REPLAY-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-transport-replay-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_transport_replay.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-transport-replay-courts"]).includes("replay_entry_receipt"));

  console.log("  OK Phase 110 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 110 - Autonomous World Transport Replay Court");
console.log("============================================================\n");

testDeterministicReplayLogReceipt();
testChangedEventChangesReplayLogReceipt();
testReplayVerifiesAndExposesSnapshots();
testTamperedLogRejectsBeforeReplay();
testTamperedPackageStillRejectsOnReplay();
testUnmatchedReplayStaysIgnored();
testBrowserAndRendererOpenReplayedSnapshots();
testDoctrineAndSelfMap();

console.log("\n============================================================");
console.log("ALL PHASE 110 AUTONOMOUS WORLD TRANSPORT REPLAY TESTS PASSED");
