const assert = require("assert");

const blockImageDeclaration = require("../workbench/src/block_image_declaration.js");
const blockImageProjection = require("../workbench/src/block_image_projection.js");
const composerShell = require("../workbench/src/composer_shell.js");

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
    active_view_mode: "barcode",
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

function testProjectionModes() {
  console.log("Testing block image projection modes");

  const declaration = blockImageDeclaration.createBlockImageDeclaration(fixtureDeclaration());
  const lazy = blockImageProjection.projectBlockImageProjection(declaration, {
    mode: "lazy",
    view_mode: "barcode"
  });
  const greedy = blockImageProjection.projectBlockImageProjection(declaration, {
    mode: "greedy",
    view_mode: "chart"
  });
  const staticView = blockImageProjection.projectBlockImageProjection(declaration, {
    mode: "static",
    view_mode: "summary"
  });
  const animated = blockImageProjection.projectBlockImageProjection(declaration, {
    mode: "animated",
    view_mode: "sweep"
  });
  const lazyAltView = blockImageProjection.projectBlockImageProjection(declaration, {
    mode: "lazy",
    view_mode: "chart"
  });

  assert.strictEqual(lazy.identity_receipt, declaration.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, declaration.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, declaration.identity_receipt);
  assert.strictEqual(animated.identity_receipt, declaration.identity_receipt);

  assert.strictEqual(lazy.projection_mode, "lazy");
  assert.strictEqual(lazy.lens, "barcode");
  assert.strictEqual(lazy.barcode_manifest.length, 3);
  assert.strictEqual(lazy.barcode_manifest[1].sparse, true);

  assert.strictEqual(greedy.projection_mode, "greedy");
  assert.strictEqual(greedy.lens, "chart");
  assert.strictEqual(greedy.chunk_chart.length, 3);
  assert.strictEqual(greedy.chunk_chart[0].occupancy, "block");
  assert.strictEqual(greedy.chunk_chart[1].occupancy, "hole");

  assert.strictEqual(staticView.projection_mode, "static");
  assert.strictEqual(staticView.lens, "reconciliation");
  assert.strictEqual(staticView.reconciliation_summary.summary_kind, "reconciliation");
  assert.strictEqual(staticView.reconciliation_summary.layout_receipt, staticView.reconciliation_summary.layout_receipt);
  assert.strictEqual(staticView.reconciliation_summary.overlay_count, 3);

  assert.strictEqual(animated.projection_mode, "animated");
  assert.strictEqual(animated.lens, "sweep");
  assert.strictEqual(animated.chunk_sweep.frame_count, 5040);
  assert.strictEqual(animated.chunk_sweep.chunk_sweep.length, 3);
  assert.strictEqual(animated.chunk_sweep.chunk_sweep[1].sparse, true);

  assert.notStrictEqual(lazy.projection_receipt, greedy.projection_receipt);
  assert.notStrictEqual(greedy.projection_receipt, staticView.projection_receipt);
  assert.notStrictEqual(staticView.projection_receipt, animated.projection_receipt);
  assert.strictEqual(lazy.projection_receipt, lazyAltView.projection_receipt);
  assert.notStrictEqual(lazy.view_receipt, lazyAltView.view_receipt);
  assert.strictEqual(lazy.identity_receipt, lazyAltView.identity_receipt);

  console.log("  OK block image projection modes are deterministic and identity-stable\n");
}

function testComposerShellProjectionSurface() {
  console.log("Testing composer shell block image projection surface");

  const declaration = blockImageDeclaration.createBlockImageDeclaration(fixtureDeclaration());
  const projected = composerShell.projectBlockImageProjection(declaration, {
    mode: "greedy",
    view_mode: "chart"
  });
  const projectedAgain = composerShell.projectBlockImageProjection(declaration.snapshot(), {
    mode: "greedy",
    view_mode: "chart"
  });

  assert.strictEqual(projected.identity_receipt, declaration.identity_receipt);
  assert.strictEqual(projected.projection_mode, "greedy");
  assert.strictEqual(projected.view_mode, "chart");
  assert.strictEqual(projected.chunk_chart.length, 3);
  assert.strictEqual(projected.projection_receipt, projectedAgain.projection_receipt);
  assert.strictEqual(projected.view_receipt, projectedAgain.view_receipt);

  console.log("  OK composer shell exposes deterministic block image projection\n");
}

function testRejectionPaths() {
  console.log("Testing block image projection rejection paths");

  assert.throws(function () {
    blockImageProjection.projectBlockImageProjection(null, { mode: "lazy" });
  }, /invalid-block-image-projection/);

  assert.throws(function () {
    blockImageProjection.projectBlockImageProjection(fixtureDeclaration(), { mode: "unknown" });
  }, /invalid-block-image-projection/);

  console.log("  OK malformed projection requests reject deterministically\n");
}

console.log("Testing Phase 78 - OMI Block Image Projection Court");
console.log("=====================================================\n");

testProjectionModes();
testComposerShellProjectionSurface();
testRejectionPaths();

console.log("\n=====================================================");
console.log("ALL PHASE 78 BLOCK IMAGE PROJECTION TESTS PASSED");
