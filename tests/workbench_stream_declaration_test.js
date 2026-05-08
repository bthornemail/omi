const assert = require("assert");

const composerShell = require("../workbench/src/composer_shell.js");
const streamDeclaration = require("../workbench/src/stream_declaration.js");

function testBandClassification() {
  console.log("Testing stream band classification");

  assert.strictEqual(streamDeclaration.classifyCodepoint(0x00).band, "control");
  assert.strictEqual(streamDeclaration.classifyCodepoint(0x1f).band, "control");
  assert.strictEqual(streamDeclaration.classifyCodepoint(0x20).band, "operator");
  assert.strictEqual(streamDeclaration.classifyCodepoint(0x2f).band, "operator");
  assert.strictEqual(streamDeclaration.classifyCodepoint(0x30).band, "measurement");
  assert.strictEqual(streamDeclaration.classifyCodepoint(0x3f).band, "measurement");
  assert.strictEqual(streamDeclaration.classifyCodepoint(0x40).band, "projection");
  assert.strictEqual(streamDeclaration.classifyCodepoint(0x7f).band, "projection");
  assert.strictEqual(streamDeclaration.classifyCodepoint(0x80).band, "extended");

  console.log("  OK 0x00..0x7F band boundaries classify deterministically\n");
}

function buildDeclaration() {
  return streamDeclaration.createStreamDeclaration("\u0000\u001f!09AB", {
    stream_id: "stream.declaration.demo",
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

function testDeclarationLifecycle() {
  console.log("Testing stream declaration lifecycle");

  const stream = buildDeclaration();
  const before = stream.snapshot();
  const sealed = stream.resolveIndex(1);
  const decoded = stream.resolveIndex(4);
  const projected = stream.resolveIndex(5);
  const chart = stream.setPresentation("chart");
  const lazy = stream.setPresentation("lazy");
  const appended = stream.declareRegion({
    start: 0,
    end: 0,
    binary_mode: "raw-binary",
    endian: "little",
    text_direction: "ltr",
    traversal: "car/cdr",
    presentation: "barcode",
    label: "overlay"
  });
  const edited = stream.setSource("\u0000\u001f!09ABC");

  assert.strictEqual(before.stream_scope, "pre-os.declaration");
  assert.strictEqual(before.regions.length, 2);
  assert.strictEqual(sealed.band, "control");
  assert.strictEqual(sealed.region.binary_mode, "raw-binary");
  assert.strictEqual(sealed.region.endian, "little");
  assert.strictEqual(decoded.band, "measurement");
  assert.strictEqual(decoded.region.binary_mode, "character-encoded");
  assert.strictEqual(decoded.region.text_direction, "rtl");
  assert.strictEqual(projected.band, "projection");
  assert.strictEqual(projected.region.traversal, "cdr/car");
  assert.strictEqual(chart.identity_receipt, before.identity_receipt);
  assert.notStrictEqual(chart.view_receipt, before.view_receipt);
  assert.strictEqual(lazy.active.presentation, "barcode");
  assert.notStrictEqual(lazy.view_receipt, chart.view_receipt);
  assert.ok(appended);
  assert.strictEqual(appended.regions.length, 3);
  assert.notStrictEqual(edited.identity_receipt, before.identity_receipt);
  assert.strictEqual(edited.active.presentation, "barcode");
  assert.strictEqual(stream.validate().ok, true);

  assert.strictEqual(stream.declareRegion({
    start: 99,
    end: 100,
    binary_mode: "raw-binary",
    endian: "little",
    text_direction: "ltr",
    traversal: "car/cdr",
    presentation: "barcode",
    label: "invalid"
  }), null);

  console.log("  OK stream declaration identity survives view switches and refactors on content edit\n");
}

function testComposerIntegration() {
  console.log("Testing composer shell stream declaration surface");

  const composer = composerShell.createComposer("\u0000\u001f!09AB", {
    sceneId: "stream.declaration.demo"
  });
  const initial = composerShell.currentStreamDeclaration(composer);
  const regionA = composerShell.declareStreamRegion(composer, {
    start: 0,
    end: 2,
    binary_mode: "raw-binary",
    endian: "little",
    text_direction: "ltr",
    traversal: "car/cdr",
    presentation: "barcode",
    label: "sealed-carrier"
  });
  const regionB = composerShell.declareStreamRegion(composer, {
    start: 3,
    end: 6,
    binary_mode: "character-encoded",
    endian: "big",
    text_direction: "rtl",
    traversal: "cdr/car",
    presentation: "chart",
    label: "decoded-chart"
  });
  const declared = composerShell.currentStreamDeclaration(composer);
  const chart = composerShell.setStreamPresentation(composer, "chart");
  const resolved = composerShell.inspectStreamDeclaration(composer, 5);
  const reparsed = composerShell.reparse(composer, "\u0000\u001f!09ABC");
  const afterEdit = composerShell.currentStreamDeclaration(composer);

  assert.strictEqual(initial.regions.length, 1);
  assert.strictEqual(initial.regions[0].binary_mode, "raw-binary");
  assert.ok(regionA);
  assert.ok(regionB);
  assert.strictEqual(regionB.regions.length, 3);
  assert.strictEqual(declared.regions.length, 3);
  assert.strictEqual(chart.active.presentation, "chart");
  assert.strictEqual(chart.identity_receipt, declared.identity_receipt);
  assert.notStrictEqual(chart.view_receipt, declared.view_receipt);
  assert.strictEqual(resolved.band, "projection");
  assert.strictEqual(resolved.region.binary_mode, "character-encoded");
  assert.strictEqual(reparsed.kind, "document");
  assert.notStrictEqual(afterEdit.identity_receipt, declared.identity_receipt);
  assert.strictEqual(afterEdit.active.presentation, "chart");
  assert.strictEqual(composerShell.toggleStreamPresentation(composer).active.presentation, "barcode");

  console.log("  OK composer shell exposes deterministic stream declarations\n");
}

console.log("Testing Phase 71 - Scoped Stream Declaration Court");
console.log("=================================================\n");

testBandClassification();
testDeclarationLifecycle();
testComposerIntegration();

console.log("\n=================================================");
console.log("ALL PHASE 71 STREAM DECLARATION TESTS PASSED");
