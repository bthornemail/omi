const assert = require("assert");
const composerShell = require("../workbench/src/composer_shell.js");
const composerPackage = require("../workbench/src/composer_package.js");
const packageTrust = require("../workbench/src/package_trust.js");
const barcodeTemplate = require("../workbench/src/barcode_template.js");
const fs = require("fs");
const path = require("path");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function buildPackage() {
  const state = composerShell.createComposer(read("models/world/cargo-yard-demo.alist"), {
    sceneId: "world.cargo-yard-demo"
  });
  const imported = composerShell.importSvgTemplate(state, barcodeTemplate.toSvg({
    omi_path: "world.cargo-yard-demo/objects/trailer.001",
    carrier: "Aztec",
    scope: "public.global",
    witness: "fixture-witness-001"
  }));
  assert.strictEqual(imported.ok, true);
  composerShell.dropTemplate(state, imported.template, "world.cargo-yard-demo/objects/template.001");
  composerShell.commit(state, 1);
  return composerShell.exportPackage(state);
}

function testUnsignedPackage() {
  console.log("Testing unsigned package trust reporting");

  const bundle = buildPackage();
  const imported = composerPackage.importPackage(bundle);
  const reported = packageTrust.reportTrust(JSON.parse(bundle.files["manifest.json"]).manifest_receipt, null);

  assert.strictEqual(imported.trust.ok, true);
  assert.strictEqual(imported.trust.review_status, "unsigned");
  assert.strictEqual(reported.ok, true);
  assert.strictEqual(reported.review_status, "unsigned");
  assert.strictEqual(reported.signatures.length, 0);

  console.log("  OK unsigned packages validate as unsigned\n");
}

function testSignedPackage() {
  console.log("Testing deterministic trust records");

  const bundle = buildPackage();
  const manifest = JSON.parse(bundle.files["manifest.json"]);
  const fixture = {
    signer_id: "fixture-signer.alpha",
    signer_scope: "public.global",
    signed_at_tick: 61,
    signature_algorithm: "fnv1a-package-attestation",
    review_status: "approved"
  };
  const recordA = packageTrust.signerEnvelope(manifest.manifest_receipt, fixture);
  const recordB = packageTrust.signerEnvelope(manifest.manifest_receipt, fixture);
  const trustBundle = packageTrust.buildTrustBundle(manifest.manifest_receipt, [fixture]);
  const imported = composerPackage.importPackage(bundle, { trustBundle: trustBundle });
  const reported = packageTrust.reportTrust(manifest.manifest_receipt, trustBundle);

  assert.deepStrictEqual(recordA, recordB);
  assert.strictEqual(recordA.package_receipt, manifest.manifest_receipt);
  assert.strictEqual(recordA.review_status, "approved");
  assert.strictEqual(trustBundle.signatures.length, 1);
  assert.strictEqual(trustBundle.review_status, "approved");
  assert.strictEqual(reported.ok, true);
  assert.strictEqual(reported.review_status, "approved");
  assert.strictEqual(imported.trust.ok, true);
  assert.strictEqual(imported.trust.review_status, "approved");

  const appended = packageTrust.appendTrustRecord(trustBundle, packageTrust.signerEnvelope(manifest.manifest_receipt, {
    signer_id: "fixture-signer.beta",
    signer_scope: "public.review",
    signed_at_tick: 62,
    signature_algorithm: "fnv1a-package-attestation",
    review_status: "pending"
  }));
  assert.strictEqual(appended.signatures.length, 2);
  assert.strictEqual(appended.review_status, "approved");
  assert.deepStrictEqual(appended, packageTrust.appendTrustRecord(trustBundle, packageTrust.signerEnvelope(manifest.manifest_receipt, {
    signer_id: "fixture-signer.beta",
    signer_scope: "public.review",
    signed_at_tick: 62,
    signature_algorithm: "fnv1a-package-attestation",
    review_status: "pending"
  })));

  console.log("  OK deterministic signatures append and roundtrip\n");
}

function testTrustRejection() {
  console.log("Testing trust rejection paths");

  const bundle = buildPackage();
  const manifest = JSON.parse(bundle.files["manifest.json"]);
  const mismatchBundle = packageTrust.buildTrustBundle(manifest.manifest_receipt + 1, [{
    signer_id: "fixture-signer.alpha",
    signer_scope: "public.global",
    signed_at_tick: 61,
    signature_algorithm: "fnv1a-package-attestation",
    review_status: "approved"
  }]);

  assert.throws(function () {
    composerPackage.importPackage(bundle, { trustBundle: mismatchBundle });
  }, /package-receipt-mismatch/);

  const invalidRecord = packageTrust.signerEnvelope(manifest.manifest_receipt, {
    signer_id: "fixture-signer.alpha",
    signer_scope: "public.global",
    signed_at_tick: 61,
    signature_algorithm: "fnv1a-package-attestation",
    review_status: "approved"
  });
  invalidRecord.signature_value += 1;
  assert.strictEqual(packageTrust.verifyTrustRecord(manifest.manifest_receipt, invalidRecord).ok, false);
  assert.strictEqual(packageTrust.validateTrustBundle(manifest.manifest_receipt, {
    package_receipt: manifest.manifest_receipt,
    signatures: [invalidRecord],
    review_status: "approved",
    trust_receipt: 0
  }).ok, false);

  console.log("  OK mismatched package receipts and invalid signatures reject\n");
}

console.log("Testing Phase 62 - Composer Package Signing and Trust Court");
console.log("============================================================\n");

testUnsignedPackage();
testSignedPackage();
testTrustRejection();

console.log("\n============================================================");
console.log("ALL PHASE 62 PACKAGE TRUST TESTS PASSED");
