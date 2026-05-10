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
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function recordId(record) {
  return record && record.values ? record.values[0] : record.sid || record.name;
}

function kv(records) {
  return asArray(records).reduce((out, item) => {
    out[item.name] = item.value;
    return out;
  }, {});
}

function testPairingDeclarationParses() {
  console.log("Testing 64-ion blackboard pairing declaration");

  const source = read("declarations/sixty-four-ion-blackboard-pairing.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const axes = asArray(parsedA.declaration["pairing-axes"].pair);
  const steps = asArray(parsedA.declaration["resolution-ladder"].step);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const triadCompatibility = kv(parsedA.declaration.compatibility["trigintaduonion-triads"]);
  const sixtyFourCompatibility = kv(parsedA.declaration.compatibility["sixty-four-ion-surface"]);
  const omiCompatibility = kv(parsedA.declaration.compatibility["omi-constitutional-surface"]);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "sixty-four-ion-blackboard-pairing");
  assert.strictEqual(parsedA.declaration.identity.kind, "algebra.pairwise-blackboard-doctrine");
  assert.strictEqual(parsedA.declaration.rule.axiom, false);
  assert.strictEqual(triadCompatibility.units, 32);
  assert.strictEqual(triadCompatibility["distinguished-triples"], 155);
  assert.strictEqual(triadCompatibility.authority, false);
  assert.strictEqual(sixtyFourCompatibility.states, 64);
  assert.strictEqual(sixtyFourCompatibility.authority, false);
  assert.strictEqual(omiCompatibility.range, "0x00..0x3F");
  assert.strictEqual(omiCompatibility.states, 64);
  assert.deepStrictEqual(axes.map(recordId), [
    "unit-dual",
    "claim-counterclaim",
    "car-cdr",
    "source-sink",
    "read-write",
    "open-close",
    "null-operated-null"
  ]);
  assert.deepStrictEqual(steps.map(recordId), [
    "closure",
    "operated-closure",
    "cons-edge",
    "triad-incidence-frame",
    "trigintaduonion-board",
    "sixty-four-ion-pairwise-surface",
    "blackboard-resolver",
    "spom-emission",
    "receipt-admission"
  ]);
  assert.ok(String(guards.get("sixty-four-ion-not-authority")).includes("not authority"));
  assert.ok(String(guards.get("triads-not-truth")).includes("not truth"));
  assert.ok(String(guards.get("blackboard-receipt-seeded")).includes("receipt-seeded"));

  console.log("  OK declaration parses with pair axes, 64-state compatibility, and authority guardrails\n");
}

function testPairingProjectionReceipts() {
  console.log("Testing 64-ion blackboard pairing projection receipts");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/sixty-four-ion-blackboard-pairing.omilisp"));
  const lazy = omilispDeclaration.projectDeclaration(parsed, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsed, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsed, "static");
  const animated = omilispDeclaration.projectDeclaration(parsed, "animated");

  assert.strictEqual(lazy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(lazy.sealed_address, "sixty-four-ion-blackboard-pairing.self");
  assert.strictEqual(greedy.chart.kind, "algebra.pairwise-blackboard-doctrine");
  assert.ok(staticView.declared_space.section_order.includes("pairing-axes"));
  assert.strictEqual(animated.timeline.frame_count, 5040);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);

  console.log("  OK projections preserve identity and separate view receipts\n");
}

function testPairingTriangulation() {
  console.log("Testing 64-ion blackboard pairing S-P-O-M triangulation");

  const source = read("declarations/sixty-four-ion-blackboard-pairing.omilisp");
  const declaration = omilispDeclaration.parseDeclaration(source);
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);

  assert.strictEqual(triangulationA.source_kind, "omilisp");
  assert.strictEqual(triangulationA.root, "sixty-four-ion-blackboard-pairing");
  assert.strictEqual(triangulationA.scope, "algebra.pairwise-blackboard-doctrine");
  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.notStrictEqual(triangulationA.identity_receipt, declaration.identity_receipt);
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "sixty-four-ion-blackboard-pairing" &&
    triplet.predicate === "section" &&
    triplet.object === "blackboard-pair"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "pending-pattern-selected-frame" &&
    triplet.predicate === "left" &&
    triplet.object === "pending-pattern"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "pending-pattern-selected-frame" &&
    triplet.predicate === "right" &&
    triplet.object === "selected-frame"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "blackboard-receipt-seeded" &&
    triplet.predicate === "statement" &&
    String(triplet.object).includes("receipt-seeded")
  )));

  console.log("  OK S-P-O-M derives pair-wise blackboard relations without changing authority\n");
}

function testOmiSystemReferencesPhase97() {
  console.log("Testing OMI self-map references Phase 97 by link only");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const pairings = asArray(parsed.declaration["blackboard-pairing-doctrines"].doctrine);
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.ok(pairings.map(recordId).includes("sixty-four-ion-blackboard-pairing"));
  assert.ok(declaredPaths.includes("docs/PHASE-97-SIXTY-FOUR-ION-BLACKBOARD-PAIRING-DOCTRINE.md"));
  assert.ok(declaredPaths.includes("declarations/sixty-four-ion-blackboard-pairing.omilisp"));
  assert.ok(!JSON.stringify(parsed.declaration["blackboard-pairing-doctrines"]).includes("pending-pattern-selected-frame"));

  console.log("  OK self-map links Phase 97 without copying the pair table\n");
}

console.log("Testing Phase 97 - 64-Ion Blackboard Pairing Doctrine");
console.log("======================================================\n");

testPairingDeclarationParses();
testPairingProjectionReceipts();
testPairingTriangulation();
testOmiSystemReferencesPhase97();

console.log("\n======================================================");
console.log("ALL PHASE 97 SIXTY-FOUR-ION BLACKBOARD PAIRING TESTS PASSED");
