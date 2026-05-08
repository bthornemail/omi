const assert = require("assert");
const fs = require("fs");
const path = require("path");

const composerShell = require("../workbench/src/composer_shell.js");
const barcodeTemplate = require("../workbench/src/barcode_template.js");
const compositionTrust = require("../workbench/src/composition_trust.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function makeComposer() {
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
  return composer;
}

function testSealAndViewStability() {
  console.log("Testing Phase 69 - Composition Trust Bundles");

  const composer = makeComposer();
  const signed = composerShell.sealBarcodeComposition(composer, [{
    signer_id: "fixture-composition-signer.alpha",
    signer_scope: "public.global",
    signed_at_tick: 69,
    signature_algorithm: "fnv1a-composition-attestation",
    review_status: "approved"
  }]);
  const lazy = composerShell.currentBarcodeComposition(composer);
  const greedy = composerShell.setBarcodeCompositionMode(composer, "greedy");
  const refolded = composerShell.toggleBarcodeCompositionMode(composer);
  const trust = composerShell.currentBarcodeCompositionTrust(composer);

  assert.strictEqual(signed.ok, true);
  assert.strictEqual(signed.review_status, "approved");
  assert.strictEqual(trust.ok, true);
  assert.strictEqual(lazy.trust.ok, true);
  assert.strictEqual(lazy.trust.trust_receipt, signed.trust_receipt);
  assert.strictEqual(greedy.trust.trust_receipt, signed.trust_receipt);
  assert.strictEqual(refolded.trust.trust_receipt, signed.trust_receipt);
  assert.strictEqual(lazy.identity_receipt, greedy.identity_receipt);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.ok(lazy.svg.includes("data-omi-trust-receipt="));
  assert.ok(greedy.svg.includes("data-omi-trust-receipt="));

  console.log("  OK sealed trust survives lazy/greedy projection changes\n");
}

function testContentEditInvalidatesTrust() {
  console.log("Testing content edits against composition trust");

  const composer = makeComposer();
  composerShell.sealBarcodeComposition(composer, [{
    signer_id: "fixture-composition-signer.alpha",
    signer_scope: "public.global",
    signed_at_tick: 69,
    signature_algorithm: "fnv1a-composition-attestation",
    review_status: "approved"
  }]);
  const before = composerShell.currentBarcodeComposition(composer);
  const added = composerShell.addBarcodeTemplate(composer, barcodeTemplate.toSvg({
    omi_path: "diagram.graph-coloring",
    carrier: "MaxiCode",
    scope: "public.local",
    witness: "fixture-witness-003"
  }), "world.cargo-yard-demo/barcode-composition/template.003");
  const after = composerShell.currentBarcodeComposition(composer);
  const resealed = composerShell.sealBarcodeComposition(composer, [{
    signer_id: "fixture-composition-signer.alpha",
    signer_scope: "public.global",
    signed_at_tick: 70,
    signature_algorithm: "fnv1a-composition-attestation",
    review_status: "approved"
  }]);

  assert.strictEqual(before.trust.ok, true);
  assert.strictEqual(after.trust.ok, false);
  assert.strictEqual(after.trust.error, "identity-receipt-mismatch");
  assert.notStrictEqual(before.identity_receipt, after.identity_receipt);
  assert.strictEqual(added.trust.ok, false);
  assert.strictEqual(resealed.ok, true);
  assert.strictEqual(resealed.review_status, "approved");
  assert.strictEqual(composerShell.currentBarcodeCompositionTrust(composer).ok, true);

  console.log("  OK content edits invalidate the old bundle, and resealing restores trust\n");
}

function testDirectTrustBundleValidation() {
  console.log("Testing direct composition trust bundle validation");

  const bundle = compositionTrust.buildTrustBundle(123456, [{
    signer_id: "fixture-composition-signer.beta",
    signer_scope: "public.review",
    signed_at_tick: 71,
    signature_algorithm: "fnv1a-composition-attestation",
    review_status: "pending"
  }]);
  const validated = compositionTrust.validateTrustBundle(123456, bundle);
  const unsigned = compositionTrust.reportTrust(123456, null);
  const mismatch = compositionTrust.validateTrustBundle(123457, bundle);

  assert.strictEqual(validated.ok, true);
  assert.strictEqual(validated.bundle.review_status, "pending");
  assert.strictEqual(unsigned.ok, true);
  assert.strictEqual(unsigned.review_status, "unsigned");
  assert.strictEqual(mismatch.ok, false);
  assert.strictEqual(mismatch.error, "identity-receipt-mismatch");

  console.log("  OK direct trust bundle validation is deterministic\n");
}

testSealAndViewStability();
testContentEditInvalidatesTrust();
testDirectTrustBundleValidation();

console.log("\n========================================================");
console.log("ALL PHASE 69 COMPOSITION TRUST TESTS PASSED");
