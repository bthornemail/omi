const assert = require("assert");
const fs = require("fs");
const path = require("path");

const composerShell = require("../workbench/src/composer_shell.js");
const fractalSubchartUnfolder = require("../workbench/src/fractal_subchart_unfolder.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testStandaloneUnfolder() {
  console.log("Testing standalone fractal subchart unfolding");

  const unfolder = fractalSubchartUnfolder.createFractalSubchartUnfolder({
    id: "frame.vertex.001",
    carrier: "Aztec",
    witness: "fixture-witness-001",
    scope: "public.global"
  }, {
    scene: "frame.scene.alpha",
    mode: "lazy"
  });

  const lazy = unfolder.snapshot();
  const greedy = unfolder.openSubchart();
  const refolded = unfolder.refoldSubchart();
  const toggled = unfolder.toggle();

  assert.strictEqual(lazy.mode, "lazy");
  assert.strictEqual(lazy.sealed_address.path, "frame.vertex.001");
  assert.strictEqual(lazy.resolution.name, "vertex");
  assert.strictEqual(greedy.mode, "greedy");
  assert.strictEqual(greedy.resolution.name, "subchart");
  assert.strictEqual(greedy.subchart.depth, 4);
  assert.strictEqual(greedy.chart.difference_count, 6);
  assert.strictEqual(refolded.mode, "lazy");
  assert.strictEqual(refolded.sealed_address.path, "frame.vertex.001");
  assert.strictEqual(refolded.identity_receipt, greedy.identity_receipt);
  assert.strictEqual(refolded.view_receipt, unfolder.lazyReceipt());
  assert.strictEqual(toggled.mode, "greedy");
  assert.strictEqual(lazy.identity_receipt, greedy.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, refolded.identity_receipt);
  assert.strictEqual(unfolder.identityReceipt(), lazy.identity_receipt);
  assert.notStrictEqual(greedy.open_receipt, 0);
  assert.notStrictEqual(refolded.refold_receipt, 0);

  console.log("  OK sealed vertices unfold into greedy subcharts and refold to the same lazy address\n");
}

function testComposerShellIntegration() {
  console.log("Testing composer shell subchart integration");

  const composer = composerShell.createComposer(read("models/world/cargo-yard-demo.alist"), {
    sceneId: "world.cargo-yard-demo"
  });
  const lazy = composerShell.currentSubchart(composer);
  const greedy = composerShell.openSubchart(composer);
  const refolded = composerShell.refoldSubchart(composer);

  assert.strictEqual(lazy.mode, "lazy");
  assert.strictEqual(greedy.mode, "greedy");
  assert.strictEqual(refolded.mode, "lazy");
  assert.strictEqual(greedy.resolution.name, "subchart");
  assert.strictEqual(greedy.subchart.depth, 4);
  assert.strictEqual(greedy.identity_receipt, refolded.identity_receipt);
  assert.strictEqual(greedy.sealed_address.path, refolded.sealed_address.path);
  assert.strictEqual(composer.viewMode, "lazy");
  assert.strictEqual(composerShell.currentView(composer).mode, "lazy");

  console.log("  OK composer shell unfolds and refolds the same declared object deterministically\n");
}

console.log("Testing Phase 66 - Fractal Subchart Unfolder");
console.log("============================================\n");

testStandaloneUnfolder();
testComposerShellIntegration();

console.log("\n============================================");
console.log("ALL PHASE 66 FRACTAL SUBCHART TESTS PASSED");
