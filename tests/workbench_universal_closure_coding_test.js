const assert = require("assert");
const fs = require("fs");
const path = require("path");

const closureCoding = require("../workbench/src/universal_closure_coding.js");
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

function testClosureReceipts() {
  console.log("Testing universal closure coding receipt behavior");

  const character = closureCoding.encodeClosure({
    closure_law: "unary",
    payload: "omi.payload.13",
    boundary: "self-delimiting",
    cons_orientation: "car-cdr",
    carrier: "character"
  });
  const binary64 = closureCoding.encodeClosure({
    closure_law: "unary",
    payload: "omi.payload.13",
    boundary: "self-delimiting",
    cons_orientation: "car-cdr",
    carrier: "binary64"
  });
  const changedBoundary = closureCoding.encodeClosure({
    closure_law: "elias",
    payload: "omi.payload.13",
    boundary: "self-delimiting",
    cons_orientation: "car-cdr",
    carrier: "character"
  });
  const comparison = closureCoding.compareIsomorphism(character, binary64);

  assert.strictEqual(character.identity_receipt, binary64.identity_receipt);
  assert.notStrictEqual(character.projection_receipt, binary64.projection_receipt);
  assert.notStrictEqual(character.identity_receipt, changedBoundary.identity_receipt);
  assert.strictEqual(comparison.same_identity, true);
  assert.strictEqual(comparison.same_projection, false);
  assert.strictEqual(comparison.preserved, true);
  assert.strictEqual(character.authority, false);
  assert.strictEqual(binary64.carrier_authority, false);

  console.log("  OK same closure and payload preserve identity while carrier changes projection\n");
}

function testDeclarationParses() {
  console.log("Testing universal closure coding declaration");

  const source = read("declarations/universal-closure-coding.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const families = asArray(parsedA.declaration["coding-families"].family);
  const carriers = asArray(parsedA.declaration["carrier-projections"].carrier);
  const preserves = asArray(parsedA.declaration["isomorphism-rule"].preserve);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "universal-closure-coding");
  assert.strictEqual(parsedA.declaration.identity.kind, "coding.universal-closure-law");
  assert.strictEqual(parsedA.declaration.rule.axiom, false);
  assert.deepStrictEqual(families.map(recordId), [
    "unary",
    "elias",
    "fibonacci",
    "golomb-rice",
    "binary64",
    "ecd",
    "endian-variant"
  ]);
  families.forEach((family) => {
    assert.strictEqual(family.authority, false);
  });
  carriers.forEach((carrier) => {
    assert.strictEqual(carrier.authority, false);
  });
  assert.deepStrictEqual(preserves.map((item) => item.value || item), [
    "closure-boundary",
    "cons-orientation",
    "payload-readout",
    "receipt-witness"
  ]);
  assert.ok(String(guards.get("universal-code-not-authority")).includes("not authority"));
  assert.ok(String(guards.get("declarations-and-receipts-authority")).includes("remain authority"));

  console.log("  OK declaration parses with non-authoritative coding families and carrier projections\n");
}

function testTriangulation() {
  console.log("Testing universal closure coding S-P-O-M triangulation");

  const source = read("declarations/universal-closure-coding.omilisp");
  const declaration = omilispDeclaration.parseDeclaration(source);
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);

  assert.strictEqual(triangulationA.source_kind, "omilisp");
  assert.strictEqual(triangulationA.root, "universal-closure-coding");
  assert.strictEqual(triangulationA.scope, "coding.universal-closure-law");
  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.notStrictEqual(triangulationA.identity_receipt, declaration.identity_receipt);
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "universal-closure-coding" &&
    triplet.predicate === "section" &&
    triplet.object === "isomorphism-rule"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "unary" &&
    triplet.predicate === "role" &&
    triplet.object === "boundary-spine"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "binary64" &&
    triplet.predicate === "authority" &&
    triplet.object === false
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "universal-code-not-authority" &&
    triplet.predicate === "statement" &&
    String(triplet.object).includes("not authority")
  )));

  console.log("  OK S-P-O-M derives closure/coding/carrier/isomorphism relations\n");
}

function testOmiSystemReferencesPhase98() {
  console.log("Testing OMI self-map references Phase 98 by link only");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const courts = asArray(parsed.declaration["closure-coding-courts"].court);
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.ok(courts.map(recordId).includes("universal-closure-coding"));
  assert.ok(declaredPaths.includes("docs/PHASE-98-UNIVERSAL-CLOSURE-CODING-64-ION-BLACKBOARD.md"));
  assert.ok(declaredPaths.includes("declarations/universal-closure-coding.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/universal_closure_coding.js"));
  assert.ok(!JSON.stringify(parsed.declaration["closure-coding-courts"]).includes("payload-readout"));

  console.log("  OK self-map links Phase 98 without copying the coding table\n");
}

console.log("Testing Phase 98 - Universal Closure Coding");
console.log("===========================================\n");

testClosureReceipts();
testDeclarationParses();
testTriangulation();
testOmiSystemReferencesPhase98();

console.log("\n===========================================");
console.log("ALL PHASE 98 UNIVERSAL CLOSURE CODING TESTS PASSED");
