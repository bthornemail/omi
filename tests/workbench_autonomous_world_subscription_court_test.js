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
    branch: "branch.subscription"
  };
}

function admitOverlay(base, overlayInputValue) {
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(base, overlayInputValue);
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(base, overlay);
  return autonomousWorldOverlayAdmission.admitCandidate(base, candidate);
}

function buildSubscriptionFixture() {
  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const left = admitOverlay(
    base,
    overlayInput("overlay.subscription.left", "world.autonomous-fixture/objects/trailer.001", "subscription left")
  );
  const right = admitOverlay(
    base,
    overlayInput("overlay.subscription.right", "world.autonomous-fixture/interactions/hitch-link.001", "subscription right")
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
    transport: "protocol.fixture"
  });
  const peer = autonomousWorldPeerExchange.declarePeer({
    peer_id: "peer.fixture.alice",
    label: "Alice Fixture Peer",
    endpoint: "declared.protocol-only",
    capabilities: ["world.sync.offer"]
  });
  const registry = autonomousWorldPeerExchange.createPeerRegistry([peer]);
  const offer = autonomousWorldPeerExchange.offerPackage(peer, pkg);
  const exchange = autonomousWorldPeerExchange.receivePackage(registry, offer, pkg);
  return { base, left, right, merged, graph, pkg, peer, registry, offer, exchange };
}

function subscriptionInput(overrides) {
  return Object.assign({
    subscription_id: "sub.fixture.world-history",
    filters: {
      peer_id: "peer.fixture.alice",
      world_id: "world.autonomous-fixture",
      history_mode: "admitted-only"
    }
  }, overrides || {});
}

function testDeterministicSubscriptionReceipt() {
  console.log("Testing deterministic subscription receipts");

  const first = autonomousWorldSubscriptionCourt.declareSubscription(subscriptionInput());
  const second = autonomousWorldSubscriptionCourt.declareSubscription(subscriptionInput());

  assert.strictEqual(first.subscription_receipt, second.subscription_receipt);
  assert.strictEqual(first.authority, false);
  assert.strictEqual(first.filters.peer_id, "peer.fixture.alice");

  console.log("  OK same subscription declaration produces stable non-authoritative receipt\n");
}

function testChangedFilterChangesReceipt() {
  console.log("Testing changed filters change subscription receipt");

  const first = autonomousWorldSubscriptionCourt.declareSubscription(subscriptionInput());
  const second = autonomousWorldSubscriptionCourt.declareSubscription(subscriptionInput({
    filters: {
      peer_id: "peer.fixture.alice",
      world_id: "world.other",
      history_mode: "admitted-only"
    }
  }));

  assert.notStrictEqual(first.subscription_receipt, second.subscription_receipt);

  console.log("  OK filter changes are witnessed by subscription receipt changes\n");
}

function testMatchingExchangeExposesSnapshots() {
  console.log("Testing matching valid exchange exposes snapshots after verification");

  const fixture = buildSubscriptionFixture();
  const sub = autonomousWorldSubscriptionCourt.declareSubscription(subscriptionInput());
  const evaluation = autonomousWorldSubscriptionCourt.evaluateSubscription(sub, fixture.exchange);

  assert.strictEqual(evaluation.match, true);
  assert.strictEqual(evaluation.action, "request-package-evidence");
  assert.strictEqual(evaluation.authority, false);
  assert.ok(evaluation.matched_exchange_receipts.includes(fixture.exchange.exchange_receipt));
  assert.ok(evaluation.admitted_snapshot_identities.includes(String(fixture.merged.admission.identity_receipt)));

  console.log("  OK matching accepted exchange becomes visible only after peer/package verification\n");
}

function testUnmatchedExchangeIgnored() {
  console.log("Testing unmatched valid exchange stays ignored");

  const fixture = buildSubscriptionFixture();
  const sub = autonomousWorldSubscriptionCourt.declareSubscription(subscriptionInput({
    filters: {
      peer_id: "peer.fixture.bob",
      world_id: "world.autonomous-fixture",
      history_mode: "admitted-only"
    }
  }));
  const evaluation = autonomousWorldSubscriptionCourt.evaluateSubscription(sub, fixture.exchange);

  assert.strictEqual(evaluation.match, false);
  assert.strictEqual(evaluation.action, "ignore");
  assert.deepStrictEqual(evaluation.admitted_snapshot_identities, []);
  assert.throws(() => {
    autonomousWorldSubscriptionCourt.openSubscribedSnapshot(evaluation, fixture.exchange, fixture.merged.admission.identity_receipt);
  }, /subscription-not-matched/);

  console.log("  OK valid but unmatched exchanges remain non-admitted for the subscription\n");
}

function testMatchedTamperedPackageRejects() {
  console.log("Testing matched tampered package rejects");

  const fixture = buildSubscriptionFixture();
  const tampered = clone(fixture.pkg);
  tampered.snapshots[0].admission.source += "\n;; subscription tamper";
  const tamperedExchange = autonomousWorldPeerExchange.receivePackage(fixture.registry, fixture.offer, tampered);
  const sub = autonomousWorldSubscriptionCourt.declareSubscription(subscriptionInput());
  const evaluation = autonomousWorldSubscriptionCourt.evaluateSubscription(sub, tamperedExchange);

  assert.strictEqual(tamperedExchange.verification_status, "rejected");
  assert.strictEqual(evaluation.match, false);
  assert.deepStrictEqual(evaluation.admitted_snapshot_identities, []);

  console.log("  OK matching filters do not rescue rejected package evidence\n");
}

function testUnknownFiltersDoNotAutoAdmit() {
  console.log("Testing unknown peer/world/history filters do not auto-admit");

  const fixture = buildSubscriptionFixture();
  const unknownPeer = autonomousWorldSubscriptionCourt.evaluateSubscription(
    autonomousWorldSubscriptionCourt.declareSubscription(subscriptionInput({
      filters: { peer_id: "peer.unknown", world_id: "world.autonomous-fixture", history_mode: "admitted-only" }
    })),
    fixture.exchange
  );
  const unknownWorld = autonomousWorldSubscriptionCourt.evaluateSubscription(
    autonomousWorldSubscriptionCourt.declareSubscription(subscriptionInput({
      filters: { peer_id: "peer.fixture.alice", world_id: "world.unknown", history_mode: "admitted-only" }
    })),
    fixture.exchange
  );
  const unknownHistory = autonomousWorldSubscriptionCourt.evaluateSubscription(
    autonomousWorldSubscriptionCourt.declareSubscription(subscriptionInput({
      filters: { peer_id: "peer.fixture.alice", world_id: "world.autonomous-fixture", history_mode: "unknown-mode" }
    })),
    fixture.exchange
  );

  assert.strictEqual(unknownPeer.match, false);
  assert.strictEqual(unknownWorld.match, false);
  assert.strictEqual(unknownHistory.match, false);

  console.log("  OK unknown filters express interest without creating trust or admission\n");
}

function testEvaluationReceiptAndProjection() {
  console.log("Testing evaluation receipts and accepted projections");

  const fixture = buildSubscriptionFixture();
  const sub = autonomousWorldSubscriptionCourt.declareSubscription(subscriptionInput());
  const first = autonomousWorldSubscriptionCourt.evaluateSubscription(sub, fixture.exchange);
  const second = autonomousWorldSubscriptionCourt.evaluateSubscription(sub, fixture.exchange);
  const browser = autonomousWorldSubscriptionCourt.openSubscribedSnapshot(first, fixture.exchange, fixture.merged.admission.identity_receipt);
  const renderer = autonomousWorldSubscriptionCourt.renderSubscribedSnapshot(
    first,
    fixture.exchange,
    fixture.merged.admission.identity_receipt,
    { view_mode: "greedy" }
  );

  assert.strictEqual(first.evaluation_receipt, second.evaluation_receipt);
  assert.notStrictEqual(first.evaluation_receipt, sub.subscription_receipt);
  assert.strictEqual(browser.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.strictEqual(renderer.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.ok(renderer.render_receipt);

  console.log("  OK filter evaluation changes subscription evidence without changing imported identities\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 108 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-pubsub-subscription-court.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(selfMap.declaration["world-subscription-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-pubsub-subscription-court");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.pubsub-subscription-court");
  assert.strictEqual(parsedA.declaration.rule["subscription-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["filter-match-is-admission"], false);
  assert.strictEqual(parsedA.declaration.rule["stream-interest-is-trust"], false);
  assert.strictEqual(parsedA.declaration.rule["live-pubsub-runtime-added"], false);
  assert.ok(String(guards.get("history-wanted-not-trusted")).includes("without trusting the stream"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-pubsub-subscription-court" &&
    triplet.predicate === "section" &&
    triplet.object === "subscription-workflow"
  )));
  assert.ok(courts.map(recordId).includes("autonomous-world-pubsub-subscription-court"));
  assert.ok(declaredPaths.includes("docs/PHASE-108-AUTONOMOUS-WORLD-PUBSUB-SUBSCRIPTION-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-pubsub-subscription-court.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_subscription_court.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-subscription-courts"]).includes("matched_exchange_receipts"));

  console.log("  OK Phase 108 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 108 - Autonomous World Pub/Sub Subscription Court");
console.log("================================================================\n");

testDeterministicSubscriptionReceipt();
testChangedFilterChangesReceipt();
testMatchingExchangeExposesSnapshots();
testUnmatchedExchangeIgnored();
testMatchedTamperedPackageRejects();
testUnknownFiltersDoNotAutoAdmit();
testEvaluationReceiptAndProjection();
testDoctrineAndSelfMap();

console.log("\n================================================================");
console.log("ALL PHASE 108 AUTONOMOUS WORLD SUBSCRIPTION COURT TESTS PASSED");
