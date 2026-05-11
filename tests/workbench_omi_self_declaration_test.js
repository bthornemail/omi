const assert = require("assert");
const fs = require("fs");
const path = require("path");

const omilispDeclaration = require("../workbench/src/omilisp_declaration.js");
const spomAdapter = require("../workbench/src/spom_adapter.js");

const repoRoot = path.join(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function names(records) {
  return asArray(records).map((record) => record.sid || record.name || record.value);
}

function testSelfDeclarationParses() {
  console.log("Testing OMI self-map declaration parse");

  const source = read("declarations/omi-system.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.root, "omi");
  assert.strictEqual(parsedA.declaration.identity.sid, "omi-system");
  assert.strictEqual(parsedA.declaration.identity.kind, "constitutional.self-map");
  assert.strictEqual(parsedA.declaration.address.addr, "omi-system.self");
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);

  const sectionOrder = parsedA.sections.map((section) => section.name);
  assert.deepStrictEqual(sectionOrder, [
    "identity",
    "address",
    "scope",
    "causal-ladder",
    "byte-strata",
    "constitutional-laws",
    "segmentation-planes",
    "semantic-projection",
    "message-roles",
    "receipt-roles",
    "derived-geometries",
    "derived-algebras",
    "runtime-resolvers",
    "runtime-manifests",
    "adapter-registries",
    "integration-audits",
    "receipt-courts",
    "observer-resolvers",
    "semantic-grounding-adapters",
    "transmutator-courts",
    "annotation-lattices",
    "blackboard-pairing-doctrines",
    "closure-coding-courts",
    "world-builder-models",
    "world-browser-courts",
    "world-renderer-courts",
    "world-interjection-overlays",
    "world-overlay-admission-courts",
    "world-version-history-courts",
    "world-merge-reconciliation-courts",
    "world-package-sync-courts",
    "world-peer-exchange-protocols",
    "world-subscription-courts",
    "world-live-transport-adapter-courts",
    "world-transport-replay-courts",
    "world-transport-checkpoint-courts",
    "surfaces",
    "projections",
    "receipts"
  ]);

  assert.deepStrictEqual(names(parsedA.declaration["causal-ladder"].steps), [
    "canonical-bytes",
    "admissible-segmentation",
    "declared-structure",
    "gauge-law",
    "propagation",
    "projection",
    "receipts",
    "presentation"
  ]);
  assert.deepStrictEqual(names(parsedA.declaration["segmentation-planes"].planes), ["FS", "GS", "RS", "US"]);

  console.log("  OK self-map parses deterministically with stable declaration identity\n");
}

function testSelfDeclarationProjections() {
  console.log("Testing OMI self-map projection receipts");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const lazy = omilispDeclaration.projectDeclaration(parsed, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsed, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsed, "static");
  const animated = omilispDeclaration.projectDeclaration(parsed, "animated");

  assert.strictEqual(lazy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(lazy.sealed_address, "omi-system.self");
  assert.strictEqual(greedy.chart.kind, "constitutional.self-map");
  assert.strictEqual(greedy.chart.section_count, parsed.sections.length);
  assert.ok(staticView.declared_space.section_order.includes("constitutional-laws"));
  assert.strictEqual(animated.timeline.frame_count, 5040);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);

  console.log("  OK lazy/greedy/static/animated projections preserve identity and separate view receipts\n");
}

function testSelfDeclarationTriangulation() {
  console.log("Testing OMI self-map S-P-O-M triangulation");

  const source = read("declarations/omi-system.omilisp");
  const declaration = omilispDeclaration.parseDeclaration(source);
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);
  const lazy = spomAdapter.projectTriangulation(triangulationA, "lazy");
  const greedy = spomAdapter.projectTriangulation(triangulationA, "greedy");
  const staticView = spomAdapter.projectTriangulation(triangulationA, "static");
  const animated = spomAdapter.projectTriangulation(triangulationA, "animated");

  assert.strictEqual(triangulationA.source_kind, "omilisp");
  assert.strictEqual(triangulationA.root, "omi-system");
  assert.strictEqual(triangulationA.scope, "constitutional.self-map");
  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.notStrictEqual(triangulationA.identity_receipt, declaration.identity_receipt);
  assert.ok(triangulationA.triplets.length > 0);
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "omi-system" &&
    triplet.predicate === "section" &&
    triplet.object === "semantic-projection"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "semantic-projection" &&
    triplet.predicate === "authority" &&
    triplet.object === "derived-triangulation"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "S" &&
    triplet.predicate === "role" &&
    triplet.object === "subject"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "message-roles" &&
    triplet.predicate === "rule" &&
    triplet.object === "message is not an authority class"
  )));
  assert.strictEqual(lazy.identity_receipt, triangulationA.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, triangulationA.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, triangulationA.identity_receipt);
  assert.strictEqual(animated.identity_receipt, triangulationA.identity_receipt);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.strictEqual(greedy.chart.source_kind, "omilisp");
  assert.strictEqual(staticView.declared_space.plane_order.join(","), "FS,GS,RS,US");
  assert.strictEqual(animated.timeline.frame_count, 5040);

  console.log("  OK S-P-O-M derives relations without becoming declaration authority\n");
}

function testReferencedSurfacesExist() {
  console.log("Testing OMI self-map referenced surfaces");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const required = [
    "docs/OMI-CONSTITUTIONAL-GEOMETRY.md",
    "docs/ONTOLOGY.omi",
    "docs/RULES.omi",
    "docs/GAUGE_TABLE.omi",
    "docs/FRAMES.omi",
    "docs/CORE-PRINCIPLE.md",
    "docs/PHASE-80-MESSAGING-CONFLICT-AUDIT.md",
    "docs/PHASE-81-PROPAGATION-DOCTRINE.md",
    "docs/PHASE-82-OPERATOR-BAND-CONS-TRIE-INCLUSION-AUDIT.md",
    "docs/PHASE-84-POLYFORM-CONS-RECONSTRUCTION-DOCTRINE.md",
    "declarations/polyform-cons-reconstruction.omilisp",
    "docs/PHASE-85-ORIENTATION-INCIDENCE-BLACKBOARD-DOCTRINE.md",
    "declarations/orientation-incidence-blackboard.omilisp",
    "declarations/trigintaduonion-triads.omilisp",
    "tests/fixtures/trigintaduonion-triads.tsv",
    "docs/PHASE-86-NETWORK-BOOTABLE-OMI-RUNTIME-RESOLVER.md",
    "declarations/network-bootable-runtime-resolver.omilisp",
    "docs/PHASE-87-RUNTIME-CHANNEL-MANIFEST-COURT.md",
    "declarations/runtime-channel-manifest.omilisp",
    "docs/PHASE-88-DISTRIBUTED-ADAPTER-TRANSPORT-REGISTRY.md",
    "declarations/distributed-adapter-transport-registry.omilisp",
    "docs/PHASE-89-RAW-BINARY-DECENTRALIZED-LATTICE-INTEGRATION-AUDIT.md",
    "declarations/raw-binary-decentralized-lattice.omilisp",
    "docs/PHASE-90-RAW-BINARY-CHUNK-RECEIPT-INDEX.md",
    "declarations/raw-binary-chunk-receipt-index.omilisp",
    "workbench/src/raw_binary_chunk_index.js",
    "docs/PHASE-91-BOUNDARY-GEOMETRY-CONSTITUTION.md",
    "declarations/boundary-geometry-constitution.omilisp",
    "docs/PHASE-93-OMI-OBSERVER-LATTICE-SITTER.md",
    "declarations/omi-observer-lattice-sitter.omilisp",
    "docs/PHASE-94-WORDNET-PROLOG-SEMANTIC-GROUNDING-ADAPTER.md",
    "declarations/wordnet-prolog-semantic-grounding.omilisp",
    "docs/PHASE-95-OMI-TRANSMUTATOR-ROUNDTRIP-COURT.md",
    "declarations/omi-transmutator-roundtrip.omilisp",
    "workbench/src/omi_transmutator.js",
    "docs/PHASE-96-UNICODE-LEXEME-BITMASK-ANNOTATION-LATTICE.md",
    "declarations/unicode-lexeme-bitmask-annotation-lattice.omilisp",
    "workbench/src/unicode_annotation_lattice.js",
    "docs/PHASE-97-SIXTY-FOUR-ION-BLACKBOARD-PAIRING-DOCTRINE.md",
    "declarations/sixty-four-ion-blackboard-pairing.omilisp",
    "docs/PHASE-98-UNIVERSAL-CLOSURE-CODING-64-ION-BLACKBOARD.md",
    "declarations/universal-closure-coding.omilisp",
    "workbench/src/universal_closure_coding.js",
    "docs/PHASE-99-AUTONOMOUS-WORLD-BUILDER-MODEL.md",
    "declarations/autonomous-world-builder-model.omilisp",
    "workbench/src/autonomous_world_builder.js",
    "docs/PHASE-100-AUTONOMOUS-WORLD-UX-BROWSER-SMOKE-COURT.md",
    "declarations/autonomous-world-browser-smoke-court.omilisp",
    "workbench/src/autonomous_world_browser.js",
    "docs/PHASE-101-AUTONOMOUS-WORLD-LIVE-RENDERER.md",
    "declarations/autonomous-world-live-renderer.omilisp",
    "workbench/src/autonomous_world_live_renderer.js",
    "docs/PHASE-102-AUTONOMOUS-WORLD-INTERJECTION-OVERLAY.md",
    "declarations/autonomous-world-interjection-overlay.omilisp",
    "workbench/src/autonomous_world_interjection_overlay.js",
    "docs/PHASE-103-AUTONOMOUS-WORLD-OVERLAY-ADMISSION-COURT.md",
    "declarations/autonomous-world-overlay-admission-court.omilisp",
    "workbench/src/autonomous_world_overlay_admission.js",
    "docs/PHASE-104-AUTONOMOUS-WORLD-VERSION-HISTORY-COURT.md",
    "declarations/autonomous-world-version-history-court.omilisp",
    "workbench/src/autonomous_world_version_history.js",
    "docs/PHASE-105-AUTONOMOUS-WORLD-MERGE-RECONCILIATION-COURT.md",
    "declarations/autonomous-world-merge-reconciliation-court.omilisp",
    "workbench/src/autonomous_world_merge_reconciliation.js",
    "docs/PHASE-106-AUTONOMOUS-WORLD-PACKAGE-SYNC-COURT.md",
    "declarations/autonomous-world-package-sync-court.omilisp",
    "workbench/src/autonomous_world_package_sync.js",
    "docs/PHASE-107-AUTONOMOUS-WORLD-PEER-EXCHANGE-PROTOCOL.md",
    "declarations/autonomous-world-peer-exchange-protocol.omilisp",
    "workbench/src/autonomous_world_peer_exchange.js",
    "docs/PHASE-108-AUTONOMOUS-WORLD-PUBSUB-SUBSCRIPTION-COURT.md",
    "declarations/autonomous-world-pubsub-subscription-court.omilisp",
    "workbench/src/autonomous_world_subscription_court.js",
    "docs/PHASE-109-AUTONOMOUS-WORLD-LIVE-TRANSPORT-ADAPTER-COURT.md",
    "declarations/autonomous-world-live-transport-adapter-court.omilisp",
    "workbench/src/autonomous_world_live_transport_adapter.js",
    "docs/PHASE-110-AUTONOMOUS-WORLD-TRANSPORT-REPLAY-COURT.md",
    "declarations/autonomous-world-transport-replay-court.omilisp",
    "workbench/src/autonomous_world_transport_replay.js",
    "docs/PHASE-111-AUTONOMOUS-WORLD-TRANSPORT-CHECKPOINT-COURT.md",
    "declarations/autonomous-world-transport-checkpoint-court.omilisp",
    "workbench/src/autonomous_world_transport_checkpoint.js"
  ];
  const declaredPaths = surfaces.map((surface) => surface.path);

  required.forEach((relPath) => {
    assert.ok(declaredPaths.includes(relPath), `${relPath} must be declared`);
    assert.ok(fs.existsSync(path.join(repoRoot, relPath)), `${relPath} must exist`);
  });

  console.log("  OK self-map documentation/source references exist\n");
}

console.log("Testing Phase 83 - OMI-in-OMI Declarative Mapping");
console.log("==================================================\n");

testSelfDeclarationParses();
testSelfDeclarationProjections();
testSelfDeclarationTriangulation();
testReferencedSurfacesExist();

console.log("\n==================================================");
console.log("ALL PHASE 83 OMI SELF-DECLARATION TESTS PASSED");
