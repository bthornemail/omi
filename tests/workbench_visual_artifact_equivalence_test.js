const assert = require("assert");
const fs = require("fs");
const path = require("path");

const composerShell = require("../workbench/src/composer_shell.js");
const barcodeTemplate = require("../workbench/src/barcode_template.js");
const visualArtifactEquivalence = require("../workbench/src/visual_artifact_equivalence.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function buildTrailerState() {
  const source = read("models/trailer/wike-ebike-cargo-trailer.alist");
  return composerShell.createComposer(source, {
    sceneId: "model.trailer.wike-ebike-cargo"
  });
}

function buildBarcodeState() {
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
  return state;
}

function assertRootSummary(comparison, sceneId) {
  const canonical = comparison.canonical;
  const summaries = comparison.summaries;
  assert.ok(comparison.same, "expected artifact summaries to match");
  assert.strictEqual(canonical.omi_path, sceneId);
  assert.strictEqual(summaries.svg.root.omi_path, sceneId);
  assert.strictEqual(summaries.gltf.root.omi_path, sceneId);
  assert.strictEqual(summaries.obj.root.omi_path, sceneId);
  assert.strictEqual(summaries.webgl.root.omi_path, sceneId);
  assert.strictEqual(summaries.gles.root.omi_path, sceneId);
  assert.strictEqual(summaries.opengl.root.omi_path, sceneId);
  assert.strictEqual(summaries.svg.root_receipt, summaries.gltf.root_receipt);
  assert.strictEqual(summaries.gltf.root_receipt, summaries.obj.root_receipt);
  assert.strictEqual(summaries.obj.root_receipt, summaries.webgl.root_receipt);
  assert.strictEqual(summaries.webgl.root_receipt, summaries.gles.root_receipt);
  assert.strictEqual(summaries.gles.root_receipt, summaries.opengl.root_receipt);
}

function testTrailerSceneEquivalence() {
  console.log("Testing trailer scene visual artifact equivalence");

  const state = buildTrailerState();
  const comparison = visualArtifactEquivalence.compareState(state, {
    mode: "polyform-3d"
  });
  const exports = composerShell.exportAll(state);

  assert.ok(exports["scene.svg"].includes("data-omi-coordinate-receipt="));
  assert.ok(exports["scene.gltf.json"].includes("\"omi_coordinate_receipt\""));
  assert.ok(exports["scene.obj.mtl"].receipt.includes("\"omi_coordinate_receipt\""));
  assert.strictEqual(visualArtifactEquivalence.normalizeArtifact("unknown", {}), null);
  assert.strictEqual(visualArtifactEquivalence.parseSvgSummary("<svg></svg>"), null);
  assert.strictEqual(visualArtifactEquivalence.parseGltfSummary({ extras: {} }), null);
  assert.strictEqual(visualArtifactEquivalence.parseObjSummary({ receipt: "{}" }), null);
  assert.strictEqual(visualArtifactEquivalence.parsePlanSummary(null), null);

  assertRootSummary(comparison, "model.trailer.wike-ebike-cargo");
  assert.strictEqual(comparison.backend.same, true);
  assert.ok(comparison.backend.summaries.every((summary) => summary.root_metadata && summary.root_metadata.omi_path === "model.trailer.wike-ebike-cargo"));

  console.log("  OK trailer SVG, glTF, OBJ, and backend plans agree on scene identity\n");
}

function testBarcodeSceneEquivalence() {
  console.log("Testing barcode template scene visual artifact equivalence");

  const state = buildBarcodeState();
  const comparison = visualArtifactEquivalence.compareState(state, {
    mode: "barcode-template-scene"
  });
  const exports = composerShell.exportAll(state);
  const repeated = visualArtifactEquivalence.compareState(state, {
    mode: "barcode-template-scene"
  });

  assert.ok(exports["scene.svg"].includes("data-omi-projection-intent=\"scene-root\""));
  assert.ok(exports["scene.gltf.json"].includes("\"omi_projection_intent\""));
  assert.ok(exports["scene.obj.mtl"].receipt.includes("\"omi_projection_intent\""));
  assert.ok(comparison.same);
  assert.deepStrictEqual(comparison, repeated);
  assertRootSummary(comparison, "world.cargo-yard-demo");

  console.log("  OK barcode template SVG, glTF, OBJ, and backend plans agree on scene identity\n");
}

console.log("Testing Phase 60 - Visual Artifact Export Equivalence Court");
console.log("===========================================================\n");

testTrailerSceneEquivalence();
testBarcodeSceneEquivalence();

console.log("\n===========================================================");
console.log("ALL PHASE 60 VISUAL ARTIFACT EQUIVALENCE TESTS PASSED");
