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

function testRuntimeResolverDeclarationParses() {
  console.log("Testing network-bootable runtime resolver declaration");

  const source = read("declarations/network-bootable-runtime-resolver.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const layers = asArray(parsedA.declaration.layers.layer);
  const channels = asArray(parsedA.declaration["runtime-channels"].channel);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.root, "omi");
  assert.strictEqual(parsedA.declaration.identity.sid, "network-bootable-runtime-resolver");
  assert.strictEqual(parsedA.declaration.identity.kind, "runtime.resolver-doctrine");
  assert.strictEqual(parsedA.declaration.rule.authority, "runtime-doctrine");
  assert.strictEqual(parsedA.declaration.rule.axiom, false);
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);
  assert.deepStrictEqual(layers.map(recordId), [
    "boot-carrier",
    "declaration-authority",
    "propagation-lattice",
    "projection-workers",
    "workbook-surfaces"
  ]);
  assert.deepStrictEqual(layers.map((layer) => layer.order), [0, 1, 2, 3, 4]);
  assert.deepStrictEqual(channels.map(recordId), ["fifo", "process", "pipe", "socket", "receipt"]);
  assert.strictEqual(parsedA.declaration["replay-law"].mutation, "runtime-local");
  assert.strictEqual(parsedA.declaration["replay-law"].emits, "receipts");
  assert.strictEqual(parsedA.declaration["replay-law"]["runtime-authority"], false);
  assert.strictEqual(parsedA.declaration["replay-law"]["declaration-authority"], true);

  console.log("  OK declaration parses deterministically with ordered runtime layers and channels\n");
}

function testRuntimeResolverProjectionReceipts() {
  console.log("Testing network runtime resolver projection receipts");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/network-bootable-runtime-resolver.omilisp"));
  const lazy = omilispDeclaration.projectDeclaration(parsed, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsed, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsed, "static");
  const animated = omilispDeclaration.projectDeclaration(parsed, "animated");

  assert.strictEqual(lazy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(lazy.sealed_address, "network-bootable-runtime-resolver.self");
  assert.strictEqual(greedy.chart.kind, "runtime.resolver-doctrine");
  assert.ok(staticView.declared_space.section_order.includes("runtime-channels"));
  assert.strictEqual(animated.timeline.frame_count, 5040);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);

  console.log("  OK projections preserve identity and separate view receipts\n");
}

function testRuntimeResolverTriangulation() {
  console.log("Testing network runtime resolver S-P-O-M triangulation");

  const source = read("declarations/network-bootable-runtime-resolver.omilisp");
  const declaration = omilispDeclaration.parseDeclaration(source);
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);
  const greedy = spomAdapter.projectTriangulation(triangulationA, "greedy");
  const animated = spomAdapter.projectTriangulation(triangulationA, "animated");

  assert.strictEqual(triangulationA.source_kind, "omilisp");
  assert.strictEqual(triangulationA.root, "network-bootable-runtime-resolver");
  assert.strictEqual(triangulationA.scope, "runtime.resolver-doctrine");
  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.notStrictEqual(triangulationA.identity_receipt, declaration.identity_receipt);
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "network-bootable-runtime-resolver" &&
    triplet.predicate === "section" &&
    triplet.object === "runtime-channels"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "fifo" &&
    triplet.predicate === "role" &&
    triplet.object === "declared-propagation-edge"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "process" &&
    triplet.predicate === "role" &&
    triplet.object === "local-resolver-projection-node"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "socket" &&
    triplet.predicate === "role" &&
    triplet.object === "routable-propagation-surface"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "posix-not-ontology" &&
    triplet.predicate === "statement" &&
    String(triplet.object).includes("projection channels")
  )));
  assert.strictEqual(greedy.identity_receipt, triangulationA.identity_receipt);
  assert.strictEqual(animated.identity_receipt, triangulationA.identity_receipt);
  assert.strictEqual(greedy.chart.source_kind, "omilisp");
  assert.strictEqual(animated.timeline.frame_count, 5040);

  console.log("  OK S-P-O-M derives runtime layer/channel relations without changing authority\n");
}

function testOmiSelfMapReferencesPhase86() {
  console.log("Testing OMI self-map references network runtime resolver");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const runtimes = asArray(parsed.declaration["runtime-resolvers"].resolver);
  const declaredPaths = surfaces.map((surface) => surface.path);
  const runtimeIds = runtimes.map(recordId);

  assert.ok(runtimeIds.includes("network-bootable-runtime-resolver"));
  assert.ok(declaredPaths.includes("declarations/network-bootable-runtime-resolver.omilisp"));
  assert.ok(declaredPaths.includes("docs/PHASE-86-NETWORK-BOOTABLE-OMI-RUNTIME-RESOLVER.md"));
  assert.ok(fs.existsSync(path.join(repoRoot, "declarations/network-bootable-runtime-resolver.omilisp")));
  assert.ok(fs.existsSync(path.join(repoRoot, "docs/PHASE-86-NETWORK-BOOTABLE-OMI-RUNTIME-RESOLVER.md")));

  console.log("  OK OMI self-map references Phase 86 without becoming runtime authority\n");
}

console.log("Testing Phase 86 - Network-Bootable OMI Runtime Resolver");
console.log("=========================================================\n");

testRuntimeResolverDeclarationParses();
testRuntimeResolverProjectionReceipts();
testRuntimeResolverTriangulation();
testOmiSelfMapReferencesPhase86();

console.log("\n=========================================================");
console.log("ALL PHASE 86 NETWORK RUNTIME RESOLVER TESTS PASSED");
