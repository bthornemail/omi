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

function testRegistryParses() {
  console.log("Testing distributed adapter transport registry declaration");

  const source = read("declarations/distributed-adapter-transport-registry.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const classes = asArray(parsedA.declaration["adapter-classes"].class);
  const capabilities = asArray(parsedA.declaration.capabilities.capability);
  const adapters = asArray(parsedA.declaration.adapters.adapter);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.root, "omi");
  assert.strictEqual(parsedA.declaration.identity.sid, "distributed-adapter-transport-registry");
  assert.strictEqual(parsedA.declaration.identity.kind, "runtime.adapter-transport-registry");
  assert.strictEqual(parsedA.declaration.rule["adapter-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["transport-is-identity"], false);
  assert.strictEqual(parsedA.declaration.rule["device-is-declaration"], false);
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);
  assert.deepStrictEqual(classes.map(recordId), [
    "network",
    "local-ipc",
    "web",
    "ledger",
    "filesystem",
    "device-bus"
  ]);
  assert.deepStrictEqual(adapters.map(recordId), [
    "tcp",
    "udp",
    "ipc",
    "fifo",
    "unix-sock",
    "w3c-web",
    "btc-ledger",
    "inode",
    "gpio",
    "scsi",
    "i2c"
  ]);
  assert.strictEqual(capabilities.length, adapters.length);

  console.log("  OK registry parses deterministically with adapter classes, capabilities, and adapter names\n");
}

function testAdaptersReferenceDeclaredCapabilities() {
  console.log("Testing adapter bindings reference declared capabilities");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/distributed-adapter-transport-registry.omilisp"));
  const adapters = asArray(parsed.declaration.adapters.adapter);
  const capabilities = asArray(parsed.declaration.capabilities.capability);
  const capabilityIds = new Set(capabilities.map(recordId));

  adapters.forEach((adapter) => {
    assert.ok(capabilityIds.has(adapter.capability), `${recordId(adapter)} must reference a declared capability`);
    assert.strictEqual(adapter["runtime-opened"], false);
    assert.notStrictEqual(adapter.authority, "identity_receipt");
  });
  assert.ok(adapters.every((adapter) => adapter.authority === "projection-binding" || adapter.authority === "witness-binding"));
  assert.ok(capabilities.every((capability) => capability.effect));
  assert.ok(capabilities.some((capability) => (
    recordId(capability) === "use-tcp" &&
    capability.authority === "package_receipt"
  )));
  assert.ok(capabilities.some((capability) => (
    recordId(capability) === "use-gpio" &&
    capability.authority === "projection_receipt"
  )));
  assert.ok(capabilities.some((capability) => (
    recordId(capability) === "anchor-btc-ledger" &&
    capability.authority === "witness-binding"
  )));

  console.log("  OK adapters use declared capabilities instead of raw permissions\n");
}

function testTransportGuardrails() {
  console.log("Testing transport/device guardrails");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/distributed-adapter-transport-registry.omilisp"));
  const guardrails = asArray(parsed.declaration.guardrails.guard);
  const guards = new Map(guardrails.map((guard) => [recordId(guard), guard.statement]));

  assert.ok(String(guards.get("adapter-not-authority")).includes("not replacement authorities"));
  assert.ok(String(guards.get("transport-not-identity")).includes("do not define identity"));
  assert.ok(String(guards.get("device-not-declaration")).includes("do not become declarations"));
  assert.ok(String(guards.get("capabilities-not-permissions")).includes("not raw OS permissions"));
  assert.ok(String(guards.get("receipts-required")).includes("must emit receipts"));
  assert.ok(String(guards.get("no-runtime-open")).includes("does not open"));

  console.log("  OK guardrails preserve adapter/transport/device authority boundaries\n");
}

function testRegistryProjectionReceipts() {
  console.log("Testing distributed adapter registry projection receipts");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/distributed-adapter-transport-registry.omilisp"));
  const lazy = omilispDeclaration.projectDeclaration(parsed, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsed, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsed, "static");
  const animated = omilispDeclaration.projectDeclaration(parsed, "animated");

  assert.strictEqual(lazy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(lazy.sealed_address, "distributed-adapter-transport-registry.self");
  assert.strictEqual(greedy.chart.kind, "runtime.adapter-transport-registry");
  assert.ok(staticView.declared_space.section_order.includes("adapters"));
  assert.strictEqual(animated.timeline.frame_count, 5040);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);

  console.log("  OK projections preserve identity and separate view receipts\n");
}

function testRegistryTriangulation() {
  console.log("Testing distributed adapter registry S-P-O-M triangulation");

  const source = read("declarations/distributed-adapter-transport-registry.omilisp");
  const declaration = omilispDeclaration.parseDeclaration(source);
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);
  const greedy = spomAdapter.projectTriangulation(triangulationA, "greedy");

  assert.strictEqual(triangulationA.source_kind, "omilisp");
  assert.strictEqual(triangulationA.root, "distributed-adapter-transport-registry");
  assert.strictEqual(triangulationA.scope, "runtime.adapter-transport-registry");
  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.notStrictEqual(triangulationA.identity_receipt, declaration.identity_receipt);
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "distributed-adapter-transport-registry" &&
    triplet.predicate === "section" &&
    triplet.object === "adapters"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "tcp" &&
    triplet.predicate === "role" &&
    triplet.object === "routable-peer-stream"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "gpio" &&
    triplet.predicate === "role" &&
    triplet.object === "physical-signal-edge"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "scsi" &&
    triplet.predicate === "role" &&
    triplet.object === "block-device-command-surface"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "use-tcp" &&
    triplet.predicate === "authority" &&
    triplet.object === "package_receipt"
  )));
  assert.strictEqual(greedy.identity_receipt, triangulationA.identity_receipt);
  assert.strictEqual(greedy.chart.source_kind, "omilisp");

  console.log("  OK S-P-O-M derives adapter/capability relations without changing authority\n");
}

function testOmiSelfMapReferencesPhase88() {
  console.log("Testing OMI self-map references distributed adapter registry");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const registries = asArray(parsed.declaration["adapter-registries"].registry);
  const declaredPaths = surfaces.map((surface) => surface.path);
  const registryIds = registries.map(recordId);

  assert.ok(registryIds.includes("distributed-adapter-transport-registry"));
  assert.ok(declaredPaths.includes("declarations/distributed-adapter-transport-registry.omilisp"));
  assert.ok(declaredPaths.includes("docs/PHASE-88-DISTRIBUTED-ADAPTER-TRANSPORT-REGISTRY.md"));
  assert.ok(fs.existsSync(path.join(repoRoot, "declarations/distributed-adapter-transport-registry.omilisp")));
  assert.ok(fs.existsSync(path.join(repoRoot, "docs/PHASE-88-DISTRIBUTED-ADAPTER-TRANSPORT-REGISTRY.md")));

  console.log("  OK OMI self-map references Phase 88 by link without trusting transport as identity\n");
}

console.log("Testing Phase 88 - Distributed Adapter Transport Registry");
console.log("==========================================================\n");

testRegistryParses();
testAdaptersReferenceDeclaredCapabilities();
testTransportGuardrails();
testRegistryProjectionReceipts();
testRegistryTriangulation();
testOmiSelfMapReferencesPhase88();

console.log("\n==========================================================");
console.log("ALL PHASE 88 DISTRIBUTED ADAPTER TRANSPORT TESTS PASSED");
