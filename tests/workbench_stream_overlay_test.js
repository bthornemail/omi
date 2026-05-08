const assert = require("assert");

const composerShell = require("../workbench/src/composer_shell.js");
const streamDeclaration = require("../workbench/src/stream_declaration.js");
const streamProjection = require("../workbench/src/stream_projection.js");

function buildOverlayDeclaration() {
  return streamDeclaration.createStreamDeclaration("01234567", {
    stream_id: "stream.overlay.demo",
    stream_scope: "pre-os.declaration",
    active_presentation: "barcode",
    regions: [
      {
        start: 0,
        end: 7,
        binary_mode: "raw-binary",
        endian: "little",
        text_direction: "ltr",
        traversal: "car/cdr",
        presentation: "barcode",
        label: "base-default"
      },
      {
        start: 2,
        end: 6,
        binary_mode: "character-encoded",
        endian: "big",
        text_direction: "rtl",
        traversal: "cdr/car",
        presentation: "chart",
        label: "mid-overlay"
      },
      {
        start: 3,
        end: 4,
        binary_mode: "raw-binary",
        endian: "little",
        text_direction: "ltr",
        traversal: "car/cdr",
        presentation: "barcode",
        label: "narrow-overlay"
      }
    ]
  });
}

function testOverlayResolution() {
  console.log("Testing overlapping stream overlay resolution");

  const stream = buildOverlayDeclaration();
  const snapshot = stream.snapshot();
  const projection = streamProjection.projectStreamIndex(snapshot, 3, { mode: "chart" });

  assert.strictEqual(projection.overlay_count, 3);
  assert.deepStrictEqual(projection.overlay_stack.map(function (region) {
    return region.label;
  }), ["base-default", "mid-overlay", "narrow-overlay"]);
  assert.strictEqual(projection.region.label, "narrow-overlay");
  assert.strictEqual(projection.resolved_region.label, "narrow-overlay");
  assert.strictEqual(projection.overlay_receipt, projection.projection_receipt);
  assert.notStrictEqual(projection.overlay_receipt, projection.view_receipt);
  assert.strictEqual(projection.region.rendering.presentation, "chart");
  assert.strictEqual(projection.region.rendering.display_text, "34");
  assert.strictEqual(projection.overlay_stack[0].rendering.display_text, "01234567");
  assert.strictEqual(projection.overlay_stack[1].rendering.display_text, "23456");
  assert.strictEqual(projection.overlay_stack[2].rendering.display_text, "34");

  console.log("  OK overlapping regions resolve as a deterministic overlay stack\n");
}

function testComposerIntegration() {
  console.log("Testing composer shell overlay projection surface");

  const composer = composerShell.createComposer("01234567", {
    sceneId: "stream.overlay.demo"
  });
  composerShell.declareStreamRegion(composer, {
    start: 0,
    end: 7,
    binary_mode: "raw-binary",
    endian: "little",
    text_direction: "ltr",
    traversal: "car/cdr",
    presentation: "barcode",
    label: "base-default"
  });
  composerShell.declareStreamRegion(composer, {
    start: 2,
    end: 6,
    binary_mode: "character-encoded",
    endian: "big",
    text_direction: "rtl",
    traversal: "cdr/car",
    presentation: "chart",
    label: "mid-overlay"
  });
  composerShell.declareStreamRegion(composer, {
    start: 3,
    end: 4,
    binary_mode: "raw-binary",
    endian: "little",
    text_direction: "ltr",
    traversal: "car/cdr",
    presentation: "barcode",
    label: "narrow-overlay"
  });

  const projected = composerShell.inspectStreamProjection(composer, 3, { mode: "chart" });
  const barcode = composerShell.currentStreamProjection(composer);
  composerShell.setStreamPresentation(composer, "chart");
  const chart = composerShell.currentStreamProjection(composer);

  assert.strictEqual(projected.overlay_count, 4);
  assert.deepStrictEqual(projected.overlay_stack.map(function (region) {
    return region.label;
  }), ["stream.0", "base-default", "mid-overlay", "narrow-overlay"]);
  assert.strictEqual(projected.region.label, "narrow-overlay");
  assert.strictEqual(projected.overlay_stack[1].rendering.display_text, "01234567");
  assert.strictEqual(projected.overlay_stack[2].rendering.display_text, "23456");
  assert.strictEqual(projected.overlay_stack[3].rendering.display_text, "34");
  assert.strictEqual(projected.overlay_receipt, projected.projection_receipt);
  assert.strictEqual(barcode.identity_receipt, chart.identity_receipt);
  assert.notStrictEqual(barcode.view_receipt, chart.view_receipt);

  console.log("  OK composer shell projects overlays without mutating declaration authority\n");
}

console.log("Testing Phase 73 - Multi-Region Overlay Projection");
console.log("=================================================\n");

testOverlayResolution();
testComposerIntegration();

console.log("\n=================================================");
console.log("ALL PHASE 73 STREAM OVERLAY TESTS PASSED");
