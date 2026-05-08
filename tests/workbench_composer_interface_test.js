const assert = require("assert");
const fs = require("fs");
const path = require("path");

const composerShell = require("../workbench/src/composer_shell.js");
const barcodeTemplate = require("../workbench/src/barcode_template.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testComposerLoadAndTemplateImport() {
  console.log("Testing composer load and SVG template import");

  const trailerSource = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const worldSource = read("models/world/cargo-yard-demo.alist");
  const trailer = composerShell.createComposer(trailerSource);
  const world = composerShell.createComposer(worldSource);
  const svgTemplate = barcodeTemplate.toSvg({
    omi_path: "world.cargo-yard-demo/objects/trailer.001",
    carrier: "Aztec",
    scope: "public.global",
    witness: "fixture-witness-001"
  });
  const imported = composerShell.importSvgTemplate(world, svgTemplate);

  assert.strictEqual(trailer.document.id, "model.trailer.wike-ebike-cargo");
  assert.strictEqual(world.document.id, "world.cargo-yard-demo");
  assert.deepStrictEqual(world.panes, ["source", "graph", "stream-declaration", "stream-projection", "semantic-triangulation", "narrative-timeline", "spatial-polyform", "barcode-template", "inspector"]);
  assert.strictEqual(imported.ok, true);
  assert.strictEqual(imported.template.omi_path, "world.cargo-yard-demo/objects/trailer.001");
  assert.strictEqual(imported.template.carrier, "Aztec");
  assert.strictEqual(imported.template.scope, "public.global");
  assert.strictEqual(imported.template.witness, "fixture-witness-001");

  console.log("  OK composer loads canonical models and imports metadata-bearing SVG templates\n");
  return { world, imported };
}

function testComposerEditProposals(context) {
  console.log("Testing composer drag/drop and relation proposals");

  const state = context.world;
  const imported = context.imported;
  const dropped = composerShell.dropTemplate(state, imported.template, "world.cargo-yard-demo/objects/template.001");
  const connected = composerShell.connect(
    state,
    "world.cargo-yard-demo/objects/template.001",
    "world.cargo-yard-demo/objects/cargo.001",
    "composed-with"
  );
  const commit = composerShell.commit(state, dropped.proposal.seq);

  assert.strictEqual(dropped.proposal.type, "proposal");
  assert.strictEqual(dropped.proposal.action, "ADD_COMPONENT");
  assert.strictEqual(connected.proposal.type, "proposal");
  assert.strictEqual(connected.proposal.action, "CREATE_RELATION");
  assert.ok(commit);
  assert.strictEqual(commit.type, "commit");
  assert.strictEqual(state.scene.components.length, 1);
  assert.strictEqual(state.scene.relations.length, 1);

  console.log("  OK drag/drop and connect actions append proposals instead of mutating source directly\n");
}

function testInspectorAndExports(context) {
  console.log("Testing composer inspector and export pipeline");

  const state = context.world;
  const inspected = composerShell.inspect(state, "world.cargo-yard-demo/objects/trailer.001");
  const triangulation = composerShell.currentTriangulation(state);
  const exportsA = composerShell.exportAll(state);
  const exportsB = composerShell.exportAll(state);

  assert.ok(inspected.coordinate);
  assert.ok(inspected.coordinate_receipt);
  assert.ok(inspected.closure_receipt);
  assert.strictEqual(inspected.scope, "public.global");
  assert.notStrictEqual(inspected.carrier, 255);
  assert.ok(inspected.edit_receipt);
  assert.ok(triangulation);
  assert.strictEqual(triangulation.root, "world.cargo-yard-demo");
  assert.ok((triangulation.triplet_count || (triangulation.chart && triangulation.chart.triplet_count)) > 0);

  assert.strictEqual(exportsA["scene.svg"], exportsB["scene.svg"]);
  assert.strictEqual(exportsA["barcode.carrier.json"], exportsB["barcode.carrier.json"]);
  assert.ok(exportsA["scene.svg"].includes("data-omi-path="));
  assert.ok(exportsA["scene.gltf.json"].includes("\"omi_path\""));
  assert.ok(exportsA["scene.obj.mtl"].receipt.includes("world.cargo-yard-demo/objects/trailer.001"));
  assert.ok(exportsA["bundle.org"].includes("#+OMI_MODEL_ID: world.cargo-yard-demo"));
  assert.ok(exportsA["sync.packet.json"].includes("\"packet_kind\": \"EDIT_LOG_SEGMENT\""));
  assert.ok(exportsA["barcode.carrier.json"].includes("omi-barcode-sync"));

  console.log("  OK inspector resolves receipts and exports preserve OMI metadata deterministically\n");
}

console.log("Testing Phase 56 - OMI Composer Interface Court");
console.log("================================================\n");

const context = testComposerLoadAndTemplateImport();
testComposerEditProposals(context);
testInspectorAndExports(context);

console.log("\n================================================");
console.log("ALL PHASE 56 COMPOSER INTERFACE TESTS PASSED");
