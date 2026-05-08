const assert = require("assert");

const composerShell = require("../workbench/src/composer_shell.js");

function buildComposer() {
  const composer = composerShell.createComposer("01234567", {
    sceneId: "stream.overlay.package.demo"
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
  return composer;
}

function testExportImport() {
  console.log("Testing Phase 74 - Overlay as Package Export");

  const composer = buildComposer();
  const barcode = composerShell.exportStreamOverlayPackage(composer, { mode: "barcode" });
  const chart = composerShell.exportStreamOverlayPackage(composer, { mode: "chart" });
  const imported = composerShell.importStreamOverlayPackage(chart);

  assert.strictEqual(barcode.manifest.package_kind, "stream-overlay-package");
  assert.strictEqual(chart.manifest.package_kind, "stream-overlay-package");
  assert.strictEqual(barcode.manifest.identity_receipt, chart.manifest.identity_receipt);
  assert.notStrictEqual(barcode.manifest.projection_receipt, chart.manifest.projection_receipt);
  assert.notStrictEqual(barcode.manifest.view_receipt, chart.manifest.view_receipt);
  assert.notStrictEqual(barcode.manifest.package_receipt, chart.manifest.package_receipt);
  assert.strictEqual(barcode.files["declaration/declaration.json"], chart.files["declaration/declaration.json"]);
  assert.notStrictEqual(barcode.files["projection/projection.json"], chart.files["projection/projection.json"]);
  assert.notStrictEqual(barcode.files["overlays/overlay-stack.json"], chart.files["overlays/overlay-stack.json"]);
  assert.strictEqual(imported.ok, true);
  assert.strictEqual(imported.manifest.package_kind, "stream-overlay-package");
  assert.strictEqual(imported.manifest.identity_receipt, chart.manifest.identity_receipt);
  assert.strictEqual(imported.manifest.projection_receipt, chart.manifest.projection_receipt);
  assert.strictEqual(imported.manifest.view_receipt, chart.manifest.view_receipt);
  assert.strictEqual(imported.manifest.resolved_region_receipt, chart.manifest.resolved_region_receipt);
  assert.strictEqual(imported.receipts.overlay_receipt, chart.manifest.overlay_receipt);
  assert.strictEqual(imported.receipts.resolved_region_receipt, chart.manifest.resolved_region_receipt);
  assert.strictEqual(imported.overlay_stack.length, chart.manifest.sample_count);
  assert.strictEqual(imported.overlay_stack[3].resolved_region.label, "narrow-overlay");
  assert.strictEqual(imported.overlay_stack[3].overlay_receipt, chart.overlay_stack[3].overlay_receipt);
  assert.strictEqual(chart.overlay_stack[3].region.label, "narrow-overlay");
  assert.strictEqual(chart.overlay_stack[3].overlay_stack[0].label, "stream.0");
  assert.strictEqual(chart.overlay_stack[3].overlay_stack[1].label, "base-default");

  const replayed = composerShell.importStreamOverlayPackage({
    manifest: JSON.parse(chart.files["manifest.json"]),
    files: Object.assign({}, chart.files)
  });
  assert.strictEqual(replayed.ok, true);
  assert.deepStrictEqual(replayed.overlay_stack, imported.overlay_stack);

  console.log("  OK overlay declarations export and import as deterministic package metadata\n");
}

function testRejectionPaths() {
  console.log("Testing overlay package rejection paths");

  const composer = buildComposer();
  const bundle = composerShell.exportStreamOverlayPackage(composer, { mode: "chart" });
  const manifest = JSON.parse(bundle.files["manifest.json"]);
  const tamperedFiles = Object.assign({}, bundle.files, {
    "overlays/overlay-stack.json": bundle.files["overlays/overlay-stack.json"].replace("narrow-overlay", "tampered-overlay")
  });

  assert.throws(function () {
    composerShell.importStreamOverlayPackage({
      manifest: manifest,
      files: tamperedFiles
    });
  }, /receipt-mismatch:overlays\/overlay-stack\.json|overlay-stack-mismatch/);

  const badManifest = JSON.parse(bundle.files["manifest.json"]);
  badManifest.package_receipt = 0;
  assert.throws(function () {
    composerShell.importStreamOverlayPackage({
      manifest: badManifest,
      files: Object.assign({}, bundle.files, {
        "manifest.json": JSON.stringify(badManifest)
      })
    });
  }, /invalid-package-receipt/);

  const mismatchedManifest = JSON.parse(bundle.files["manifest.json"]);
  mismatchedManifest.projection_mode = mismatchedManifest.projection_mode === "barcode" ? "chart" : "barcode";
  assert.throws(function () {
    composerShell.importStreamOverlayPackage({
      manifest: JSON.parse(bundle.files["manifest.json"]),
      files: Object.assign({}, bundle.files, {
        "manifest.json": JSON.stringify(mismatchedManifest)
      })
    });
  }, /manifest-mismatch/);

  console.log("  OK invalid overlay package metadata rejects deterministically\n");
}

console.log("Testing Phase 74 - Overlay as Package Export");
console.log("=================================================\n");

testExportImport();
testRejectionPaths();

console.log("\n=================================================");
console.log("ALL PHASE 74 STREAM OVERLAY PACKAGE TESTS PASSED");
