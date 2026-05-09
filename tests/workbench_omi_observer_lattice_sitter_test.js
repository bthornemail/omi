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

function testObserverDeclarationParses() {
  console.log("Testing OMI observer lattice-sitter declaration");

  const source = read("declarations/omi-observer-lattice-sitter.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.root, "omi");
  assert.strictEqual(parsedA.declaration.identity.sid, "omi-observer-lattice-sitter");
  assert.strictEqual(parsedA.declaration.identity.kind, "observer.projection-resolver");
  assert.strictEqual(parsedA.declaration.address.addr, "omi-observer-lattice-sitter.self");
  assert.strictEqual(parsedA.declaration.rule["observer-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["observer-is-ai-agent"], false);
  assert.strictEqual(parsedA.declaration.rule["observer-is-projection-resolver"], true);
  assert.strictEqual(parsedA.declaration.rule["stochastic-interpretation"], false);
  assert.strictEqual(parsedA.declaration.rule["receipt-seeded-orientation"], true);
  assert.strictEqual(parsedA.declaration.rule["canonical-declarations-and-receipts-are-authority"], true);
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);

  console.log("  OK declaration parses deterministically with observer authority disabled\n");
}

function testOperationalLadderAndSurfaces() {
  console.log("Testing observer operational ladder and input surfaces");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-observer-lattice-sitter.omilisp"));
  const steps = asArray(parsed.declaration["operational-ladder"].step);
  const surfaces = asArray(parsed.declaration["input-surfaces"].surface);

  assert.deepStrictEqual(steps.map(recordId), [
    "surface",
    "boundary",
    "cons-edge",
    "binary-quadratic-relation",
    "fano-7-factorial-orientation",
    "triad-incidence-frame",
    "spom-declaration",
    "receipt-witness"
  ]);
  assert.deepStrictEqual(steps.map((step) => step.order), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.ok(surfaces.some((surface) => recordId(surface) === "omi-lisp" && surface.role === "canonical-declaration-surface"));
  assert.ok(surfaces.some((surface) => recordId(surface) === "raw-binary" && surface.role === "chunked-carrier-surface"));
  assert.ok(surfaces.some((surface) => recordId(surface) === "runtime-channel-message"));
  assert.ok(surfaces.some((surface) => recordId(surface) === "svg-json-canvas"));

  console.log("  OK observer ladder and mixed notation surfaces are declared\n");
}

function testOrientationAndIncidenceDoctrine() {
  console.log("Testing receipt-seeded Fano orientation doctrine");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-observer-lattice-sitter.omilisp"));
  const resolver = parsed.declaration["orientation-resolver"];
  const transform = parsed.declaration["incidence-transform"];
  const edges = asArray(transform.edge);
  const relations = asArray(transform.relation);
  const frames = asArray(transform.frame);
  const consEdge = edges.find((edge) => recordId(edge) === "cons-edge");
  const quadraticRelation = relations.find((relation) => recordId(relation) === "binary-quadratic-relation");
  const triadFrame = frames.find((frame) => recordId(frame) === "triad-incidence-frame");
  const translation = parsed.declaration.translation;
  const guards = new Map(asArray(parsed.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));

  assert.strictEqual(resolver.sid, "fano-lottery");
  assert.strictEqual(resolver["fano-points"], 7);
  assert.strictEqual(resolver["selector-permutations"], 5040);
  assert.strictEqual(resolver.seed, "identity-receipt");
  assert.strictEqual(resolver.deterministic, true);
  assert.strictEqual(resolver.stochastic, false);
  assert.strictEqual(consEdge.role, "oriented-pair");
  assert.strictEqual(quadraticRelation.role, "incidence-transform");
  assert.strictEqual(triadFrame.subject, "channel");
  assert.strictEqual(triadFrame.predicate, "channel");
  assert.strictEqual(triadFrame.object, "channel");
  assert.strictEqual(triadFrame.modality, "orientation");
  assert.strictEqual(translation.seed, "identity-receipt");
  assert.strictEqual(translation.select, "fano-orientation");
  assert.strictEqual(translation.output, "translated-declaration");
  assert.ok(String(guards.get("observer-not-authority")).includes("candidate projections"));
  assert.ok(String(guards.get("no-ml-authority")).includes("not an ML authority"));
  assert.ok(String(guards.get("no-runtime-agent")).includes("does not start"));

  console.log("  OK Fano lottery remains deterministic orientation resolution, not stochastic meaning\n");
}

function testProjectionReceipts() {
  console.log("Testing observer projection receipts");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-observer-lattice-sitter.omilisp"));
  const lazy = omilispDeclaration.projectDeclaration(parsed, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsed, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsed, "static");
  const animated = omilispDeclaration.projectDeclaration(parsed, "animated");

  assert.strictEqual(lazy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(lazy.sealed_address, "omi-observer-lattice-sitter.self");
  assert.strictEqual(greedy.chart.kind, "observer.projection-resolver");
  assert.ok(staticView.declared_space.section_order.includes("operational-ladder"));
  assert.ok(staticView.declared_space.section_order.includes("orientation-resolver"));
  assert.strictEqual(animated.timeline.frame_count, 5040);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);

  console.log("  OK projections preserve observer identity and separate view receipts\n");
}

function testObserverTriangulation() {
  console.log("Testing observer S-P-O-M triangulation");

  const source = read("declarations/omi-observer-lattice-sitter.omilisp");
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);

  assert.strictEqual(triangulationA.source_kind, "omilisp");
  assert.strictEqual(triangulationA.root, "omi-observer-lattice-sitter");
  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "omi-observer-lattice-sitter" &&
    triplet.predicate === "section" &&
    triplet.object === "operational-ladder"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "fano-lottery" &&
    triplet.predicate === "selector-permutations" &&
    triplet.object === 5040
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "observer-spom-frame" &&
    triplet.predicate === "subject" &&
    triplet.object === "boundary"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "observer-spom-frame" &&
    triplet.predicate === "predicate" &&
    triplet.object === "incidence"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "observer-spom-frame" &&
    triplet.predicate === "object" &&
    triplet.object === "translated-declaration"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "observer-spom-frame" &&
    triplet.predicate === "authority" &&
    triplet.object === false
  )));

  console.log("  OK S-P-O-M derives observer/incidence relations without becoming authority\n");
}

function testOmiSelfMapReferencesPhase93() {
  console.log("Testing OMI self-map references observer lattice-sitter");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);
  const observerResolvers = asArray(parsed.declaration["observer-resolvers"].resolver);
  const observerIds = observerResolvers.map(recordId);

  const required = [
    "docs/PHASE-93-OMI-OBSERVER-LATTICE-SITTER.md",
    "declarations/omi-observer-lattice-sitter.omilisp"
  ];

  assert.ok(observerIds.includes("omi-observer-lattice-sitter"));
  required.forEach((relPath) => {
    assert.ok(declaredPaths.includes(relPath), `${relPath} must be declared`);
    assert.ok(fs.existsSync(path.join(repoRoot, relPath)), `${relPath} must exist`);
  });

  console.log("  OK OMI self-map references Phase 93 by link only\n");
}

console.log("Testing Phase 93 - OMI Observer / Lattice-Sitter Doctrine");
console.log("==========================================================\n");

testObserverDeclarationParses();
testOperationalLadderAndSurfaces();
testOrientationAndIncidenceDoctrine();
testProjectionReceipts();
testObserverTriangulation();
testOmiSelfMapReferencesPhase93();

console.log("\n==========================================================");
console.log("ALL PHASE 93 OMI OBSERVER LATTICE-SITTER TESTS PASSED");
