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

function recordId(record) {
  return record && record.values ? record.values[0] : record.sid || record.name;
}

function testLatticeDeclarationParses() {
  console.log("Testing raw-binary decentralized lattice declaration");

  const source = read("declarations/raw-binary-decentralized-lattice.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.root, "omi");
  assert.strictEqual(parsedA.declaration.identity.sid, "raw-binary-decentralized-lattice");
  assert.strictEqual(parsedA.declaration.identity.kind, "lattice.integration-audit");
  assert.strictEqual(parsedA.declaration.rule["raw-image-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["qemu-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["qmp-qapi-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["vfio-user-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["llvm-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["tcg-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["network-peer-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["canonical-declarations-and-receipts-are-authority"], true);
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);

  console.log("  OK declaration parses deterministically with external adapter authority disabled\n");
}

function testExistingCourtsAreReferencedNotDuplicated() {
  console.log("Testing existing court integration references");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/raw-binary-decentralized-lattice.omilisp"));
  const courts = asArray(parsed.declaration["existing-courts"].court);
  const courtIds = courts.map(recordId);

  assert.deepStrictEqual(courtIds, [
    "phase-77-block-image-declaration",
    "phase-78-block-image-projection",
    "phase-83-omi-self-map",
    "phase-86-runtime-resolver",
    "phase-87-runtime-channel-manifest",
    "phase-88-distributed-adapter-registry"
  ]);
  courts.forEach((court) => {
    assert.strictEqual(court.reuse, "required");
    assert.ok(court.surface, `${recordId(court)} must name a surface`);
    assert.ok(court.doctrine, `${recordId(court)} must name a doctrine`);
  });
  assert.ok(courts.some((court) => court.phase === 77 && court.role === "declared-storage-topology"));
  assert.ok(courts.some((court) => court.phase === 78 && court.role === "block-image-readout-projection"));
  assert.ok(courts.some((court) => court.phase === 88 && court.role === "distributed-device-web-adapter-vocabulary"));

  console.log("  OK raw-binary lattice reuses existing courts instead of duplicating them\n");
}

function testMissingCourtsAreFutureGaps() {
  console.log("Testing missing adapter and receipt courts");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/raw-binary-decentralized-lattice.omilisp"));
  const missing = asArray(parsed.declaration["missing-courts"].court);
  const missingIds = missing.map(recordId);

  assert.deepStrictEqual(missingIds, [
    "raw-binary-chunk-receipt-index",
    "qemu-qmp-block-adapter-declaration",
    "vfio-user-device-adapter-declaration",
    "peer-chunk-sync-protocol",
    "self-healing-repair-court",
    "llvm-tcg-projection-witness-adapter"
  ]);
  missing.forEach((court) => {
    assert.strictEqual(court.needed, true);
    assert.ok(court.summary);
  });
  assert.ok(missing.some((court) => recordId(court) === "raw-binary-chunk-receipt-index" && court.role === "deterministic-chunk-index"));
  assert.ok(missing.some((court) => recordId(court) === "peer-chunk-sync-protocol" && court.role === "receipt-first-peer-exchange"));

  console.log("  OK missing courts are explicit future gaps, not hidden runtime behavior\n");
}

function testAdapterRolesRemainNonAuthoritative() {
  console.log("Testing raw-binary lattice adapter role guardrails");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/raw-binary-decentralized-lattice.omilisp"));
  const adapters = asArray(parsed.declaration["adapter-roles"].adapter);
  const guards = new Map(asArray(parsed.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));

  assert.deepStrictEqual(adapters.map(recordId), [
    "qemu",
    "qmp-qapi",
    "vfio-user",
    "llvm",
    "tcg",
    "raw-image",
    "network-peer"
  ]);
  adapters.forEach((adapter) => {
    assert.strictEqual(adapter.authority, false);
  });
  assert.ok(String(guards.get("no-reimplementation")).includes("Do not duplicate"));
  assert.ok(String(guards.get("qemu-not-authority")).includes("does not define identity"));
  assert.ok(String(guards.get("qmp-qapi-not-authority")).includes("not authority"));
  assert.ok(String(guards.get("vfio-user-not-authority")).includes("does not define declaration truth"));
  assert.ok(String(guards.get("llvm-not-authority")).includes("compiled artifacts are replay surfaces"));
  assert.ok(String(guards.get("tcg-not-authority")).includes("portability and replay"));
  assert.ok(String(guards.get("raw-image-not-authority")).includes("replayable carrier"));
  assert.ok(String(guards.get("peer-not-authority")).includes("receipts verify"));

  console.log("  OK QEMU/QMP/vfio-user/LLVM/TCG/raw image/peer remain non-authoritative\n");
}

function testLatticeProjectionReceipts() {
  console.log("Testing raw-binary lattice projection receipts");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/raw-binary-decentralized-lattice.omilisp"));
  const lazy = omilispDeclaration.projectDeclaration(parsed, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsed, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsed, "static");
  const animated = omilispDeclaration.projectDeclaration(parsed, "animated");

  assert.strictEqual(lazy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(lazy.sealed_address, "raw-binary-decentralized-lattice.self");
  assert.strictEqual(greedy.chart.kind, "lattice.integration-audit");
  assert.ok(staticView.declared_space.section_order.includes("missing-courts"));
  assert.strictEqual(animated.timeline.frame_count, 5040);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);

  console.log("  OK projections preserve identity and separate view receipts\n");
}

function testLatticeTriangulation() {
  console.log("Testing raw-binary lattice S-P-O-M triangulation");

  const source = read("declarations/raw-binary-decentralized-lattice.omilisp");
  const declaration = omilispDeclaration.parseDeclaration(source);
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);
  const greedy = spomAdapter.projectTriangulation(triangulationA, "greedy");

  assert.strictEqual(triangulationA.source_kind, "omilisp");
  assert.strictEqual(triangulationA.root, "raw-binary-decentralized-lattice");
  assert.strictEqual(triangulationA.scope, "lattice.integration-audit");
  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.notStrictEqual(triangulationA.identity_receipt, declaration.identity_receipt);
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "raw-binary-decentralized-lattice" &&
    triplet.predicate === "section" &&
    triplet.object === "existing-courts"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "phase-77-block-image-declaration" &&
    triplet.predicate === "role" &&
    triplet.object === "declared-storage-topology"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "raw-binary-chunk-receipt-index" &&
    triplet.predicate === "role" &&
    triplet.object === "deterministic-chunk-index"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "qemu" &&
    triplet.predicate === "role" &&
    triplet.object === "block-device-projection-engine"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "network-peer" &&
    triplet.predicate === "authority" &&
    triplet.object === false
  )));
  assert.strictEqual(greedy.identity_receipt, triangulationA.identity_receipt);
  assert.strictEqual(greedy.chart.source_kind, "omilisp");

  console.log("  OK S-P-O-M derives integration, gap, and adapter relations without changing authority\n");
}

function testOmiSelfMapReferencesPhase89() {
  console.log("Testing OMI self-map references raw-binary lattice integration audit");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const integrations = asArray(parsed.declaration["integration-audits"].audit);
  const declaredPaths = surfaces.map((surface) => surface.path);
  const integrationIds = integrations.map(recordId);

  assert.ok(integrationIds.includes("raw-binary-decentralized-lattice"));
  assert.ok(declaredPaths.includes("declarations/raw-binary-decentralized-lattice.omilisp"));
  assert.ok(declaredPaths.includes("docs/PHASE-89-RAW-BINARY-DECENTRALIZED-LATTICE-INTEGRATION-AUDIT.md"));
  assert.ok(fs.existsSync(path.join(repoRoot, "declarations/raw-binary-decentralized-lattice.omilisp")));
  assert.ok(fs.existsSync(path.join(repoRoot, "docs/PHASE-89-RAW-BINARY-DECENTRALIZED-LATTICE-INTEGRATION-AUDIT.md")));

  console.log("  OK OMI self-map references Phase 89 by link without copying the integration audit\n");
}

console.log("Testing Phase 89 - Raw Binary Decentralized Lattice Integration Audit");
console.log("======================================================================\n");

testLatticeDeclarationParses();
testExistingCourtsAreReferencedNotDuplicated();
testMissingCourtsAreFutureGaps();
testAdapterRolesRemainNonAuthoritative();
testLatticeProjectionReceipts();
testLatticeTriangulation();
testOmiSelfMapReferencesPhase89();

console.log("\n======================================================================");
console.log("ALL PHASE 89 RAW BINARY DECENTRALIZED LATTICE TESTS PASSED");
