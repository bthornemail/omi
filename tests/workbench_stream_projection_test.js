const assert = require("assert");

const composerShell = require("../workbench/src/composer_shell.js");
const streamDeclaration = require("../workbench/src/stream_declaration.js");
const streamProjection = require("../workbench/src/stream_projection.js");

function buildDeclaration() {
  return streamDeclaration.createStreamDeclaration("\u0000\u001f!09AB", {
    stream_id: "stream.projection.demo",
    stream_scope: "pre-os.declaration",
    active_presentation: "barcode",
    regions: [
      {
        start: 0,
        end: 2,
        binary_mode: "raw-binary",
        endian: "little",
        text_direction: "ltr",
        traversal: "car/cdr",
        presentation: "barcode",
        label: "sealed-carrier"
      },
      {
        start: 3,
        end: 6,
        binary_mode: "character-encoded",
        endian: "big",
        text_direction: "rtl",
        traversal: "cdr/car",
        presentation: "chart",
        label: "decoded-chart"
      }
    ]
  });
}

function testProjectionModes() {
  console.log("Testing scoped stream projection modes");

  const stream = buildDeclaration();
  const snapshot = stream.snapshot();
  const barcode = streamProjection.projectStreamDeclaration(snapshot, { mode: "barcode" });
  const chart = streamProjection.projectStreamDeclaration(snapshot, { mode: "chart" });
  const indexed = streamProjection.projectStreamIndex(snapshot, 4, { mode: "chart" });

  assert.strictEqual(barcode.identity_receipt, chart.identity_receipt);
  assert.notStrictEqual(barcode.view_receipt, chart.view_receipt);
  assert.notStrictEqual(barcode.projection_receipt, chart.projection_receipt);
  assert.strictEqual(barcode.mode, "barcode");
  assert.strictEqual(chart.mode, "chart");
  assert.strictEqual(barcode.region_count, 2);
  assert.strictEqual(barcode.regions[0].rendering.storage_hex, "00 1f 21");
  assert.strictEqual(barcode.regions[0].rendering.display_text, "\u0000\u001f!");
  assert.strictEqual(chart.regions[1].rendering.storage_hex, "42 41 39 30");
  assert.strictEqual(chart.regions[1].rendering.display_text, "09AB");
  assert.strictEqual(chart.regions[1].rendering.word_hex, "0x42413930");
  assert.ok(chart.band_counts.control > 0);
  assert.strictEqual(indexed.band, "measurement");
  assert.strictEqual(indexed.region.label, "decoded-chart");
  assert.strictEqual(indexed.region.rendering.display_text, "09AB");

  console.log("  OK barcode and chart projections stay deterministic and identity-stable\n");
}

function testComposerIntegration() {
  console.log("Testing composer shell stream projection surface");

  const composer = composerShell.createComposer("\u0000\u001f!09AB", {
    sceneId: "stream.projection.demo"
  });
  composerShell.declareStreamRegion(composer, {
    start: 0,
    end: 2,
    binary_mode: "raw-binary",
    endian: "little",
    text_direction: "ltr",
    traversal: "car/cdr",
    presentation: "barcode",
    label: "sealed-carrier"
  });
  composerShell.declareStreamRegion(composer, {
    start: 3,
    end: 6,
    binary_mode: "character-encoded",
    endian: "big",
    text_direction: "rtl",
    traversal: "cdr/car",
    presentation: "chart",
    label: "decoded-chart"
  });

  const barcode = composerShell.currentStreamProjection(composer);
  const chart = composerShell.setStreamPresentation(composer, "chart");
  const current = composerShell.currentStreamProjection(composer);
  const indexed = composerShell.inspectStreamProjection(composer, 4, { mode: "chart" });

  assert.strictEqual(barcode.mode, "barcode");
  assert.strictEqual(current.mode, "chart");
  assert.strictEqual(barcode.identity_receipt, current.identity_receipt);
  assert.notStrictEqual(barcode.view_receipt, current.view_receipt);
  assert.strictEqual(indexed.region.rendering.storage_hex, "42 41 39 30");
  assert.strictEqual(indexed.region.rendering.display_text, "09AB");
  assert.strictEqual(chart.active.presentation, "chart");

  console.log("  OK composer shell projects declared stream regions without changing identity\n");
}

console.log("Testing Phase 72 - Scoped Stream Projection Court");
console.log("=================================================\n");

testProjectionModes();
testComposerIntegration();

console.log("\n=================================================");
console.log("ALL PHASE 72 STREAM PROJECTION TESTS PASSED");
