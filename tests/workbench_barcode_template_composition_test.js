const assert = require("assert");
const fs = require("fs");
const path = require("path");

const composerShell = require("../workbench/src/composer_shell.js");
const barcodeTemplate = require("../workbench/src/barcode_template.js");
const cubeDifferential = require("../workbench/src/cube_differential_template.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testBarcodeTemplateCompositionCourt() {
  console.log("Testing Phase 68 - Barcode Template Composition Court");

  const composer = composerShell.createComposer(read("models/world/cargo-yard-demo.alist"), {
    sceneId: "world.cargo-yard-demo"
  });
  const cube = cubeDifferential.createCubeDifferentialComponent({
    omi_path: "diagram.two-cube-differential",
    carrier: "Code16K",
    scope: "protected.local",
    witness: "fixture-witness-001"
  }, {
    mode: "lazy"
  });
  const aztecTemplate = barcodeTemplate.toSvg({
    omi_path: "diagram.carry-lookahead-adder",
    carrier: "Aztec",
    scope: "protected.global",
    witness: "fixture-witness-002"
  });
  const aztecImported = composerShell.importSvgTemplate(composer, aztecTemplate);

  assert.strictEqual(aztecImported.ok, true);

  const composed = composerShell.composeBarcodeTemplates(composer, [
    cube.snapshot().template,
    composer.templates[4]
  ], {
    composition_id: "world.cargo-yard-demo/barcode-composition",
    chain: true,
    relation: "composed-with"
  });
  const expanded = composerShell.addBarcodeTemplate(composer, aztecImported.template, "world.cargo-yard-demo/barcode-composition/template.003");
  const connected = composerShell.connectBarcodeTemplates(
    composer,
    "diagram.two-cube-differential",
    "diagram.carry-lookahead-adder",
    "bridges-to"
  );
  const greedy = composerShell.setBarcodeCompositionMode(composer, "greedy");
  const refolded = composerShell.toggleBarcodeCompositionMode(composer);
  const current = composerShell.currentBarcodeComposition(composer);

  assert.strictEqual(composed.composition_id, "world.cargo-yard-demo/barcode-composition");
  assert.strictEqual(composed.mode, "lazy");
  assert.strictEqual(composed.chart.template_count, 2);
  assert.strictEqual(composed.chart.relation_count, 1);
  assert.ok(composed.svg.includes('data-omi-path="world.cargo-yard-demo/barcode-composition"'));
  assert.ok(composed.svg.includes('data-omi-template-count="2"'));

  assert.strictEqual(expanded.chart.template_count, 3);
  assert.strictEqual(expanded.chart.relation_count, 1);
  assert.strictEqual(connected.relations.length, 2);
  assert.strictEqual(greedy.mode, "greedy");
  assert.strictEqual(refolded.mode, "lazy");
  assert.notStrictEqual(composed.identity_receipt, greedy.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, refolded.identity_receipt);
  assert.strictEqual(current.identity_receipt, refolded.identity_receipt);
  assert.strictEqual(current.chart.template_count, 3);
  assert.ok(current.svg.includes('data-omi-view="lazy"'));
  assert.ok(current.svg.includes('data-omi-kind="template"'));
  assert.ok(current.svg.includes('data-omi-kind="template-relation"'));

  console.log("  OK barcode templates compose as a deterministic lazy/greedy gallery with stable receipts\n");
}

testBarcodeTemplateCompositionCourt();

console.log("\n========================================================");
console.log("ALL PHASE 68 BARCODE TEMPLATE COMPOSITION TESTS PASSED");
