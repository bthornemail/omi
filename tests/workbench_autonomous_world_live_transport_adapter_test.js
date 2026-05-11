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
    branch: "branch.transport"
  };
}

function admitOverlay(base, overlayInputValue) {
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(base, overlayInputValue);
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(base, overlay);
  return autonomousWorldOverlayAdmission.admitCandidate(base, candidate);
}

function buildTransportFixture() {
  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const left = admitOverlay(
    base,
    overlayInput("overlay.transport.left", "world.autonomous-fixture/objects/trailer.001", "transport left")
  );
  const right = admitOverlay(
    base,
    overlayInput("overlay.transport.right", "world.autonomous-fixture/interactions/hitch-link.001", "transport right")
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
    transport: "transport.fixture"
  });
  const peer = autonomousWorldPeerExchange.declarePeer({
    peer_id: "peer.fixture.alice",
    label: "Alice Fixture Peer",
    endpoint: "declared.protocol-only",
    capabilities: ["world.sync.offer"]
  });
  const registry = autonomousWorldPeerExchange.createPeerRegistry([peer]);
  const offer = autonomousWorldPeerExchange.offerPackage(peer, pkg, {
    transport: "transport.fixture"
  });
  const subscription = autonomousWorldSubscriptionCourt.declareSubscription({
    subscription_id: "sub.fixture.transport-world-history",
    filters: {
      peer_id: "peer.fixture.alice",
      world_id: "world.autonomous-fixture",
      history_mode: "admitted-only"
    }
  });
  const plan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.fixture.file-drop",
    adapter: "file-drop",
    endpoint: "file:///tmp/omi-offers",
    mode: "offer-carrier"
  });
  const event = autonomousWorldLiveTransportAdapter.createTransportEvent(plan, offer, pkg);
  return { base, left, right, merged, graph, pkg, peer, registry, offer, subscription, plan, event };
}

function testDeterministicTransportEventReceipt() {
  console.log("Testing deterministic transport event receipts");

  const fixture = buildTransportFixture();
  const first = autonomousWorldLiveTransportAdapter.createTransportEvent(fixture.plan, fixture.offer, fixture.pkg);
  const second = autonomousWorldLiveTransportAdapter.createTransportEvent(fixture.plan, fixture.offer, fixture.pkg);

  assert.strictEqual(first.transport_event_receipt, second.transport_event_receipt);
  assert.strictEqual(first.authority, false);
  assert.strictEqual(first.admission, false);
  assert.strictEqual(first.transport_plan.authority, false);

  console.log("  OK same offer plus same plan produces stable non-authoritative event receipt\n");
}

function testChangedTransportPlanChangesEventReceipt() {
  console.log("Testing changed transport plan changes event receipt");

  const fixture = buildTransportFixture();
  const fifoPlan = autonomousWorldLiveTransportAdapter.declareTransportPlan({
    plan_id: "transport.fixture.fifo",
    adapter: "fifo",
    endpoint: "/run/omi/world-offers.fifo"
  });
  const first = autonomousWorldLiveTransportAdapter.createTransportEvent(fixture.plan, fixture.offer, fixture.pkg);
  const second = autonomousWorldLiveTransportAdapter.createTransportEvent(fifoPlan, fixture.offer, fixture.pkg);

  assert.notStrictEqual(first.transport_event_receipt, second.transport_event_receipt);

  console.log("  OK carrier surface changes are witnessed by transport event receipt changes\n");
}

function testTransportPlansAreNonAuthoritative() {
  console.log("Testing declared transport plans are non-authoritative");

  const expected = ["file-drop", "fifo", "unix-socket", "tcp", "udp", "websocket", "http-poll", "barcode-scan"];
  assert.deepStrictEqual(autonomousWorldLiveTransportAdapter.listTransportAdapters(), expected);
  expected.forEach((adapter) => {
    const plan = autonomousWorldLiveTransportAdapter.declareTransportPlan({ adapter });
    assert.strictEqual(plan.authority, false);
    assert.strictEqual(plan.opens_live_resource, false);
    assert.ok(plan.transport_plan_receipt);
  });
  assert.throws(() => autonomousWorldLiveTransportAdapter.declareTransportPlan({ adapter: "ssh-daemon" }), /unknown-transport-adapter/);

  console.log("  OK Phase 109 names carrier surfaces without opening or trusting them\n");
}

function testValidEventRequiresVerification() {
  console.log("Testing valid transport event still requires peer/package verification");

  const fixture = buildTransportFixture();
  const processing = autonomousWorldLiveTransportAdapter.processTransportEvent(
    fixture.registry,
    fixture.event,
    fixture.subscription
  );

  assert.strictEqual(processing.authority, false);
  assert.strictEqual(processing.exchange.verification_status, "accepted");
  assert.strictEqual(processing.subscription_evaluation.match, true);
  assert.ok(processing.accepted_snapshot_identities.includes(String(fixture.merged.admission.identity_receipt)));
  assert.ok(processing.processing_receipt);

  console.log("  OK transport success is handed to Phase 107/106 verification before visibility\n");
}

function testTamperedPackageOverValidTransportRejects() {
  console.log("Testing tampered package over valid transport rejects");

  const fixture = buildTransportFixture();
  const tampered = clone(fixture.pkg);
  tampered.snapshots[0].admission.source += "\n;; transport tamper";
  const tamperedEvent = autonomousWorldLiveTransportAdapter.createTransportEvent(fixture.plan, fixture.offer, tampered);
  const processing = autonomousWorldLiveTransportAdapter.processTransportEvent(
    fixture.registry,
    tamperedEvent,
    fixture.subscription
  );

  assert.strictEqual(processing.exchange.verification_status, "rejected");
  assert.strictEqual(processing.subscription_evaluation.match, false);
  assert.deepStrictEqual(processing.accepted_snapshot_identities, []);

  console.log("  OK valid carrier labels do not rescue invalid package evidence\n");
}

function testUnmatchedValidTransportEventIgnored() {
  console.log("Testing unmatched valid transport event remains ignored");

  const fixture = buildTransportFixture();
  const unmatched = autonomousWorldSubscriptionCourt.declareSubscription({
    subscription_id: "sub.fixture.transport-unmatched",
    filters: {
      peer_id: "peer.fixture.bob",
      world_id: "world.autonomous-fixture",
      history_mode: "admitted-only"
    }
  });
  const processing = autonomousWorldLiveTransportAdapter.processTransportEvent(
    fixture.registry,
    fixture.event,
    unmatched
  );

  assert.strictEqual(processing.exchange.verification_status, "accepted");
  assert.strictEqual(processing.subscription_evaluation.match, false);
  assert.deepStrictEqual(processing.accepted_snapshot_identities, []);
  assert.throws(() => {
    autonomousWorldLiveTransportAdapter.openTransportSnapshot(
      processing,
      fixture.merged.admission.identity_receipt
    );
  }, /subscription-not-matched/);

  console.log("  OK valid transport events remain invisible when subscription filters do not match\n");
}

function testMatchedVerifiedEventExposesSnapshots() {
  console.log("Testing matched verified transport event exposes browser and renderer projections");

  const fixture = buildTransportFixture();
  const processing = autonomousWorldLiveTransportAdapter.processTransportEvent(
    fixture.registry,
    fixture.event,
    fixture.subscription
  );
  const browser = autonomousWorldLiveTransportAdapter.openTransportSnapshot(
    processing,
    fixture.merged.admission.identity_receipt
  );
  const renderer = autonomousWorldLiveTransportAdapter.renderTransportSnapshot(
    processing,
    fixture.merged.admission.identity_receipt,
    { view_mode: "greedy" }
  );

  assert.strictEqual(browser.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.strictEqual(renderer.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.ok(renderer.render_receipt);

  console.log("  OK browser and renderer only open verified accepted transport snapshots\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 109 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-live-transport-adapter-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(selfMap.declaration["world-live-transport-adapter-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-live-transport-adapter-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.live-transport-adapter-court");
  assert.strictEqual(parsedA.declaration.rule["transport-plan-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["transport-event-is-admission"], false);
  assert.strictEqual(parsedA.declaration.rule["transport-success-is-receipt-validity"], false);
  assert.strictEqual(parsedA.declaration.rule["live-daemon-added"], false);
  assert.ok(String(guards.get("carrier-not-trust")).includes("carrier surface"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-live-transport-adapter-court" &&
    triplet.predicate === "section" &&
    triplet.object === "transport-workflow"
  )));
  assert.ok(courts.map(recordId).includes("autonomous-world-live-transport-adapter-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-109-AUTONOMOUS-WORLD-LIVE-TRANSPORT-ADAPTER-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-live-transport-adapter-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_live_transport_adapter.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-live-transport-adapter-courts"]).includes("transport_event_receipt"));

  console.log("  OK Phase 109 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 109 - Autonomous World Live Transport Adapter Court");
console.log("=================================================================\n");

testDeterministicTransportEventReceipt();
testChangedTransportPlanChangesEventReceipt();
testTransportPlansAreNonAuthoritative();
testValidEventRequiresVerification();
testTamperedPackageOverValidTransportRejects();
testUnmatchedValidTransportEventIgnored();
testMatchedVerifiedEventExposesSnapshots();
testDoctrineAndSelfMap();

console.log("\n=================================================================");
console.log("ALL PHASE 109 AUTONOMOUS WORLD LIVE TRANSPORT ADAPTER TESTS PASSED");
