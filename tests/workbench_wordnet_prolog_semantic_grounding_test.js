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

function testSemanticGroundingDeclaration() {
  console.log("Testing WordNet / Prolog semantic grounding declaration");

  const source = read("declarations/wordnet-prolog-semantic-grounding.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.root, "omi");
  assert.strictEqual(parsedA.declaration.identity.sid, "wordnet-prolog-semantic-grounding");
  assert.strictEqual(parsedA.declaration.identity.kind, "semantic.grounding-adapter");
  assert.strictEqual(parsedA.declaration.address.addr, "wordnet-prolog-semantic-grounding.self");
  assert.strictEqual(parsedA.declaration.rule["wordnet-synset-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["prolog-fact-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["rdf-triple-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["gnn-activation-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["pubsub-message-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["canonical-cons-declarations-and-receipts-are-authority"], true);
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);

  console.log("  OK grounding declaration parses with external semantic authority disabled\n");
}

function testSemanticLadderAndConsPointer() {
  console.log("Testing semantic ladder and CONS pointer bridge");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/wordnet-prolog-semantic-grounding.omilisp"));
  const steps = asArray(parsed.declaration["semantic-ladder"].step);
  const pointer = parsed.declaration["cons-pointer"];

  assert.deepStrictEqual(steps.map(recordId), [
    "raw-binary-memory",
    "cons-pointer-embedding",
    "spom-incidence-fact",
    "wordnet-prolog-grounding",
    "graph-message-passing",
    "decentralized-pubsub",
    "semantic-projection-surface"
  ]);
  assert.deepStrictEqual(steps.map((step) => step.order), [0, 1, 2, 3, 4, 5, 6]);
  assert.strictEqual(pointer.sid, "cons-pointer");
  assert.strictEqual(pointer.car, "raw-address-a");
  assert.strictEqual(pointer.cdr, "raw-address-b");
  assert.strictEqual(pointer.predicate, "admissible-boundary-frame");
  assert.strictEqual(pointer.modality, "receipt-verified");
  assert.strictEqual(pointer.receipt, "cons-edge-receipt");

  console.log("  OK CONS pointer is declared as memory edge, relation, and projection handle\n");
}

function testAdapterRolesAndGuardrails() {
  console.log("Testing semantic adapter roles and guardrails");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/wordnet-prolog-semantic-grounding.omilisp"));
  const adapters = asArray(parsed.declaration.adapters.adapter);
  const laws = new Map(asArray(parsed.declaration["projection-laws"].law).map((law) => [recordId(law), law.statement]));
  const guards = new Map(asArray(parsed.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));

  assert.deepStrictEqual(adapters.map(recordId), ["wordnet", "prolog", "rdf", "sparql", "scgnn", "pubsub"]);
  adapters.forEach((adapter) => {
    assert.strictEqual(adapter.authority, false);
  });
  assert.ok(String(laws.get("wordnet-grounding")).includes("do not admit state"));
  assert.ok(String(laws.get("prolog-grounding")).includes("do not define OMI authority"));
  assert.ok(String(laws.get("semantic-web-grounding")).includes("without replacing receipts"));
  assert.ok(String(laws.get("neural-grounding")).includes("receipts admit state"));
  assert.ok(String(laws.get("pubsub-grounding")).includes("connection does not imply trust"));
  assert.ok(String(guards.get("no-wordnet-authority")).includes("not source truth"));
  assert.ok(String(guards.get("no-prolog-authority")).includes("not declaration authority"));
  assert.ok(String(guards.get("no-rdf-authority")).includes("interchange projections"));
  assert.ok(String(guards.get("no-neural-authority")).includes("cannot admit state"));
  assert.ok(String(guards.get("no-pubsub-authority")).includes("do not establish identity"));

  console.log("  OK semantic adapters are projection/grounding surfaces, not authorities\n");
}

function testSemanticGroundingProjections() {
  console.log("Testing semantic grounding projection receipts");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/wordnet-prolog-semantic-grounding.omilisp"));
  const lazy = omilispDeclaration.projectDeclaration(parsed, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsed, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsed, "static");
  const animated = omilispDeclaration.projectDeclaration(parsed, "animated");

  assert.strictEqual(lazy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsed.identity_receipt);
  assert.strictEqual(lazy.sealed_address, "wordnet-prolog-semantic-grounding.self");
  assert.strictEqual(greedy.chart.kind, "semantic.grounding-adapter");
  assert.ok(staticView.declared_space.section_order.includes("semantic-ladder"));
  assert.ok(staticView.declared_space.section_order.includes("adapters"));
  assert.strictEqual(animated.timeline.frame_count, 5040);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);

  console.log("  OK projections preserve semantic grounding identity and separate view receipts\n");
}

function testSemanticGroundingTriangulation() {
  console.log("Testing semantic grounding S-P-O-M triangulation");

  const source = read("declarations/wordnet-prolog-semantic-grounding.omilisp");
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);

  assert.strictEqual(triangulationA.source_kind, "omilisp");
  assert.strictEqual(triangulationA.root, "wordnet-prolog-semantic-grounding");
  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "wordnet-prolog-semantic-grounding" &&
    triplet.predicate === "section" &&
    triplet.object === "semantic-ladder"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "cons-pointer" &&
    triplet.predicate === "predicate" &&
    triplet.object === "admissible-boundary-frame"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "semantic-grounding-spom" &&
    triplet.predicate === "subject" &&
    triplet.object === "cons-car"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "semantic-grounding-spom" &&
    triplet.predicate === "predicate" &&
    triplet.object === "grounded-relation"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "semantic-grounding-spom" &&
    triplet.predicate === "authority" &&
    triplet.object === false
  )));

  console.log("  OK S-P-O-M derives semantic grounding relations without becoming authority\n");
}

function testOmiSelfMapReferencesPhase94() {
  console.log("Testing OMI self-map references semantic grounding adapter");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);
  const semanticAdapters = asArray(parsed.declaration["semantic-grounding-adapters"].adapter);
  const semanticIds = semanticAdapters.map(recordId);

  const required = [
    "docs/PHASE-94-WORDNET-PROLOG-SEMANTIC-GROUNDING-ADAPTER.md",
    "declarations/wordnet-prolog-semantic-grounding.omilisp"
  ];

  assert.ok(semanticIds.includes("wordnet-prolog-semantic-grounding"));
  required.forEach((relPath) => {
    assert.ok(declaredPaths.includes(relPath), `${relPath} must be declared`);
    assert.ok(fs.existsSync(path.join(repoRoot, relPath)), `${relPath} must exist`);
  });

  console.log("  OK OMI self-map references Phase 94 by link only\n");
}

console.log("Testing Phase 94 - WordNet / Prolog Semantic Grounding Adapter");
console.log("================================================================\n");

testSemanticGroundingDeclaration();
testSemanticLadderAndConsPointer();
testAdapterRolesAndGuardrails();
testSemanticGroundingProjections();
testSemanticGroundingTriangulation();
testOmiSelfMapReferencesPhase94();

console.log("\n================================================================");
console.log("ALL PHASE 94 WORDNET / PROLOG SEMANTIC GROUNDING TESTS PASSED");
