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

function testManifestParses() {
  console.log("Testing runtime channel manifest declaration");

  const source = read("declarations/runtime-channel-manifest.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const roots = asArray(parsedA.declaration.roots.root);
  const channels = asArray(parsedA.declaration.channels.channel);
  const processRoles = asArray(parsedA.declaration["process-roles"]["process-role"]);
  const capabilities = asArray(parsedA.declaration.capabilities.capability);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.root, "omi");
  assert.strictEqual(parsedA.declaration.identity.sid, "runtime-channel-manifest");
  assert.strictEqual(parsedA.declaration.identity.kind, "runtime.channel-manifest");
  assert.strictEqual(parsedA.declaration.rule["declared-channel-is-opened-channel"], false);
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);
  assert.deepStrictEqual(roots.map(recordId), ["run", "dev", "repo"]);
  assert.deepStrictEqual(roots.map((root) => root.path), ["/run/omi", "/dev/omi", ".omi/runtime"]);
  roots.forEach((root) => {
    assert.strictEqual(root.created, false);
    assert.strictEqual(root.authority, false);
  });
  assert.deepStrictEqual(channels.map(recordId), [
    "declaration-in",
    "receipt-out",
    "projection-worker",
    "peer-sync",
    "block-image-view",
    "repo-adapter"
  ]);
  assert.deepStrictEqual(processRoles.map(recordId), [
    "resolver",
    "receipt-verifier",
    "projection-worker",
    "peer-sync-worker",
    "repo-adapter"
  ]);
  assert.deepStrictEqual(capabilities.map(recordId), [
    "read-declaration",
    "resolve-declaration",
    "emit-receipt",
    "verify-receipt",
    "project-view",
    "connect-peer",
    "read-block-projection",
    "adapt-repo"
  ]);

  console.log("  OK manifest parses deterministically with declared roots, channels, roles, and capabilities\n");
}

function testChannelsAreNamesNotResources() {
  console.log("Testing declared channels are not opened resources");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/runtime-channel-manifest.omilisp"));
  const channels = asArray(parsed.declaration.channels.channel);
  const guardrails = asArray(parsed.declaration.guardrails.guard);
  const channelReceiptsA = channels.map((channel) => channel.identity_receipt);
  const parsedAgain = omilispDeclaration.parseDeclaration(read("declarations/runtime-channel-manifest.omilisp"));
  const channelReceiptsB = asArray(parsedAgain.declaration.channels.channel).map((channel) => channel.identity_receipt);

  channels.forEach((channel) => {
    assert.strictEqual(channel.opened, false);
    assert.ok(channel.path);
    assert.ok(channel.capability);
    assert.ok(channel.identity_receipt);
  });
  assert.deepStrictEqual(channelReceiptsA, channelReceiptsB);
  assert.strictEqual(new Set(channelReceiptsA).size, channelReceiptsA.length);
  assert.ok(guardrails.some((guard) => (
    recordId(guard) === "paths-not-authority" &&
    String(guard.statement).includes("projection bindings")
  )));
  assert.ok(guardrails.some((guard) => (
    recordId(guard) === "no-os-resource-creation" &&
    String(guard.statement).includes("does not create")
  )));

  console.log("  OK channel names, receipts, and guardrails stay declaration-only\n");
}

function testCapabilitiesSeparateFromChannels() {
  console.log("Testing capabilities are declared separately from channels");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/runtime-channel-manifest.omilisp"));
  const channels = asArray(parsed.declaration.channels.channel);
  const capabilities = asArray(parsed.declaration.capabilities.capability);
  const capabilityIds = new Set(capabilities.map(recordId));

  channels.forEach((channel) => {
    assert.ok(capabilityIds.has(channel.capability), `${channel.capability} must be declared separately`);
  });
  assert.ok(capabilities.every((capability) => capability.effect));
  assert.ok(capabilities.some((capability) => (
    recordId(capability) === "connect-peer" &&
    capability.authority === "package_receipt"
  )));
  assert.ok(capabilities.some((capability) => (
    recordId(capability) === "project-view" &&
    capability.authority === "projection_receipt"
  )));

  console.log("  OK capabilities gate channel use without becoming channel names\n");
}

function testManifestProjectionReceipts() {
  console.log("Testing runtime channel manifest projection receipts");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/runtime-channel-manifest.omilisp"));
  const lazy = omilispDeclaration.projectDeclaration(parsed, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsed, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsed, "static");
  const animated = omilispDeclaration.projectDeclaration(parsed, "animated");

  assert.strictEqual(lazy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(lazy.sealed_address, "runtime-channel-manifest.self");
  assert.strictEqual(greedy.chart.kind, "runtime.channel-manifest");
  assert.ok(staticView.declared_space.section_order.includes("channels"));
  assert.strictEqual(animated.timeline.frame_count, 5040);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);

  console.log("  OK projections preserve identity and separate view receipts\n");
}

function testManifestTriangulation() {
  console.log("Testing runtime channel manifest S-P-O-M triangulation");

  const source = read("declarations/runtime-channel-manifest.omilisp");
  const declaration = omilispDeclaration.parseDeclaration(source);
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);
  const greedy = spomAdapter.projectTriangulation(triangulationA, "greedy");

  assert.strictEqual(triangulationA.source_kind, "omilisp");
  assert.strictEqual(triangulationA.root, "runtime-channel-manifest");
  assert.strictEqual(triangulationA.scope, "runtime.channel-manifest");
  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.notStrictEqual(triangulationA.identity_receipt, declaration.identity_receipt);
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "runtime-channel-manifest" &&
    triplet.predicate === "section" &&
    triplet.object === "channels"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "/run/omi/declaration.in" &&
    triplet.predicate === "kind" &&
    triplet.object === "fifo"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "/run/omi/peer.sock" &&
    triplet.predicate === "kind" &&
    triplet.object === "socket"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "resolver" &&
    triplet.predicate === "role" &&
    triplet.object === "declaration-resolver"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "project-view" &&
    triplet.predicate === "authority" &&
    triplet.object === "projection_receipt"
  )));
  assert.strictEqual(greedy.identity_receipt, triangulationA.identity_receipt);
  assert.strictEqual(greedy.chart.source_kind, "omilisp");

  console.log("  OK S-P-O-M derives channel/process/capability relations without changing authority\n");
}

function testOmiSelfMapReferencesPhase87() {
  console.log("Testing OMI self-map references runtime channel manifest");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const manifests = asArray(parsed.declaration["runtime-manifests"].manifest);
  const declaredPaths = surfaces.map((surface) => surface.path);
  const manifestIds = manifests.map(recordId);

  assert.ok(manifestIds.includes("runtime-channel-manifest"));
  assert.ok(declaredPaths.includes("declarations/runtime-channel-manifest.omilisp"));
  assert.ok(declaredPaths.includes("docs/PHASE-87-RUNTIME-CHANNEL-MANIFEST-COURT.md"));
  assert.ok(fs.existsSync(path.join(repoRoot, "declarations/runtime-channel-manifest.omilisp")));
  assert.ok(fs.existsSync(path.join(repoRoot, "docs/PHASE-87-RUNTIME-CHANNEL-MANIFEST-COURT.md")));

  console.log("  OK OMI self-map references Phase 87 by link without opening runtime channels\n");
}

console.log("Testing Phase 87 - Runtime Channel Manifest Court");
console.log("==================================================\n");

testManifestParses();
testChannelsAreNamesNotResources();
testCapabilitiesSeparateFromChannels();
testManifestProjectionReceipts();
testManifestTriangulation();
testOmiSelfMapReferencesPhase87();

console.log("\n==================================================");
console.log("ALL PHASE 87 RUNTIME CHANNEL MANIFEST TESTS PASSED");
