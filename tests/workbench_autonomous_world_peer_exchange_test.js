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
    branch: "branch.peer"
  };
}

function admitOverlay(base, overlayInputValue) {
  const overlay = autonomousWorldInterjectionOverlay.createOverlay(base, overlayInputValue);
  const candidate = autonomousWorldOverlayAdmission.createCandidateEdit(base, overlay);
  return autonomousWorldOverlayAdmission.admitCandidate(base, candidate);
}

function buildPeerFixture() {
  const base = autonomousWorldBuilder.buildAutonomousWorld();
  const left = admitOverlay(
    base,
    overlayInput("overlay.peer.left", "world.autonomous-fixture/objects/trailer.001", "peer left")
  );
  const right = admitOverlay(
    base,
    overlayInput("overlay.peer.right", "world.autonomous-fixture/interactions/hitch-link.001", "peer right")
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
  return { base, left, right, merged, graph, pkg, peer, registry };
}

function testDeterministicExchangeReceipt() {
  console.log("Testing deterministic peer exchange receipts");

  const fixture = buildPeerFixture();
  const firstOffer = autonomousWorldPeerExchange.offerPackage(fixture.peer, fixture.pkg);
  const secondOffer = autonomousWorldPeerExchange.offerPackage(fixture.peer, fixture.pkg);
  const first = autonomousWorldPeerExchange.receivePackage(fixture.registry, firstOffer, fixture.pkg);
  const second = autonomousWorldPeerExchange.receivePackage(fixture.registry, secondOffer, fixture.pkg);

  assert.strictEqual(first.verification_status, "accepted");
  assert.strictEqual(first.exchange_receipt, second.exchange_receipt);
  assert.strictEqual(first.offered_package_receipt, fixture.pkg.package_receipt);
  assert.strictEqual(first.peer_authority, false);

  console.log("  OK same peer and package produce stable accepted exchange receipt\n");
}

function testDeclaredPeerAcceptsVerifyingPackage() {
  console.log("Testing declared peer offer accepts when package verifies");

  const fixture = buildPeerFixture();
  const offer = autonomousWorldPeerExchange.offerPackage(fixture.peer, fixture.pkg);
  const exchange = autonomousWorldPeerExchange.receivePackage(fixture.registry, offer, fixture.pkg);

  assert.strictEqual(offer.authority, false);
  assert.strictEqual(offer.peer_authority, false);
  assert.strictEqual(exchange.verification_status, "accepted");
  assert.ok(exchange.accepted_snapshot_identities.includes(String(fixture.merged.admission.identity_receipt)));
  assert.strictEqual(exchange.imported.admission.verified, true);
  assert.strictEqual(exchange.imported.admission.sync_package_authority, false);

  console.log("  OK declared peer offer imports only through Phase 106 verification\n");
}

function testUnknownPeerRejects() {
  console.log("Testing unknown peer rejects unless declared");

  const fixture = buildPeerFixture();
  const unknownPeer = autonomousWorldPeerExchange.declarePeer({
    peer_id: "peer.fixture.unknown"
  });
  const offer = autonomousWorldPeerExchange.offerPackage(unknownPeer, fixture.pkg);
  const exchange = autonomousWorldPeerExchange.receivePackage(fixture.registry, offer, fixture.pkg);

  assert.strictEqual(exchange.verification_status, "rejected");
  assert.match(exchange.rejected_reason, /unknown-peer/);
  assert.deepStrictEqual(exchange.accepted_snapshot_identities, []);
  assert.strictEqual(exchange.authority, false);

  console.log("  OK undeclared peer offers do not become admissions\n");
}

function testTamperedPackageRejects() {
  console.log("Testing tampered packages reject through Phase 106 verifier");

  const fixture = buildPeerFixture();
  const offer = autonomousWorldPeerExchange.offerPackage(fixture.peer, fixture.pkg);
  const tampered = clone(fixture.pkg);
  tampered.snapshots[0].admission.source += "\n;; peer tamper";
  const exchange = autonomousWorldPeerExchange.receivePackage(fixture.registry, offer, tampered);

  assert.strictEqual(exchange.verification_status, "rejected");
  assert.match(exchange.rejected_reason, /offered-package-receipt-mismatch|invalid-sync-package-receipt/);
  assert.deepStrictEqual(exchange.accepted_snapshot_identities, []);

  console.log("  OK tampered packages are rejected before local visibility\n");
}

function testMissingPackageReceiptRejects() {
  console.log("Testing missing package receipt rejects");

  const fixture = buildPeerFixture();
  const offer = autonomousWorldPeerExchange.offerPackage(fixture.peer, fixture.pkg);
  offer.offered_package_receipt = null;
  const exchange = autonomousWorldPeerExchange.receivePackage(fixture.registry, offer, fixture.pkg);

  assert.strictEqual(exchange.verification_status, "rejected");
  assert.strictEqual(exchange.rejected_reason, "missing-package-receipt");

  console.log("  OK missing package receipt cannot be accepted\n");
}

function testAcceptedSnapshotsProject() {
  console.log("Testing accepted snapshots open and render after verification");

  const fixture = buildPeerFixture();
  const offer = autonomousWorldPeerExchange.offerPackage(fixture.peer, fixture.pkg);
  const exchange = autonomousWorldPeerExchange.receivePackage(fixture.registry, offer, fixture.pkg);
  const browser = autonomousWorldPeerExchange.openAcceptedSnapshot(exchange, fixture.merged.admission.identity_receipt);
  const renderer = autonomousWorldPeerExchange.renderAcceptedSnapshot(
    exchange,
    fixture.merged.admission.identity_receipt,
    { view_mode: "greedy" }
  );

  assert.strictEqual(browser.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.strictEqual(renderer.identity_receipt, fixture.merged.admission.identity_receipt);
  assert.ok(renderer.render_receipt);

  console.log("  OK browser and renderer project accepted peer snapshots after verification\n");
}

function testDoctrineAndSelfMap() {
  console.log("Testing Phase 107 declaration and OMI self-map references");

  const source = read("declarations/autonomous-world-peer-exchange-protocol.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const protocols = asArray(selfMap.declaration["world-peer-exchange-protocols"].protocol);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-peer-exchange-protocol");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.peer-exchange-protocol");
  assert.strictEqual(parsedA.declaration.rule["peer-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["offer-is-admission"], false);
  assert.strictEqual(parsedA.declaration.rule["transport-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["unknown-peer-accepted"], false);
  assert.ok(String(guards.get("evidence-not-peer-truth")).includes("evidence without becoming evidence"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-peer-exchange-protocol" &&
    triplet.predicate === "section" &&
    triplet.object === "exchange-workflow"
  )));
  assert.ok(protocols.map(recordId).includes("autonomous-world-peer-exchange-protocol"));
  assert.ok(declaredPaths.includes("docs/PHASE-107-AUTONOMOUS-WORLD-PEER-EXCHANGE-PROTOCOL.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-peer-exchange-protocol.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_peer_exchange.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["world-peer-exchange-protocols"]).includes("accepted_snapshot_identities"));

  console.log("  OK Phase 107 parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 107 - Autonomous World Peer Exchange Protocol");
console.log("============================================================\n");

testDeterministicExchangeReceipt();
testDeclaredPeerAcceptsVerifyingPackage();
testUnknownPeerRejects();
testTamperedPackageRejects();
testMissingPackageReceiptRejects();
testAcceptedSnapshotsProject();
testDoctrineAndSelfMap();

console.log("\n============================================================");
console.log("ALL PHASE 107 AUTONOMOUS WORLD PEER EXCHANGE TESTS PASSED");
