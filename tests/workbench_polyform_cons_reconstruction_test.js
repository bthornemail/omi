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

function ids(records) {
  return asArray(records).map((record) => record.sid || record.name || record.value);
}

function testPolyformDeclarationParses() {
  console.log("Testing polyform CONS reconstruction declaration");

  const source = read("declarations/polyform-cons-reconstruction.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.root, "omi");
  assert.strictEqual(parsedA.declaration.identity.sid, "polyform-cons-reconstruction");
  assert.strictEqual(parsedA.declaration.identity.kind, "geometry.derived-doctrine");
  assert.strictEqual(parsedA.declaration.rule.authority, "derived-geometry");
  assert.strictEqual(parsedA.declaration.rule.axiom, false);
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);
  assert.deepStrictEqual(ids(parsedA.declaration["canonical-ladder"].steps), [
    "cons-chain",
    "unary-admissible-continuation",
    "spliced-incidence-chain",
    "reconstructed-metric-carrier",
    "polyform-diagram-cad-object"
  ]);
  assert.deepStrictEqual(ids(parsedA.declaration.basis.family), [
    "polyomino",
    "polyiamond",
    "polyhex",
    "layered-polyomino",
    "shadow-polycube",
    "polycube"
  ]);

  console.log("  OK declaration parses deterministically as derived geometry\n");
}

function testPolyformProjectionReceipts() {
  console.log("Testing polyform CONS reconstruction projection receipts");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/polyform-cons-reconstruction.omilisp"));
  const lazy = omilispDeclaration.projectDeclaration(parsed, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsed, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsed, "static");
  const animated = omilispDeclaration.projectDeclaration(parsed, "animated");

  assert.strictEqual(lazy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(lazy.sealed_address, "polyform-cons-reconstruction.self");
  assert.strictEqual(greedy.chart.kind, "geometry.derived-doctrine");
  assert.ok(staticView.declared_space.section_order.includes("basis"));
  assert.strictEqual(animated.timeline.frame_count, 5040);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);

  console.log("  OK projections preserve identity and separate view receipts\n");
}

function testPolyformTriangulation() {
  console.log("Testing polyform CONS reconstruction S-P-O-M triangulation");

  const source = read("declarations/polyform-cons-reconstruction.omilisp");
  const declaration = omilispDeclaration.parseDeclaration(source);
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);
  const greedy = spomAdapter.projectTriangulation(triangulationA, "greedy");
  const animated = spomAdapter.projectTriangulation(triangulationA, "animated");

  assert.strictEqual(triangulationA.source_kind, "omilisp");
  assert.strictEqual(triangulationA.root, "polyform-cons-reconstruction");
  assert.strictEqual(triangulationA.scope, "geometry.derived-doctrine");
  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.notStrictEqual(triangulationA.identity_receipt, declaration.identity_receipt);
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "polyform-cons-reconstruction" &&
    triplet.predicate === "section" &&
    triplet.object === "canonical-ladder"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "polyomino" &&
    triplet.predicate === "cell" &&
    triplet.object === "square"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "polycube" &&
    triplet.predicate === "dimension" &&
    triplet.object === "3d"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "derived-not-axiom" &&
    triplet.predicate === "statement" &&
    String(triplet.object).includes("not a constitutional axiom")
  )));
  assert.strictEqual(greedy.identity_receipt, triangulationA.identity_receipt);
  assert.strictEqual(animated.identity_receipt, triangulationA.identity_receipt);
  assert.strictEqual(greedy.chart.source_kind, "omilisp");
  assert.strictEqual(animated.timeline.frame_count, 5040);

  console.log("  OK S-P-O-M derives reconstruction relations without changing declaration authority\n");
}

function testOmiSelfMapReferencesPhase84() {
  console.log("Testing OMI self-map references polyform reconstruction");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const derived = asArray(parsed.declaration["derived-geometries"].geometry);
  const declaredPaths = surfaces.map((surface) => surface.path);
  const derivedIds = ids(derived);

  assert.ok(derivedIds.includes("polyform-cons-reconstruction"));
  assert.ok(declaredPaths.includes("declarations/polyform-cons-reconstruction.omilisp"));
  assert.ok(declaredPaths.includes("docs/PHASE-84-POLYFORM-CONS-RECONSTRUCTION-DOCTRINE.md"));
  assert.ok(fs.existsSync(path.join(repoRoot, "declarations/polyform-cons-reconstruction.omilisp")));
  assert.ok(fs.existsSync(path.join(repoRoot, "docs/PHASE-84-POLYFORM-CONS-RECONSTRUCTION-DOCTRINE.md")));

  console.log("  OK OMI self-map references Phase 84 without copying the doctrine\n");
}

console.log("Testing Phase 84 - Polyform CONS Reconstruction Doctrine");
console.log("=========================================================\n");

testPolyformDeclarationParses();
testPolyformProjectionReceipts();
testPolyformTriangulation();
testOmiSelfMapReferencesPhase84();

console.log("\n=========================================================");
console.log("ALL PHASE 84 POLYFORM CONS RECONSTRUCTION TESTS PASSED");
