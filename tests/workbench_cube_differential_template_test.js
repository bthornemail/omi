const assert = require("assert");
const fs = require("fs");
const path = require("path");

const composerShell = require("../workbench/src/composer_shell.js");
const cubeDifferential = require("../workbench/src/cube_differential_template.js");
const barcodeTemplate = require("../workbench/src/barcode_template.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testStandaloneCubeComponent() {
  console.log("Testing standalone cube differential template component");

  const component = cubeDifferential.createCubeDifferentialComponent({
    omi_path: "diagram.two-cube-differential",
    carrier: "Code16K",
    scope: "protected.local",
    witness: "fixture-witness-001"
  }, {
    mode: "lazy"
  });
  const lazy = component.snapshot();
  const lazyParsed = cubeDifferential.fromSvg(lazy.svg);
  const greedy = component.setMode("greedy");
  const greedyParsed = cubeDifferential.fromSvg(greedy.svg);
  const refolded = component.toggle();
  const toggled = component.toggle();

  assert.strictEqual(lazy.mode, "lazy");
  assert.strictEqual(lazy.sealed_address.path, "diagram.two-cube-differential");
  assert.strictEqual(lazy.template.mode, "lazy");
  assert.strictEqual(lazy.template.omi_path, "diagram.two-cube-differential");
  assert.strictEqual(lazy.chart.difference_count, 6);
  assert.ok(lazy.svg.includes('data-omi-view="lazy"'));
  assert.strictEqual(lazyParsed.template.omi_path, "diagram.two-cube-differential");
  assert.strictEqual(lazyParsed.mode, "lazy");
  assert.strictEqual(greedy.mode, "greedy");
  assert.strictEqual(greedy.chart.difference_count, 6);
  assert.ok(greedy.svg.includes('data-omi-view="greedy"'));
  assert.strictEqual(greedyParsed.mode, "greedy");
  assert.strictEqual(greedyParsed.difference_count, 6);
  assert.strictEqual(refolded.mode, "lazy");
  assert.strictEqual(toggled.mode, "greedy");
  assert.strictEqual(lazy.identity_receipt, greedy.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, refolded.identity_receipt);
  assert.strictEqual(refolded.view_receipt, lazy.view_receipt);
  assert.strictEqual(component.identityReceipt(), lazy.identity_receipt);
  assert.strictEqual(component.chartWitness(), lazy.chart.witness);

  const imported = barcodeTemplate.fromSvg(lazy.svg);
  assert.strictEqual(imported.omi_path, "diagram.two-cube-differential");
  assert.strictEqual(imported.carrier, "Code16K");
  assert.strictEqual(imported.scope, "protected.local");

  console.log("  OK cube witness is switchable, loadable, and identity-stable across lazy/greedy views\n");
}

function testComposerShellIntegration() {
  console.log("Testing composer shell cube differential integration");

  const composer = composerShell.createComposer(read("models/world/cargo-yard-demo.alist"), {
    sceneId: "world.cargo-yard-demo"
  });
  const lazy = composerShell.currentCubeDifferential(composer);
  const greedy = composerShell.setCubeDifferentialMode(composer, "greedy");
  const imported = composerShell.importSvgTemplate(composer, greedy.svg);
  const dropped = composerShell.dropTemplate(composer, imported.template, "world.cargo-yard-demo/objects/cube-differential.001");
  const refolded = composerShell.toggleCubeDifferentialMode(composer);

  assert.strictEqual(lazy.mode, "lazy");
  assert.strictEqual(greedy.mode, "greedy");
  assert.strictEqual(imported.ok, true);
  assert.strictEqual(imported.template.omi_path, "diagram.two-cube-differential");
  assert.strictEqual(dropped.proposal.action, "ADD_COMPONENT");
  assert.strictEqual(refolded.mode, "lazy");
  assert.strictEqual(lazy.identity_receipt, greedy.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, refolded.identity_receipt);
  assert.ok(composer.scene.components.some((component) => component.path === "world.cargo-yard-demo/objects/cube-differential.001"));
  assert.strictEqual(composer.viewMode, "lazy");

  console.log("  OK composer shell loads and switches the cube witness as a barcode component\n");
}

console.log("Testing Phase 67 - Cube Differential as Barcode Template");
console.log("========================================================\n");

testStandaloneCubeComponent();
testComposerShellIntegration();

console.log("\n========================================================");
console.log("ALL PHASE 67 CUBE DIFFERENTIAL TEMPLATE TESTS PASSED");
