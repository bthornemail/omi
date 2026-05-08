const assert = require("assert");
const fs = require("fs");
const path = require("path");

const animationTimeline = require("../workbench/src/animation_timeline.js");
const composerShell = require("../workbench/src/composer_shell.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testStandaloneTimeline() {
  console.log("Testing standalone 5040-state animation timeline");

  const timeline = animationTimeline.createAnimationTimeline({
    id: "frame.delta.001",
    carrier: "Aztec",
    witness: "fixture-witness-001"
  }, {
    frameCount: 5040,
    frame: 0
  });
  const start = timeline.snapshot();
  const frameOne = timeline.next();
  const back = timeline.previous();
  const boundary = timeline.seek(5040);
  const negative = timeline.seek(-1);

  assert.strictEqual(timeline.frameCount, 5040);
  assert.strictEqual(start.frame, 0);
  assert.strictEqual(start.court_boundary, "court-boundary");
  assert.strictEqual(frameOne.frame, 1);
  assert.strictEqual(frameOne.timeline.sexagesimal_slot, 1);
  assert.strictEqual(frameOne.timeline.difference_class, 2);
  assert.strictEqual(back.frame, 0);
  assert.strictEqual(boundary.frame, 0);
  assert.strictEqual(boundary.court_boundary, "court-boundary");
  assert.strictEqual(negative.frame, 5039);
  assert.strictEqual(negative.court_boundary, "interior");
  assert.strictEqual(start.identity_receipt, boundary.identity_receipt);
  assert.strictEqual(start.frame_receipt, boundary.frame_receipt);
  assert.notStrictEqual(start.frame_receipt, frameOne.frame_receipt);
  assert.strictEqual(timeline.identityReceipt(), start.identity_receipt);

  console.log("  OK frame 0 and frame 5040 reconcile to the same court boundary\n");
}

function testComposerShellIntegration() {
  console.log("Testing composer shell animation timeline integration");

  const composer = composerShell.createComposer(read("models/world/cargo-yard-demo.alist"), {
    sceneId: "world.cargo-yard-demo"
  });
  const start = composerShell.currentAnimationFrame(composer);
  const next = composerShell.nextAnimationFrame(composer);
  const previous = composerShell.previousAnimationFrame(composer);
  const seek = composerShell.setAnimationFrame(composer, 5040);

  assert.strictEqual(start.frame, 0);
  assert.strictEqual(next.frame, 1);
  assert.strictEqual(previous.frame, 0);
  assert.strictEqual(seek.frame, 0);
  assert.strictEqual(seek.court_boundary, "court-boundary");
  assert.strictEqual(composer.viewMode, "animated");
  assert.strictEqual(composerShell.currentView(composer).mode, "animated");
  assert.strictEqual(start.identity_receipt, seek.identity_receipt);
  assert.strictEqual(start.frame_receipt, seek.frame_receipt);
  assert.notStrictEqual(start.frame_receipt, next.frame_receipt);

  console.log("  OK composer shell exposes a deterministic animated timeline\n");
}

console.log("Testing Phase 65 - 5040-State Animation Timeline");
console.log("=================================================\n");

testStandaloneTimeline();
testComposerShellIntegration();

console.log("\n=================================================");
console.log("ALL PHASE 65 ANIMATION TIMELINE TESTS PASSED");
