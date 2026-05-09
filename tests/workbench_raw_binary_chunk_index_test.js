const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rawBinaryChunkIndex = require("../workbench/src/raw_binary_chunk_index.js");
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

function fixtureBytes() {
  return [
    0x10, 0x11, 0x12, 0x13,
    0x00, 0x00, 0x00, 0x00,
    0x20, 0x21, 0x22, 0x23
  ];
}

function createFixtureIndex(bytes) {
  return rawBinaryChunkIndex.createRawBinaryChunkIndex({
    index_id: "raw.demo",
    omi_path: "raw.demo",
    scope: "public.global",
    identity_anchor: "raw.demo.anchor",
    block_size: 4,
    bytes: bytes || fixtureBytes()
  });
}

function testDeterministicChunking() {
  console.log("Testing deterministic raw binary chunking");

  const indexA = createFixtureIndex();
  const indexB = createFixtureIndex();

  assert.deepStrictEqual(indexA.snapshot(), indexB.snapshot());
  assert.strictEqual(indexA.identity_receipt, indexB.identity_receipt);
  assert.strictEqual(indexA.index_receipt, indexB.index_receipt);
  assert.strictEqual(indexA.block_size, 4);
  assert.strictEqual(indexA.total_size, 12);
  assert.strictEqual(indexA.chunk_count, 3);
  assert.strictEqual(indexA.sparse_chunk_count, 1);
  assert.strictEqual(indexA.dense_chunk_count, 2);
  assert.deepStrictEqual(indexA.chunks.map((chunk) => chunk.offset), [0, 4, 8]);
  assert.deepStrictEqual(indexA.chunks.map((chunk) => chunk.size), [4, 4, 4]);

  console.log("  OK same bytes and block size produce stable chunks and index receipt\n");
}

function testChangedByteAffectsOnlyChangedChunk() {
  console.log("Testing content edit changes affected chunk receipt");

  const original = createFixtureIndex();
  const editedBytes = fixtureBytes();
  editedBytes[9] = 0x99;
  const edited = createFixtureIndex(editedBytes);
  const changed = original.chunks
    .map((chunk, index) => chunk.chunk_receipt !== edited.chunks[index].chunk_receipt)
    .map((didChange, index) => didChange ? index : null)
    .filter((index) => index !== null);

  assert.deepStrictEqual(changed, [2]);
  assert.notStrictEqual(original.chunks[2].content_hash, edited.chunks[2].content_hash);
  assert.notStrictEqual(original.chunks[2].chunk_receipt, edited.chunks[2].chunk_receipt);
  assert.notStrictEqual(original.index_receipt, edited.index_receipt);
  assert.notStrictEqual(original.identity_receipt, edited.identity_receipt);

  console.log("  OK content edit changes exactly the affected chunk and index receipt\n");
}

function testSparseAndDenseChunks() {
  console.log("Testing sparse holes and dense content hashes");

  const index = createFixtureIndex();

  assert.strictEqual(index.chunks[0].sparse, false);
  assert.strictEqual(index.chunks[0].present, true);
  assert.strictEqual(index.chunks[0].sparse_marker, "present-bytes");
  assert.strictEqual(typeof index.chunks[0].content_hash, "number");
  assert.strictEqual(index.chunks[1].sparse, true);
  assert.strictEqual(index.chunks[1].present, false);
  assert.strictEqual(index.chunks[1].sparse_marker, "declarative-hole");
  assert.strictEqual(index.chunks[1].content_hash, null);
  assert.strictEqual(typeof index.chunks[1].chunk_receipt, "number");
  assert.strictEqual(index.chunks[2].sparse, false);
  assert.strictEqual(typeof index.chunks[2].content_hash, "number");

  console.log("  OK all-zero blocks are declared holes and dense blocks carry content hashes\n");
}

function testProjectionReceipts() {
  console.log("Testing raw binary chunk index projection receipts");

  const index = createFixtureIndex();
  const lazy = rawBinaryChunkIndex.projectRawBinaryChunkIndex(index, { mode: "lazy", view_mode: "lazy" });
  const greedy = rawBinaryChunkIndex.projectRawBinaryChunkIndex(index, { mode: "greedy", view_mode: "greedy" });
  const staticView = rawBinaryChunkIndex.projectRawBinaryChunkIndex(index, { mode: "static", view_mode: "static" });
  const animated = rawBinaryChunkIndex.projectRawBinaryChunkIndex(index, { mode: "animated", view_mode: "animated" });

  assert.strictEqual(lazy.identity_receipt, index.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, index.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, index.identity_receipt);
  assert.strictEqual(animated.identity_receipt, index.identity_receipt);
  assert.notStrictEqual(lazy.projection_receipt, greedy.projection_receipt);
  assert.notStrictEqual(greedy.projection_receipt, staticView.projection_receipt);
  assert.notStrictEqual(staticView.projection_receipt, animated.projection_receipt);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.strictEqual(lazy.lens, "sealed-chunk-manifest");
  assert.strictEqual(greedy.lens, "expanded-chunk-chart");
  assert.strictEqual(staticView.lens, "receipt-reconciliation");
  assert.strictEqual(animated.lens, "offset-sweep");
  assert.strictEqual(animated.frame_count, 5040);
  assert.strictEqual(staticView.layout[1].sparse_marker, "declarative-hole");

  console.log("  OK projection/view modes preserve identity and produce distinct receipts\n");
}

function testDeclarationParsesAndTriangulates() {
  console.log("Testing raw binary chunk index declaration and S-P-O-M triangulation");

  const source = read("declarations/raw-binary-chunk-receipt-index.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.root, "omi");
  assert.strictEqual(parsedA.declaration.identity.sid, "raw-binary-chunk-receipt-index");
  assert.strictEqual(parsedA.declaration.identity.kind, "lattice.chunk-receipt-index");
  assert.strictEqual(parsedA.declaration.rule["raw-bytes-are-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["chunk-receipts-are-witnesses"], true);
  assert.strictEqual(parsedA.declaration.rule["sparse-chunks-are-declared-holes"], true);
  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "raw-binary-chunk-receipt-index" &&
    triplet.predicate === "section" &&
    triplet.object === "core-object"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "chunk" &&
    triplet.predicate === "role" &&
    triplet.object === "receipt-index-entry"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "chunk" &&
    triplet.predicate === "field-offset" &&
    triplet.object === "offset"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "identity_receipt" &&
    triplet.predicate === "role" &&
    triplet.object === "index-authority-witness"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "no-qemu" &&
    triplet.predicate === "statement" &&
    String(triplet.object).includes("does not open QEMU")
  )));

  console.log("  OK declaration parses and S-P-O-M derives chunk/index relations\n");
}

function testOmiSelfMapReferencesPhase90() {
  console.log("Testing OMI self-map references raw binary chunk receipt index");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const receiptCourts = asArray(parsed.declaration["receipt-courts"].court);
  const declaredPaths = surfaces.map((surface) => surface.path);
  const courtIds = receiptCourts.map(recordId);

  assert.ok(courtIds.includes("raw-binary-chunk-receipt-index"));
  assert.ok(declaredPaths.includes("declarations/raw-binary-chunk-receipt-index.omilisp"));
  assert.ok(declaredPaths.includes("docs/PHASE-90-RAW-BINARY-CHUNK-RECEIPT-INDEX.md"));
  assert.ok(fs.existsSync(path.join(repoRoot, "workbench/src/raw_binary_chunk_index.js")));
  assert.ok(fs.existsSync(path.join(repoRoot, "declarations/raw-binary-chunk-receipt-index.omilisp")));
  assert.ok(fs.existsSync(path.join(repoRoot, "docs/PHASE-90-RAW-BINARY-CHUNK-RECEIPT-INDEX.md")));

  console.log("  OK OMI self-map references Phase 90 by link without copying runtime behavior\n");
}

console.log("Testing Phase 90 - Raw Binary Chunk Receipt Index");
console.log("==================================================\n");

testDeterministicChunking();
testChangedByteAffectsOnlyChangedChunk();
testSparseAndDenseChunks();
testProjectionReceipts();
testDeclarationParsesAndTriangulates();
testOmiSelfMapReferencesPhase90();

console.log("\n==================================================");
console.log("ALL PHASE 90 RAW BINARY CHUNK INDEX TESTS PASSED");
