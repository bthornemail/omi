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
    branch: "branch.compaction"
  };
}

function admitOverlay(base, overlayInputValue) {
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(base, overlayInputValue);
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(base, overlay);
  return autonomousWorldOverlayAdmission.admitCandidate(base, candidate);
}

function buildCompactionFixture() {
  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const left = admitOverlay(
    base,
    overlayInput("overlay.compaction.left", "world.autonomous-fixture/objects/trailer.001", "compaction left")
  );
  const right = admitOverlay(
    base,
    overlayInput("overlay.compaction.right", "world.autonomous-fixture/interactions/hitch-link.001", "compaction right")
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
    transport: "transport.compaction.fixture"
  });
  const peer = autonomousWorldPeerExchange.declarePeer({
    peer_id: "peer.fixture.alice",
    label: "Alice Fixture Peer",
    endpoint: "declared.protocol-only",
    capabilities: ["world.sync.offer"]
  });
  const registry = autonomousWorldPeerExchange.createPeerRegistry([peer]);
  const offer = autonomousWorldPeerExchange.offerPackage(peer, pkg, {
    transport: "transport.compaction.fixture"
  });
  const subscription = autonomousWorldSubscriptionCourt.declareSubscription({
    subscription_id: "sub.fixture.transport-compaction",
    filters: {
      peer_id: "peer.fixture.alice",
      world_id: "world.autonomous-fixture",
      history_mode: "admitted-only"
    }
  });
  const filePlan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.compaction.file-drop",
    adapter: "file-drop",
    endpoint: "file:///tmp/omi-compaction-offers"
  });
  const fifoPlan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.compaction.fifo",
    adapter: "fifo",
    endpoint: "/run/omi/compaction-offers.fifo"
  });
  const eventA = autonomousWorldLiveTransportAdapter.createTransportEvent(filePlan, offer, pkg);
  const eventB = autonomousWorldLiveTransportAdapter.createTransportEvent(fifoPlan, offer, pkg);
  const log = autonomousWorldTransportReplay.createTransportReplayLog({
    log_id: "transport.compaction.fixture",
    events: [eventA, eventB]
  });
  const replay = autonomousWorldTransportReplay.replayTransportLog(registry, log, subscription);
  const checkpoint = autonomousWorldTransportCheckpoint.createTransportCheckpoint(log, replay, {
    checkpoint_id: "checkpoint.compaction.0",
    boundary_order: 0
  });
  const compaction = autonomousWorldTransportCompaction.createTransportCompaction(log, replay, checkpoint, {
    compaction_id: "compaction.fixture.0",
    to_order: 0
  });
  return { base, left, right, merged, graph, pkg, peer, registry, offer, subscription, filePlan, fifoPlan, eventA, eventB, log, replay, checkpoint, compaction };
}

function testDeterministicCompactionReceipt() {
  console.log("Testing deterministic transport compaction receipts");

  const fixture = buildCompactionFixture();
  const first = autonomousWorldTransportCompaction.createTransportCompaction(fixture.log, fixture.replay, fixture.checkpoint, {
    compaction_id: "compaction.fixture.0",
    to_order: 0
  });
  const second = autonomousWorldTransportCompaction.createTransportCompaction(fixture.log, fixture.replay, fixture.checkpoint, {
    compaction_id: "compaction.fixture.0",
    to_order: 0
  });

  assert.strictEqual(first.compaction_receipt, second.compaction_receipt);
  assert.strictEqual(first.authority, false);
  assert.strictEqual(first.admission, false);

  console.log("  OK same replay evidence and boundary produce stable non-authoritative compaction\n");
}

function testCompactionRetainsRequiredReceipts() {
  console.log("Testing compaction retains receipts needed to verify history");

  const fixture = buildCompactionFixture();

  assert.strictEqual(fixture.compaction.log_from_receipt, fixture.log.entries[0].replay_entry_receipt);
  assert.strictEqual(fixture.compaction.log_to_receipt, fixture.log.entries[0].replay_entry_receipt);
  assert.strictEqual(fixture.compaction.checkpoint_receipt, fixture.checkpoint.checkpoint_receipt);
  assert.ok(fixture.compaction.replay_entry_receipts.includes(fixture.log.entries[0].replay_entry_receipt));
  assert.ok(fixture.compaction.transport_event_receipts.includes(fixture.eventA.transport_event_receipt));
  assert.ok(fixture.compaction.retained_evidence_receipts.includes(fixture.replay.processing[0].processing_receipt));
  assert.ok(fixture.compaction.accepted_snapshot_identities.includes(String(fixture.merged.admission.identity_receipt)));

  console.log("  OK compacted bundles reduce shape while retaining verification receipts\n");
}

function testTamperedLogRejectsBeforeCompaction() {
  console.log("Testing tampered log rejects before compaction or resume");

  const fixture = buildCompactionFixture();
  const tampered = clone(fixture.log);
  tampered.entries[0].transport_event_receipt = 77;

  assert.throws(() => {
    autonomousWorldTransportCompaction.createTransportCompaction(tampered, fixture.replay, fixture.checkpoint, {
      compaction_id: "compaction.fixture.tampered-log",
      to_order: 0
    });
  }, /transport-event-receipt-mismatch|transport-log-entry-receipt-mismatch/);
  assert.throws(() => {
    autonomousWorldTransportCompaction.resumeAfterCompaction(
      fixture.registry,
      tampered,
      fixture.compaction,
      fixture.checkpoint,
      fixture.subscription
    );
  }, /transport-event-receipt-mismatch|transport-log-entry-receipt-mismatch/);

  console.log("  OK tampered logs cannot be compacted or resumed\n");
}

function testTamperedCompactionRejects() {
  console.log("Testing tampered compaction bundle rejects");

  const fixture = buildCompactionFixture();
  const tampered = clone(fixture.compaction);
  tampered.retained_evidence_receipts.push(999);

  assert.throws(() => {
    autonomousWorldTransportCompaction.verifyTransportCompaction(tampered, fixture.log);
  }, /compaction-receipt-mismatch/);
  assert.throws(() => {
    autonomousWorldTransportCompaction.resumeAfterCompaction(
      fixture.registry,
      fixture.log,
      tampered,
      fixture.checkpoint,
      fixture.subscription
    );
  }, /compaction-receipt-mismatch/);

  console.log("  OK compaction bundles cannot be modified without receipt failure\n");
}

function testResumeAfterCompactionMatchesFullReplay() {
  console.log("Testing compaction resume matches full replay accepted identities");

  const fixture = buildCompactionFixture();
  const resume = autonomousWorldTransportCompaction.resumeAfterCompaction(
    fixture.registry,
    fixture.log,
    fixture.compaction,
    fixture.checkpoint,
    fixture.subscription
  );

  assert.strictEqual(resume.authority, false);
  assert.strictEqual(resume.admission, false);
  assert.strictEqual(resume.verification_recomputed, true);
  assert.deepStrictEqual(resume.accepted_snapshot_identities, fixture.replay.accepted_snapshot_identities);
  assert.ok(resume.compaction_resume_receipt);

  console.log("  OK compacted evidence resumes to the same verified identities as full replay\n");
}

function testCompactionAloneCannotAdmit() {
  console.log("Testing compaction bundle alone cannot admit snapshots");

  const fixture = buildCompactionFixture();

  assert.throws(() => {
    autonomousWorldTransportCompaction.openCompactionSnapshot(
      fixture.compaction,
      fixture.merged.admission.identity_receipt
    );
  }, /compaction-not-admission/);

  console.log("  OK compacted evidence cannot directly open admitted world projections\n");
}

function testBrowserAndRendererOpenCompactionResumeSnapshots() {
  console.log("Testing browser and renderer open compaction-resumed verified snapshots");

  const fixture = buildCompactionFixture();
  const resume = autonomousWorldTransportCompaction.resumeAfterCompaction(
    fixture.registry,
    fixture.log,
    fixture.compaction,
    fixture.checkpoint,
    fixture.subscription
  );
  const browser = autonomousWorldTransportCompaction.openCompactionResumeSnapshot(
    resume,
    fixture.merged.admission.identity_receipt
  );
  const renderer = autonomousWorldTransportCompaction.renderCompactionResumeSnapshot(
    resume,
    fixture.merged.admission.identity_receipt,
    { view_mode: "greedy" }
  );

  assert.strictEqual(browser.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.strictEqual(renderer.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.ok(renderer.render_receipt);

  console.log("  OK browser and renderer open only snapshots accepted after compaction resume\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 112 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-transport-compaction-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(selfMap.declaration["world-transport-compaction-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-transport-compaction-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.transport-compaction-court");
  assert.strictEqual(parsedA.declaration.rule["compaction-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["compaction-bundle-is-admission"], false);
  assert.strictEqual(parsedA.declaration.rule["compaction-erases-required-receipts"], false);
  assert.strictEqual(parsedA.declaration.rule["resume-recomputes-verification"], true);
  assert.strictEqual(parsedA.declaration.rule["stored-accepted-status-admits"], false);
  assert.ok(String(guards.get("receipts-not-erased")).includes("cannot erase the receipts needed to verify history"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-transport-compaction-court" &&
    triplet.predicate === "section" &&
    triplet.object === "compaction-workflow"
  )));
  assert.ok(courts.map(recordId).includes("autonomous-world-transport-compaction-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-112-AUTONOMOUS-WORLD-TRANSPORT-COMPACTION-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-transport-compaction-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_transport_compaction.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-transport-compaction-courts"]).includes("compaction_receipt"));

  console.log("  OK Phase 112 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 112 - Autonomous World Transport Compaction Court");
console.log("================================================================\n");

testDeterministicCompactionReceipt();
testCompactionRetainsRequiredReceipts();
testTamperedLogRejectsBeforeCompaction();
testTamperedCompactionRejects();
testResumeAfterCompactionMatchesFullReplay();
testCompactionAloneCannotAdmit();
testBrowserAndRendererOpenCompactionResumeSnapshots();
testDoctrineAndSelfMap();

console.log("\n================================================================");
console.log("ALL PHASE 112 AUTONOMOUS WORLD TRANSPORT COMPACTION TESTS PASSED");
