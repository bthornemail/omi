const assert = require("assert");
const fs = require("fs");
const path = require("path");

const omiTransmutator = require("../workbench/src/omi_transmutator.js");
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

function fixtureSource() {
  return `(omi
  (identity
    (sid transmutator-demo)
    (title "Transmutator Demo")
    (kind semantic.demo))
  (address
    (addr transmutator-demo.self)
    (locator addr128.v0)
    (binding transmutator.demo.v0))
  (scope
    (fs omi)
    (gs transmutator)
    (rs demo)
    (us fact))
  (fact
    (sid cons.ptr.demo)
    (subject raw.addr.a)
    (predicate lexical.synset.relation)
    (object raw.addr.b)
    (modality receipt.verified))
  (receipts
    (identity pending)
    (projection pending)
    (package pending)
    (view pending)))`;
}

function testOmiToSpomRoundtrip() {
  console.log("Testing OMI-Lisp -> S-P-O-M -> OMI-Lisp roundtrip");

  const source = fixtureSource();
  const original = omilispDeclaration.parseDeclaration(source);
  const spom = omiTransmutator.transmute(source, { from: "omilisp", to: "spom" });
  const reparsed = omilispDeclaration.parseDeclaration(spom.source);

  assert.strictEqual(spom.identity_receipt, original.identity_receipt);
  assert.strictEqual(reparsed.identity_receipt, original.identity_receipt);
  assert.strictEqual(spom.adapter_authority, false);
  assert.ok(spom.projection.triplets.some((triplet) => (
    triplet.subject === "transmutator-demo" &&
    triplet.predicate === "section" &&
    triplet.object === "fact"
  )));

  console.log("  OK S-P-O-M projection preserves canonical OMI identity\n");
}

function testOmiToPrologRoundtrip() {
  console.log("Testing OMI-Lisp -> Prolog-like facts -> OMI-Lisp roundtrip");

  const source = fixtureSource();
  const original = omilispDeclaration.parseDeclaration(source);
  const prolog = omiTransmutator.transmute(source, { from: "omilisp", to: "prolog" });
  const roundtrip = omiTransmutator.transmute(prolog.projection, { from: "prolog", to: "omilisp" });

  assert.strictEqual(prolog.identity_receipt, original.identity_receipt);
  assert.strictEqual(roundtrip.identity_receipt, original.identity_receipt);
  assert.ok(prolog.projection.includes("omi_identity_receipt(" + original.identity_receipt + ")"));
  assert.ok(prolog.projection.includes("adapter_authority(false)."));
  assert.strictEqual(prolog.adapter_authority, false);
  assert.strictEqual(roundtrip.adapter_authority, false);

  console.log("  OK Prolog-like projection returns to the same canonical identity receipt\n");
}

function testOmiToRdfRoundtrip() {
  console.log("Testing OMI-Lisp -> RDF-like triples -> OMI-Lisp roundtrip");

  const source = fixtureSource();
  const original = omilispDeclaration.parseDeclaration(source);
  const rdf = omiTransmutator.transmute(source, { from: "omilisp", to: "rdf" });
  const roundtrip = omiTransmutator.transmute(rdf.projection, { from: "rdf", to: "omilisp" });

  assert.strictEqual(rdf.identity_receipt, original.identity_receipt);
  assert.strictEqual(roundtrip.identity_receipt, original.identity_receipt);
  assert.strictEqual(rdf.projection.type, "rdf-like-triples");
  assert.strictEqual(rdf.projection.adapter_authority, false);
  assert.ok(rdf.projection.triples.some((triple) => (
    triple.subject === "cons.ptr.demo" &&
    triple.predicate === "predicate" &&
    triple.object === "lexical.synset.relation"
  )));

  console.log("  OK RDF-like projection returns to the same canonical identity receipt\n");
}

function testOmiToJsonRoundtrip() {
  console.log("Testing OMI-Lisp -> JSON-like projection -> OMI-Lisp roundtrip");

  const source = fixtureSource();
  const original = omilispDeclaration.parseDeclaration(source);
  const json = omiTransmutator.transmute(source, { from: "omilisp", to: "json" });
  const roundtrip = omiTransmutator.transmute(json.projection, { from: "json", to: "omilisp" });

  assert.strictEqual(json.identity_receipt, original.identity_receipt);
  assert.strictEqual(roundtrip.identity_receipt, original.identity_receipt);
  assert.strictEqual(json.projection.type, "json-like-projection");
  assert.strictEqual(json.projection.adapter_authority, false);
  assert.strictEqual(json.projection.declaration_summary.sid, "transmutator-demo");
  assert.ok(json.projection.spom_summary.some((triplet) => (
    triplet.subject === "cons.ptr.demo" &&
    triplet.predicate === "object" &&
    triplet.object === "raw.addr.b"
  )));

  console.log("  OK JSON-like projection returns to the same canonical identity receipt\n");
}

function testPhraseSynsetGrounding() {
  console.log("Testing phrase / synset stub grounding");

  const grounded = omiTransmutator.transmute({
    phrase: "move from staccato to legato",
    synset: "synset.flow.n.01",
    relation: "lexical-grounding"
  }, { from: "phrase", to: "spom" });
  const projectionAgain = omiTransmutator.transmute(grounded.source, { from: "omilisp", to: "spom" });

  assert.strictEqual(grounded.kind, "phrase-synset-grounding");
  assert.strictEqual(grounded.adapter_authority, false);
  assert.strictEqual(grounded.declaration.declaration.identity.kind, "semantic.grounding-projection");
  assert.notStrictEqual(grounded.projection_receipt, projectionAgain.projection_receipt);
  assert.ok(grounded.projection.triangulation.triplets.some((triplet) => (
    triplet.subject.startsWith("phrase-grounding-") &&
    triplet.predicate === "synset" &&
    triplet.object === "synset.flow.n.01"
  )));

  console.log("  OK phrase grounding changes projection receipt while OMI declaration remains authority\n");
}

function testAdapterAuthorityGuards() {
  console.log("Testing transmutator adapter authority guardrails");

  const source = fixtureSource();
  const prolog = omiTransmutator.transmute(source, { from: "omilisp", to: "prolog" });
  const rdf = omiTransmutator.transmute(source, { from: "omilisp", to: "rdf" });
  const json = omiTransmutator.transmute(source, { from: "omilisp", to: "json" });
  const spom = omiTransmutator.transmute(source, { from: "omilisp", to: "spom" });

  assert.strictEqual(prolog.adapter_authority, false);
  assert.strictEqual(rdf.adapter_authority, false);
  assert.strictEqual(json.adapter_authority, false);
  assert.strictEqual(spom.adapter_authority, false);
  assert.strictEqual(rdf.projection.adapter_authority, false);
  assert.strictEqual(json.projection.adapter_authority, false);
  assert.strictEqual(prolog.identity_receipt, rdf.identity_receipt);
  assert.strictEqual(rdf.identity_receipt, spom.identity_receipt);
  assert.strictEqual(json.identity_receipt, spom.identity_receipt);
  assert.notStrictEqual(prolog.projection_receipt, rdf.projection_receipt);
  assert.notStrictEqual(rdf.projection_receipt, json.projection_receipt);
  assert.notStrictEqual(rdf.projection_receipt, spom.projection_receipt);

  console.log("  OK target syntax and adapters remain projections, not authorities\n");
}

function testTransmutatorDeclarationAndSelfMap() {
  console.log("Testing transmutator declaration and OMI self-map references");

  const source = read("declarations/omi-transmutator-roundtrip.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const compatibility = asArray(parsedA.declaration["orientation-algebra-compatibility"].model);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const transmutators = asArray(selfMap.declaration["transmutator-courts"].court);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "omi-transmutator-roundtrip");
  assert.strictEqual(parsedA.declaration.identity.kind, "transmutator.roundtrip-court");
  assert.strictEqual(parsedA.declaration.rule["transmutator-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["target-syntax-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["canonical-omi-declaration-and-receipts-are-authority"], true);
  assert.deepStrictEqual(compatibility.map(recordId), [
    "cayley-dickson-like-doubling",
    "modified-split-forms",
    "trigintaduonion-triads",
    "sixty-four-dimensional-continuation",
    "neural-gnn-transformer-backends"
  ]);
  compatibility.forEach((model) => {
    assert.strictEqual(model.authority, false);
  });
  assert.ok(String(guards.get("orientation-model-not-authority")).includes("not authority"));
  assert.ok(String(guards.get("neural-backend-not-authority")).includes("one backend"));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "omi-transmutator-roundtrip" &&
    triplet.predicate === "section" &&
    triplet.object === "transmutator-law"
  )));
  assert.ok(transmutators.map(recordId).includes("omi-transmutator-roundtrip"));
  assert.ok(declaredPaths.includes("docs/PHASE-95-OMI-TRANSMUTATOR-ROUNDTRIP-COURT.md"));
  assert.ok(declaredPaths.includes("declarations/omi-transmutator-roundtrip.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/omi_transmutator.js"));

  console.log("  OK transmutator doctrine parses, triangulates, and is referenced by link only\n");
}

console.log("Testing Phase 95 - OMI Transmutator Roundtrip Court");
console.log("==================================================\n");

testOmiToSpomRoundtrip();
testOmiToPrologRoundtrip();
testOmiToRdfRoundtrip();
testOmiToJsonRoundtrip();
testPhraseSynsetGrounding();
testAdapterAuthorityGuards();
testTransmutatorDeclarationAndSelfMap();

console.log("\n==================================================");
console.log("ALL PHASE 95 OMI TRANSMUTATOR ROUNDTRIP TESTS PASSED");
