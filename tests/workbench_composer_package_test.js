const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const composerShell = require("../workbench/src/composer_shell.js");
const composerPackage = require("../workbench/src/composer_package.js");
const barcodeTemplate = require("../workbench/src/barcode_template.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function buildComposerState() {
  const source = read("models/world/cargo-yard-demo.alist");
  const state = composerShell.createComposer(source, {
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
  composerShell.connect(
    state,
    "world.cargo-yard-demo/objects/template.001",
    "world.cargo-yard-demo/objects/cargo.001",
    "composed-with"
  );
  composerShell.commit(state, 1);
  return state;
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "omi-composer-package-"));
}

function testPackageExportImport() {
  console.log("Testing deterministic OMI composer package export/import");

  const state = buildComposerState();
  const bundleA = composerShell.exportPackage(state);
  const bundleB = composerShell.exportPackage(state);
  const manifest = JSON.parse(bundleA.files["manifest.json"]);
  const receipts = JSON.parse(bundleA.files["receipts/receipts.json"]);
  const visual = JSON.parse(bundleA.files["equivalence/visual-artifact-equivalence.json"]);
  const graphics = JSON.parse(bundleA.files["equivalence/graphics-equivalence.json"]);

  assert.deepStrictEqual(bundleA, bundleB);
  assert.strictEqual(bundleA.scene_root_identity.omi_path, "world.cargo-yard-demo");
  assert.strictEqual(bundleA.scene_root_receipt, manifest.scene_root_receipt);
  assert.strictEqual(manifest.scene_root_identity.omi_path, "world.cargo-yard-demo");
  assert.ok(manifest.required_files.includes("source/model.omilisp"));
  assert.ok(manifest.required_files.includes("artifacts/scene.svg"));
  assert.ok(manifest.required_files.includes("plans/webgl-plan.json"));
  assert.ok(manifest.required_files.includes("equivalence/visual-artifact-equivalence.json"));
  assert.strictEqual(bundleA.files["source/model.omilisp"], state.source);
  assert.strictEqual(JSON.parse(bundleA.files["logs/edits.omi-log.json"]).events.length, state.editLog.events.length);
  assert.ok(bundleA.files["README.org"].includes("world.cargo-yard-demo"));
  assert.ok(bundleA.files["artifacts/scene.svg"].includes("data-omi-path="));
  assert.ok(bundleA.files["artifacts/scene.gltf.json"].includes("\"omi_root\""));
  assert.ok(bundleA.files["artifacts/scene.omi.receipt"].includes("\"omi_root\""));
  assert.strictEqual(JSON.parse(bundleA.files["plans/webgl-plan.json"]).root_metadata.omi_path, "world.cargo-yard-demo");
  assert.strictEqual(JSON.parse(bundleA.files["plans/gles-plan.json"]).root_metadata.omi_path, "world.cargo-yard-demo");
  assert.strictEqual(JSON.parse(bundleA.files["plans/opengl-plan.json"]).root_metadata.omi_path, "world.cargo-yard-demo");
  assert.strictEqual(receipts.base_source_receipt, manifest.source_receipt);
  assert.strictEqual(visual.canonical.omi_path, "world.cargo-yard-demo");
  assert.strictEqual(graphics.summaries[0].root_metadata.omi_path, "world.cargo-yard-demo");

  const imported = composerShell.importPackage(bundleA);
  assert.strictEqual(imported.manifest.manifest_receipt, manifest.manifest_receipt);
  assert.strictEqual(imported.summaries.svg.root.omi_path, "world.cargo-yard-demo");
  assert.strictEqual(imported.summaries.graphics.same, true);

  const tempDir = makeTempDir();
  composerPackage.writePackage(tempDir, bundleA);
  const importedFromDir = composerPackage.importPackage(tempDir);
  assert.strictEqual(importedFromDir.manifest.scene_root_identity.omi_path, "world.cargo-yard-demo");
  assert.strictEqual(importedFromDir.summaries.visual.same, true);
  assert.deepStrictEqual(importedFromDir.manifest.file_receipts, manifest.file_receipts);

  console.log("  OK package export/import is deterministic and reviewable\n");
}

function testPackageRejection() {
  console.log("Testing package rejection paths");

  const state = buildComposerState();
  const bundle = composerShell.exportPackage(state);

  const missingManifest = {
    files: Object.assign({}, bundle.files)
  };
  delete missingManifest.files["manifest.json"];
  assert.throws(function () {
    composerShell.importPackage(missingManifest);
  }, /missing-manifest/);

  const receiptMismatch = {
    files: Object.assign({}, bundle.files)
  };
  receiptMismatch.files["receipts/receipts.json"] = JSON.stringify({
    base_source_receipt: 0,
    edit_log_receipt: 0,
    sync_bundle_receipt: 0
  });
  assert.throws(function () {
    composerPackage.importPackage(receiptMismatch);
  }, /receipt-mismatch/);

  const manifestMismatch = {
    files: Object.assign({}, bundle.files)
  };
  const manifest = JSON.parse(manifestMismatch.files["manifest.json"]);
  manifest.scene_root_receipt = 0;
  manifestMismatch.files["manifest.json"] = JSON.stringify(manifest);
  assert.throws(function () {
    composerPackage.importPackage(manifestMismatch);
  }, /invalid-manifest-receipt/);

  console.log("  OK missing manifest and mismatched receipts reject deterministically\n");
}

console.log("Testing Phase 61 - OMI Composer Package Court");
console.log("==============================================\n");

testPackageExportImport();
testPackageRejection();

console.log("\n==============================================");
console.log("ALL PHASE 61 COMPOSER PACKAGE TESTS PASSED");
