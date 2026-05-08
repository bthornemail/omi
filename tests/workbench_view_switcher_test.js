const assert = require("assert");
const fs = require("fs");
const path = require("path");

const composerShell = require("../workbench/src/composer_shell.js");
const viewSwitcher = require("../workbench/src/view_switcher.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testStandaloneViewSwitcher() {
  console.log("Testing standalone lazy/greedy view switcher");

  const switcher = viewSwitcher.createViewSwitcher({
    id: "frame.delta.001",
    carrier: "Aztec",
    witness: "fixture-witness-001",
    scope: "public.global"
  }, {
    scene: "frame.scene.alpha",
    mode: "lazy"
  });

  const lazy = switcher.snapshot();
  const greedy = switcher.setMode("greedy");
  const staticView = switcher.setMode("static");
  const animated = switcher.setMode("animated");
  const wrapped = switcher.toggle();

  assert.strictEqual(lazy.mode, "lazy");
  assert.strictEqual(lazy.sealed_address.path, "frame.delta.001");
  assert.strictEqual(lazy.declaration_surface, "sealed address");
  assert.strictEqual(greedy.mode, "greedy");
  assert.strictEqual(greedy.chart.difference_count, 6);
  assert.strictEqual(greedy.frame_difference.classes.length, 6);
  assert.strictEqual(staticView.mode, "static");
  assert.strictEqual(staticView.reconciliation_surface, "identity proof");
  assert.strictEqual(animated.mode, "animated");
  assert.strictEqual(animated.timeline.master_reconciliation, 5040);
  assert.strictEqual(animated.animated.coordination, "sexagesimal rolling difference");
  assert.strictEqual(wrapped.mode, "lazy");
  assert.strictEqual(lazy.identity_receipt, greedy.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, staticView.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, animated.identity_receipt);
  assert.strictEqual(animated.identity_receipt, wrapped.identity_receipt);
  assert.throws(function () {
    switcher.setMode("unknown-mode");
  }, /unknown-view-mode/);

  console.log("  OK lazy, greedy, static, and animated projections share one declared identity\n");
}

function testComposerShellIntegration() {
  console.log("Testing composer shell view mode integration");

  const composer = composerShell.createComposer(read("models/world/cargo-yard-demo.alist"), {
    sceneId: "world.cargo-yard-demo"
  });
  const lazy = composerShell.currentView(composer);
  const greedy = composerShell.setViewMode(composer, "greedy");
  const staticView = composerShell.setViewMode(composer, "static");
  const animated = composerShell.toggleViewMode(composer);

  assert.strictEqual(composer.viewMode, "animated");
  assert.strictEqual(lazy.mode, "lazy");
  assert.strictEqual(greedy.mode, "greedy");
  assert.strictEqual(staticView.mode, "static");
  assert.strictEqual(animated.mode, "animated");
  assert.strictEqual(lazy.identity_receipt, greedy.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, staticView.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, animated.identity_receipt);
  assert.strictEqual(composerShell.currentView(composer).mode, "animated");

  console.log("  OK composer shell toggles the same declared object without changing identity\n");
}

console.log("Testing Phase 64 - Lazy/Greedy View Switcher");
console.log("==============================================\n");

testStandaloneViewSwitcher();
testComposerShellIntegration();

console.log("\n==============================================");
console.log("ALL PHASE 64 VIEW SWITCHER TESTS PASSED");
