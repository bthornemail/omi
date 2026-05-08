const assert = require("assert");
const fs = require("fs");
const path = require("path");

const composerShell = require("../workbench/src/composer_shell.js");
const barcodeTemplate = require("../workbench/src/barcode_template.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function buildComposer() {
  const composer = composerShell.createComposer(read("models/world/cargo-yard-demo.alist"), {
    sceneId: "world.cargo-yard-demo"
  });
  const first = barcodeTemplate.toSvg({
    omi_path: "diagram.carry-lookahead-adder",
    carrier: "Aztec",
    scope: "public.global",
    witness: "fixture-witness-001"
  });
  const second = barcodeTemplate.toSvg({
    omi_path: "diagram.double-cube-distance",
    carrier: "Code16K",
    scope: "protected.local",
    witness: "fixture-witness-002"
  });
  const importedFirst = composerShell.importSvgTemplate(composer, first);
  const importedSecond = composerShell.importSvgTemplate(composer, second);
  assert.strictEqual(importedFirst.ok, true);
  assert.strictEqual(importedSecond.ok, true);
  composerShell.composeBarcodeTemplates(composer, [importedFirst.template, importedSecond.template], {
    composition_id: "world.cargo-yard-demo/barcode-composition",
    chain: true
  });
  composerShell.sealBarcodeComposition(composer, [{
    signer_id: "fixture-composition-signer.alpha",
    signer_scope: "public.global",
    signed_at_tick: 70,
    signature_algorithm: "fnv1a-composition-attestation",
    review_status: "approved"
  }]);
  return composer;
}

function testBundleExportImport() {
  console.log("Testing Phase 70 - Composition Bundle Court");

  const composer = buildComposer();
  const bundleA = composerShell.exportBarcodeCompositionBundle(composer);
  const bundleB = composerShell.exportBarcodeCompositionBundle(composer);
  const imported = composerShell.importBarcodeCompositionBundle(bundleA);

  assert.strictEqual(bundleA.manifest.bundle_kind, "barcode-template-composition-bundle");
  assert.strictEqual(bundleA.files["manifest.json"], bundleB.files["manifest.json"]);
  assert.strictEqual(bundleA.files["composition/composition.json"], bundleB.files["composition/composition.json"]);
  assert.strictEqual(bundleA.files["gallery/gallery.svg"], bundleB.files["gallery/gallery.svg"]);
  assert.strictEqual(bundleA.files["trust/trust.json"], bundleB.files["trust/trust.json"]);
  assert.ok(bundleA.files["gallery/gallery.svg"].includes('data-omi-trust-receipt='));
  assert.ok(bundleA.files["gallery/gallery.svg"].includes('data-omi-review-status="approved"'));
  assert.strictEqual(imported.ok, true);
  assert.strictEqual(imported.manifest.bundle_kind, "barcode-template-composition-bundle");
  assert.strictEqual(imported.manifest.composition_identity_receipt, bundleA.manifest.composition_identity_receipt);
  assert.strictEqual(imported.trust.review_status, "approved");
  assert.strictEqual(imported.composition.identity_receipt, bundleA.manifest.composition_identity_receipt);
  assert.strictEqual(imported.composition.view_receipt, bundleA.manifest.composition_view_receipt);
  assert.strictEqual(imported.composition.witness, bundleA.manifest.composition_witness);

  console.log("  OK composition bundles export and import deterministically\n");
}

function testBundleViewAndTrustBehavior() {
  console.log("Testing bundle view and trust behavior");

  const composer = buildComposer();
  const before = composerShell.exportBarcodeCompositionBundle(composer);
  const lazy = composerShell.currentBarcodeComposition(composer);
  const greedy = composerShell.setBarcodeCompositionMode(composer, "greedy");
  const refolded = composerShell.toggleBarcodeCompositionMode(composer);
  const afterView = composerShell.exportBarcodeCompositionBundle(composer);
  composerShell.addBarcodeTemplate(composer, barcodeTemplate.toSvg({
    omi_path: "diagram.graph-coloring",
    carrier: "MaxiCode",
    scope: "public.local",
    witness: "fixture-witness-003"
  }), "world.cargo-yard-demo/barcode-composition/template.003");
  const afterEdit = composerShell.exportBarcodeCompositionBundle(composer);

  assert.strictEqual(before.manifest.trust_receipt, afterView.manifest.trust_receipt);
  assert.strictEqual(before.manifest.bundle_receipt, afterView.manifest.bundle_receipt);
  assert.strictEqual(lazy.trust.ok, true);
  assert.strictEqual(greedy.trust.ok, true);
  assert.strictEqual(refolded.trust.ok, true);
  assert.strictEqual(lazy.identity_receipt, greedy.identity_receipt);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(before.manifest.composition_identity_receipt, afterEdit.manifest.composition_identity_receipt);
  assert.notStrictEqual(before.manifest.bundle_receipt, afterEdit.manifest.bundle_receipt);
  assert.strictEqual(afterEdit.manifest.review_status, "invalid");
  assert.strictEqual(afterEdit.trust.ok, false);

  assert.throws(function () {
    composerShell.importBarcodeCompositionBundle({
      manifest: JSON.parse(afterEdit.files["manifest.json"]),
      files: Object.assign({}, afterEdit.files, {
        "manifest.json": afterEdit.files["manifest.json"]
      })
    });
  }, /missing-bundle-entry|invalid-bundle-receipt|identity-receipt-mismatch|trust-receipt-mismatch/);

  console.log("  OK view changes preserve trust while edits force reseal and bundle change\n");
}

testBundleExportImport();
testBundleViewAndTrustBehavior();

console.log("\n========================================================");
console.log("ALL PHASE 70 COMPOSITION BUNDLE TESTS PASSED");
