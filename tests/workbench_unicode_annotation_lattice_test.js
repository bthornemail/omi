const assert = require("assert");
const fs = require("fs");
const path = require("path");

const unicodeLattice = require("../workbench/src/unicode_annotation_lattice.js");
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

function alchemicalBlock() {
  return {
    sid: "unicode-alchemical-symbols",
    unicode_version: "15.1.0",
    start: "U+1F700",
    end: "U+1F77F",
    row_width: 16,
    role: "symbolic-feature-space",
    projection: "scgnn-feature-mask"
  };
}

function testBlockPartitioning() {
  console.log("Testing Unicode block partition and bitmask feature mapping");

  const block = unicodeLattice.createBlock(alchemicalBlock());
  const feature = unicodeLattice.codepointFeature(block, "U+1F702");
  const sameFeature = unicodeLattice.codepointFeature(alchemicalBlock(), "U+1F702");

  assert.strictEqual(block.sid, "unicode-alchemical-symbols");
  assert.strictEqual(block.unicode_version, "15.1.0");
  assert.strictEqual(block.authority, false);
  assert.strictEqual(block.codepoint_count, 128);
  assert.deepStrictEqual(feature, sameFeature);
  assert.strictEqual(feature.codepoint, "U+1F702");
  assert.strictEqual(feature.offset, 2);
  assert.strictEqual(feature.row, 0);
  assert.strictEqual(feature.column, 2);
  assert.strictEqual(feature.bitmask_hex, "0x00000004");
  assert.strictEqual(feature.authority, false);

  console.log("  OK codepoint partitions deterministically into a non-authoritative bitmask feature\n");
}

function testLexemeAnnotationReceipts() {
  console.log("Testing lexeme / synset annotation receipts");

  const first = unicodeLattice.annotateLexeme({
    block: alchemicalBlock(),
    lexeme: "fire",
    synset: "synset.fire.n.01",
    relation: "evokes-symbol",
    codepoint: "U+1F702"
  });
  const second = unicodeLattice.annotateLexeme({
    block: alchemicalBlock(),
    lexeme: "fire",
    synset: "synset.fire.n.01",
    relation: "evokes-symbol",
    codepoint: "U+1F703"
  });
  const staticView = unicodeLattice.projectAnnotation(first, "static");
  const chartView = unicodeLattice.projectAnnotation(first, "chart");

  assert.strictEqual(first.identity_receipt, second.identity_receipt);
  assert.notStrictEqual(first.projection_receipt, second.projection_receipt);
  assert.strictEqual(first.adapter_authority, false);
  assert.strictEqual(first.spom.subject, "lexeme.fire");
  assert.strictEqual(first.spom.predicate, "evokes-symbol");
  assert.strictEqual(first.spom.object, "synset.fire.n.01");
  assert.strictEqual(first.spom.modality, "unicode.annotation.projection");
  assert.strictEqual(staticView.identity_receipt, first.identity_receipt);
  assert.strictEqual(chartView.identity_receipt, first.identity_receipt);
  assert.notStrictEqual(staticView.view_receipt, chartView.view_receipt);

  console.log("  OK annotation changes projection receipts while lexical identity stays stable\n");
}

function testDeclarationAndTriangulation() {
  console.log("Testing Phase 96 declaration and S-P-O-M triangulation");

  const source = read("declarations/unicode-lexeme-bitmask-annotation-lattice.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulation = spomAdapter.triangulateSource(source);
  const blocks = asArray(parsedA.declaration["unicode-blocks"].block);
  const blockIds = blocks.map(recordId);
  const guards = asArray(parsedA.declaration["privacy-guardrails"].guard);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "unicode-lexeme-bitmask-annotation-lattice");
  assert.strictEqual(parsedA.declaration.identity.kind, "annotation.unicode-bitmask-lattice");
  assert.strictEqual(parsedA.declaration.rules["unicode-codepoint-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rules["unicode-block-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rules["canonical-declarations-and-receipts-are-authority"], true);
  assert.deepStrictEqual(blockIds, [
    "unicode-alchemical-symbols",
    "unicode-braille-patterns",
    "unicode-musical-symbols"
  ]);
  blocks.forEach((block) => {
    assert.strictEqual(block.authority, false);
    assert.strictEqual(block["unicode-version"], "15.1.0");
  });
  assert.ok(guards.some((guard) => String(guard.statement).includes("not psychological diagnoses")));
  assert.ok(guards.some((guard) => String(guard.statement).includes("explicit consent")));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "unicode-lexeme-bitmask-annotation-lattice" &&
    triplet.predicate === "section" &&
    triplet.object === "unicode-blocks"
  )));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "word-fire-alchemical-projection" &&
    triplet.predicate === "authority" &&
    triplet.object === false
  )));

  console.log("  OK declaration parses, triangulates, and keeps annotation authority disabled\n");
}

function testOmiSystemReferences() {
  console.log("Testing OMI self-map references Phase 96 by link only");

  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const lattices = asArray(selfMap.declaration["annotation-lattices"].lattice);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.ok(lattices.map(recordId).includes("unicode-lexeme-bitmask-annotation-lattice"));
  assert.ok(declaredPaths.includes("docs/PHASE-96-UNICODE-LEXEME-BITMASK-ANNOTATION-LATTICE.md"));
  assert.ok(declaredPaths.includes("declarations/unicode-lexeme-bitmask-annotation-lattice.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/unicode_annotation_lattice.js"));
  assert.ok(!JSON.stringify(selfMap.declaration["annotation-lattices"]).includes("U+1F702"));

  console.log("  OK self-map references the annotation lattice without copying examples\n");
}

console.log("Testing Phase 96 - Unicode Lexeme Bitmask Annotation Lattice");
console.log("============================================================\n");

testBlockPartitioning();
testLexemeAnnotationReceipts();
testDeclarationAndTriangulation();
testOmiSystemReferences();

console.log("\n============================================================");
console.log("ALL PHASE 96 UNICODE ANNOTATION LATTICE TESTS PASSED");
