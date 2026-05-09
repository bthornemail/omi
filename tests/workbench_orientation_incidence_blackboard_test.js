const assert = require("assert");
const fs = require("fs");
const path = require("path");

const omilispDeclaration = require("../workbench/src/omilisp_declaration.js");
const spomAdapter = require("../workbench/src/spom_adapter.js");
const artifactIdentity = require("../workbench/src/artifact_identity.js");

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

function familyId(family) {
  return family && family.values ? family.values[0] : family.sid || family.name;
}

function hasTriad(triads, units) {
  const expected = units.join(",");
  return triads.some((triad) => triadUnits(triad).join(",") === expected);
}

function triadUnits(triad) {
  if (Array.isArray(triad.units)) {
    return triad.units;
  }
  if (triad.units && triad.units.name && Array.isArray(triad.units.values)) {
    return [triad.units.name].concat(triad.units.values);
  }
  return [];
}

function testOrientationDeclarationParses() {
  console.log("Testing orientation incidence blackboard declaration");

  const source = read("declarations/orientation-incidence-blackboard.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const families = asArray(parsedA.declaration.basis.families);
  const familyCounts = {};
  const triads = asArray(parsedA.declaration["triad-fixtures"].triad);
  const declaredTotal = families.reduce((sum, family) => sum + family.count, 0);

  families.forEach((family) => {
    familyCounts[familyId(family)] = family.count;
  });

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.root, "omi");
  assert.strictEqual(parsedA.declaration.identity.sid, "orientation-incidence-blackboard");
  assert.strictEqual(parsedA.declaration.identity.kind, "algebra.derived-orientation-doctrine");
  assert.strictEqual(parsedA.declaration.basis.units, 32);
  assert.strictEqual(parsedA.declaration.basis["imaginary-units"], 31);
  assert.strictEqual(parsedA.declaration.basis["distinguished-triples"], 155);
  assert.strictEqual(parsedA.declaration.basis["triad-fixtures"], "representative");
  assert.strictEqual(parsedA.declaration.rule.axiom, false);
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);
  assert.strictEqual(declaredTotal, 155);
  assert.strictEqual(triads.length, 7);
  assert.deepStrictEqual(familyCounts, {
    "alpha-alpha-beta": 45,
    "beta-beta-beta-a": 20,
    "beta-beta-beta-b": 15,
    "alpha-beta-gamma": 60,
    "beta-gamma-gamma": 15
  });
  assert.ok(hasTriad(triads, ["e3", "e13", "e14"]));
  assert.ok(hasTriad(triads, ["e3", "e5", "e6"]));
  assert.ok(hasTriad(triads, ["e3", "e12", "e15"]));
  assert.ok(hasTriad(triads, ["e1", "e6", "e7"]));
  assert.ok(hasTriad(triads, ["e1", "e2", "e3"]));

  console.log("  OK declaration parses deterministically with family counts and representative triads\n");
}

function testTriadCorpusReferenceData() {
  console.log("Testing full trigintaduonion triad reference corpus");

  const source = read("declarations/trigintaduonion-triads.omilisp");
  const fixture = read("tests/fixtures/trigintaduonion-triads.tsv");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const families = asArray(parsedA.declaration.triads.family);
  const triads = families.reduce((out, family) => out.concat(asArray(family.triad)), []);
  const familyCounts = {};
  const rows = fixture.trimEnd().split("\n");

  families.forEach((family) => {
    familyCounts[familyId(family)] = asArray(family.triad).length;
    assert.strictEqual(asArray(family.triad).length, family.count);
  });

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "trigintaduonion-triads");
  assert.strictEqual(parsedA.declaration.identity.kind, "algebra.reference-corpus");
  assert.strictEqual(parsedA.declaration.corpus["distinguished-triples"], 155);
  assert.strictEqual(parsedA.declaration.corpus["table-order"], "preserved");
  assert.strictEqual(parsedA.declaration.corpus["source-fixture"], "tests/fixtures/trigintaduonion-triads.tsv");
  assert.strictEqual(parsedA.declaration.corpus["table-receipt"], artifactIdentity.fnv1a(fixture));
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);
  assert.strictEqual(rows.length, 156);
  assert.strictEqual(rows[0], "order\tfamily\ta\tb\tc\tsid");
  assert.strictEqual(triads.length, 155);
  assert.strictEqual(triads[0].order, 1);
  assert.strictEqual(triads[154].order, 155);
  assert.deepStrictEqual(familyCounts, {
    "alpha-alpha-beta": 45,
    "beta-beta-beta-a": 20,
    "beta-beta-beta-b": 15,
    "alpha-beta-gamma": 60,
    "beta-gamma-gamma": 15
  });
  assert.ok(hasTriad(triads, ["e3", "e13", "e14"]));
  assert.ok(hasTriad(triads, ["e3", "e5", "e6"]));
  assert.ok(hasTriad(triads, ["e3", "e12", "e15"]));
  assert.ok(hasTriad(triads, ["e1", "e6", "e7"]));
  assert.ok(hasTriad(triads, ["e1", "e2", "e3"]));
  assert.ok(triads.every((triad) => triad.role === "admitted-incidence-frame"));

  console.log("  OK full corpus preserves ordered 155-triad reference data and receipt\n");
}

function testOrientationProjectionReceipts() {
  console.log("Testing orientation incidence projection receipts");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/orientation-incidence-blackboard.omilisp"));
  const lazy = omilispDeclaration.projectDeclaration(parsed, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsed, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsed, "static");
  const animated = omilispDeclaration.projectDeclaration(parsed, "animated");

  assert.strictEqual(lazy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(lazy.sealed_address, "orientation-incidence-blackboard.self");
  assert.strictEqual(greedy.chart.kind, "algebra.derived-orientation-doctrine");
  assert.ok(staticView.declared_space.section_order.includes("triad-fixtures"));
  assert.strictEqual(animated.timeline.frame_count, 5040);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);

  console.log("  OK projections preserve identity and separate view receipts\n");
}

function testOrientationTriangulation() {
  console.log("Testing orientation incidence S-P-O-M triangulation");

  const source = read("declarations/orientation-incidence-blackboard.omilisp");
  const declaration = omilispDeclaration.parseDeclaration(source);
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);
  const greedy = spomAdapter.projectTriangulation(triangulationA, "greedy");
  const animated = spomAdapter.projectTriangulation(triangulationA, "animated");

  assert.strictEqual(triangulationA.source_kind, "omilisp");
  assert.strictEqual(triangulationA.root, "orientation-incidence-blackboard");
  assert.strictEqual(triangulationA.scope, "algebra.derived-orientation-doctrine");
  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.notStrictEqual(triangulationA.identity_receipt, declaration.identity_receipt);
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "orientation-incidence-blackboard" &&
    triplet.predicate === "section" &&
    triplet.object === "triad-fixtures"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "triad.e3.e13.e14" &&
    triplet.predicate === "subject" &&
    triplet.object === "e3"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "triad.e3.e13.e14" &&
    triplet.predicate === "predicate" &&
    triplet.object === "e13"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "triad.e3.e13.e14" &&
    triplet.predicate === "object" &&
    triplet.object === "e14"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "representative-not-corpus" &&
    triplet.predicate === "statement" &&
    String(triplet.object).includes("canonical reference data in a separate declaration")
  )));
  assert.strictEqual(greedy.identity_receipt, triangulationA.identity_receipt);
  assert.strictEqual(animated.identity_receipt, triangulationA.identity_receipt);
  assert.strictEqual(greedy.chart.source_kind, "omilisp");
  assert.strictEqual(animated.timeline.frame_count, 5040);

  console.log("  OK S-P-O-M derives incidence relations without changing declaration authority\n");
}

function testOmiSelfMapReferencesPhase85() {
  console.log("Testing OMI self-map references orientation incidence blackboard");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const algebras = asArray(parsed.declaration["derived-algebras"].algebra);
  const declaredPaths = surfaces.map((surface) => surface.path);
  const algebraIds = algebras.map((algebra) => algebra.values ? algebra.values[0] : algebra.sid || algebra.name);

  assert.ok(algebraIds.includes("orientation-incidence-blackboard"));
  assert.ok(declaredPaths.includes("declarations/orientation-incidence-blackboard.omilisp"));
  assert.ok(declaredPaths.includes("docs/PHASE-85-ORIENTATION-INCIDENCE-BLACKBOARD-DOCTRINE.md"));
  assert.ok(declaredPaths.includes("declarations/trigintaduonion-triads.omilisp"));
  assert.ok(declaredPaths.includes("tests/fixtures/trigintaduonion-triads.tsv"));
  assert.ok(fs.existsSync(path.join(repoRoot, "declarations/orientation-incidence-blackboard.omilisp")));
  assert.ok(fs.existsSync(path.join(repoRoot, "docs/PHASE-85-ORIENTATION-INCIDENCE-BLACKBOARD-DOCTRINE.md")));
  assert.ok(fs.existsSync(path.join(repoRoot, "declarations/trigintaduonion-triads.omilisp")));
  assert.ok(fs.existsSync(path.join(repoRoot, "tests/fixtures/trigintaduonion-triads.tsv")));

  console.log("  OK OMI self-map references Phase 85 without copying incidence fixtures\n");
}

console.log("Testing Phase 85 - Orientation Incidence Blackboard Doctrine");
console.log("============================================================\n");

testOrientationDeclarationParses();
testTriadCorpusReferenceData();
testOrientationProjectionReceipts();
testOrientationTriangulation();
testOmiSelfMapReferencesPhase85();

console.log("\n============================================================");
console.log("ALL PHASE 85 ORIENTATION INCIDENCE BLACKBOARD TESTS PASSED");
