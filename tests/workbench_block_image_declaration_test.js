const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const blockImageDeclaration = require("../workbench/src/block_image_declaration.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function makeBytes(seed, size) {
  const bytes = [];
  for (let i = 0; i < size; i += 1) {
    bytes.push((seed + i) & 0xff);
  }
  return bytes;
}

function fixtureDeclaration() {
  return {
    block_image_id: "image.disk.demo",
    omi_path: "image.disk.demo",
    block_scope: "public.global",
    identity_anchor: "image.disk.demo.anchor",
    block_size: 8,
    total_size: 24,
    active_projection_mode: "lazy",
    active_view_mode: "lazy",
    chunks: [
      {
        offset: 0,
        size: 8,
        bytes: makeBytes(0x10, 8),
        label: "boot",
        path: "image.disk.demo/chunk/boot"
      },
      {
        offset: 8,
        size: 8,
        sparse: true,
        label: "hole",
        path: "image.disk.demo/chunk/hole"
      },
      {
        offset: 16,
        size: 8,
        content_hash: 0x12345678,
        label: "data",
        path: "image.disk.demo/chunk/data"
      }
    ]
  };
}

function testDeclarationAndProjection() {
  console.log("Testing block image declaration normalization and projection");

  const raw = fixtureDeclaration();
  const text = JSON.stringify(raw);
  const declarationA = blockImageDeclaration.createBlockImageDeclaration(raw);
  const declarationB = blockImageDeclaration.createBlockImageDeclaration(text);
  const lazy = blockImageDeclaration.projectBlockImageDeclaration(declarationA, { mode: "lazy", view_mode: "lazy" });
  const greedy = blockImageDeclaration.projectBlockImageDeclaration(declarationA, { mode: "greedy", view_mode: "greedy" });
  const staticView = blockImageDeclaration.projectBlockImageDeclaration(declarationA, { mode: "static", view_mode: "static" });
  const animated = blockImageDeclaration.projectBlockImageDeclaration(declarationA, { mode: "animated", view_mode: "animated" });

  assert.strictEqual(declarationA.block_size, 8);
  assert.strictEqual(declarationA.total_size, 24);
  assert.strictEqual(declarationA.chunk_count, 3);
  assert.strictEqual(declarationA.sparse_chunk_count, 1);
  assert.strictEqual(declarationA.dense_chunk_count, 2);
  assert.strictEqual(declarationA.identity_receipt, declarationB.identity_receipt);
  assert.strictEqual(declarationA.chunk_table_receipt, declarationB.chunk_table_receipt);
  assert.strictEqual(declarationA.chunks[0].chunk_receipt, declarationB.chunks[0].chunk_receipt);
  assert.strictEqual(declarationA.chunks[1].sparse, true);
  assert.strictEqual(declarationA.chunks[1].present, false);
  assert.strictEqual(declarationA.chunks[2].content_hash, 0x12345678);

  assert.strictEqual(lazy.identity_receipt, declarationA.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, declarationA.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, declarationA.identity_receipt);
  assert.strictEqual(animated.identity_receipt, declarationA.identity_receipt);
  assert.notStrictEqual(lazy.projection_receipt, greedy.projection_receipt);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.projection_receipt, staticView.projection_receipt);
  assert.notStrictEqual(staticView.projection_receipt, animated.projection_receipt);
  assert.strictEqual(animated.frame_count, 5040);
  assert.strictEqual(lazy.sealed_chunks.length, 3);
  assert.strictEqual(greedy.chunks.length, 3);
  assert.strictEqual(staticView.layout[1].sparse, true);
  assert.strictEqual(animated.timeline.length, 3);
  assert.strictEqual(animated.timeline[1].sparse, true);

  console.log("  OK declaration and projections are deterministic\n");
}

function testSnapshotExportImport() {
  console.log("Testing block image snapshot export/import");

  const declaration = blockImageDeclaration.createBlockImageDeclaration(fixtureDeclaration());
  const bundleA = blockImageDeclaration.exportBlockImageSnapshot(declaration, {
    projection_mode: "greedy",
    view_mode: "static"
  });
  const bundleB = blockImageDeclaration.exportBlockImageSnapshot(declaration, {
    projection_mode: "greedy",
    view_mode: "static"
  });

  assert.deepStrictEqual(bundleA, bundleB);

  const manifest = JSON.parse(bundleA.files["manifest.json"]);
  const receipts = JSON.parse(bundleA.files["receipts/receipts.json"]);
  const projection = JSON.parse(bundleA.files["projection/projection.json"]);
  const imported = blockImageDeclaration.importBlockImageSnapshot(bundleA);

  assert.strictEqual(manifest.package_kind, "block-image-declaration");
  assert.strictEqual(manifest.block_image_id, "image.disk.demo");
  assert.strictEqual(manifest.identity_receipt, declaration.identity_receipt);
  assert.strictEqual(manifest.projection_receipt, imported.manifest.projection_receipt);
  assert.strictEqual(manifest.view_receipt, imported.manifest.view_receipt);
  assert.strictEqual(receipts.identity_receipt, declaration.identity_receipt);
  assert.strictEqual(receipts.chunk_table_receipt, declaration.chunk_table_receipt);
  assert.strictEqual(imported.declaration.identity_receipt, declaration.identity_receipt);
  assert.strictEqual(imported.declaration.chunk_table_receipt, declaration.chunk_table_receipt);
  assert.strictEqual(imported.projection.identity_receipt, declaration.identity_receipt);
  assert.strictEqual(projection.mode, "greedy");
  assert.strictEqual(projection.lens, "expanded");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omi-block-image-"));
  blockImageDeclaration.writeSnapshot(tempDir, bundleA);
  const importedFromDir = blockImageDeclaration.importBlockImageSnapshot(tempDir);
  assert.strictEqual(importedFromDir.manifest.package_receipt, manifest.package_receipt);
  assert.deepStrictEqual(importedFromDir.manifest.file_receipts, manifest.file_receipts);
  assert.strictEqual(importedFromDir.declaration.identity_receipt, declaration.identity_receipt);

  console.log("  OK snapshot export/import is deterministic and replayable\n");
}

function testRejectionPaths() {
  console.log("Testing block image rejection paths");

  assert.throws(function () {
    blockImageDeclaration.createBlockImageDeclaration({
      omi_path: "image.invalid",
      block_scope: "public.global",
      total_size: 8,
      chunks: [
        { offset: 0, size: 8, sparse: true }
      ]
    });
  }, /invalid-block-image-declaration/);

  assert.throws(function () {
    blockImageDeclaration.createBlockImageDeclaration({
      block_image_id: "image.invalid.offset",
      omi_path: "image.invalid.offset",
      block_scope: "public.global",
      block_size: 8,
      total_size: 16,
      chunks: [
        { offset: 4, size: 8, bytes: makeBytes(0x01, 8) },
        { offset: 12, size: 4, sparse: true }
      ]
    });
  }, /invalid-chunk-offset|invalid-chunk-size|non-contiguous-chunk-layout/);

  assert.throws(function () {
    blockImageDeclaration.createBlockImageDeclaration({
      block_image_id: "image.invalid.sparse",
      omi_path: "image.invalid.sparse",
      block_scope: "public.global",
      block_size: 8,
      total_size: 8,
      chunks: [
        { offset: 0, size: 8, sparse: true, bytes: makeBytes(0x20, 8) }
      ]
    });
  }, /invalid-sparse-chunk/);

  const bundle = blockImageDeclaration.exportBlockImageSnapshot(
    blockImageDeclaration.createBlockImageDeclaration(fixtureDeclaration()),
    { projection_mode: "lazy", view_mode: "lazy" }
  );
  const badManifest = JSON.parse(bundle.files["manifest.json"]);
  badManifest.package_receipt = 0;
  const tampered = {
    files: Object.assign({}, bundle.files),
    manifest: badManifest
  };
  tampered.files["manifest.json"] = JSON.stringify(badManifest);
  assert.throws(function () {
    blockImageDeclaration.importBlockImageSnapshot(tampered);
  }, /invalid-package-receipt/);

  console.log("  OK malformed declarations and snapshot tampering reject deterministically\n");
}

console.log("Testing Phase 77 - OMI Block Image Declaration Court");
console.log("=====================================================\n");

testDeclarationAndProjection();
testSnapshotExportImport();
testRejectionPaths();

console.log("\n=====================================================");
console.log("ALL PHASE 77 BLOCK IMAGE DECLARATION TESTS PASSED");
