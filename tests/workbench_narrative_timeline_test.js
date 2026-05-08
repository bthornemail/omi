const assert = require("assert");
const fs = require("fs");
const path = require("path");

const narrativeTimeline = require("../workbench/src/narrative_timeline.js");
const composerShell = require("../workbench/src/composer_shell.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testNarrativeTimelineModes() {
  console.log("Testing narrative timeline projection modes");

  const declarationSource = read("declarations/narrative-series.omilisp");
  const timelineA = narrativeTimeline.createNarrativeTimeline(declarationSource, {
    base_dir: path.join(__dirname, ".."),
    mode: "lazy",
    view_mode: "story"
  });
  const timelineB = narrativeTimeline.createNarrativeTimeline(declarationSource, {
    base_dir: path.join(__dirname, ".."),
    mode: "lazy",
    view_mode: "story"
  });
  const lazy = narrativeTimeline.projectNarrativeTimeline(timelineA, { mode: "lazy", view_mode: "story" });
  const greedy = narrativeTimeline.projectNarrativeTimeline(timelineA, { mode: "greedy", view_mode: "movie" });
  const staticView = narrativeTimeline.projectNarrativeTimeline(timelineA, { mode: "static", view_mode: "codex" });
  const animated = narrativeTimeline.projectNarrativeTimeline(timelineA, { mode: "animated", view_mode: "timeline" });
  const lazyAltView = narrativeTimeline.projectNarrativeTimeline(timelineA, { mode: "lazy", view_mode: "book" });

  assert.strictEqual(timelineA.identity_receipt, timelineB.identity_receipt);
  assert.strictEqual(timelineA.summary.chapter_count, 14);
  assert.strictEqual(timelineA.summary.scene_count, 14);
  assert.ok(timelineA.summary.beat_count > timelineA.summary.chapter_count);
  assert.ok(timelineA.summary.interjection_count > 0);
  assert.strictEqual(timelineA.frames.length, timelineA.summary.frame_count);
  assert.strictEqual(timelineA.frames[0].frame_index, 0);
  assert.strictEqual(timelineA.chapters[0].sid, "prelude.turning-away-from-the-word");
  assert.strictEqual(timelineA.chapters[timelineA.chapters.length - 1].section, "epilogue");
  assert.ok(timelineA.interjections.length > 0);
  assert.ok(timelineA.triplets.some((triplet) => triplet.subject === "narrative-series" && triplet.predicate === "chapter"));
  assert.ok(timelineA.triplets.some((triplet) => triplet.subject === "narrative-series" && triplet.predicate === "interjection"));

  assert.strictEqual(lazy.identity_receipt, timelineA.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, timelineA.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, timelineA.identity_receipt);
  assert.strictEqual(animated.identity_receipt, timelineA.identity_receipt);

  assert.strictEqual(lazy.sealed_address, "narrative-series");
  assert.strictEqual(lazy.sealed_timeline.chapter_count, 14);
  assert.strictEqual(greedy.movie.frame_count, timelineA.summary.frame_count);
  assert.strictEqual(greedy.movie.frames.length, timelineA.summary.frame_count);
  assert.strictEqual(staticView.declared_space.chapter_order[0], "prelude.turning-away-from-the-word");
  assert.strictEqual(animated.timeline.frame_count, timelineA.summary.frame_count);
  assert.strictEqual(animated.timeline.coordination, "declared-world walk");
  assert.strictEqual(animated.timeline.frames.length, timelineA.summary.frame_count);

  assert.notStrictEqual(lazy.projection_receipt, greedy.projection_receipt);
  assert.notStrictEqual(greedy.projection_receipt, staticView.projection_receipt);
  assert.notStrictEqual(staticView.projection_receipt, animated.projection_receipt);
  assert.strictEqual(lazy.projection_receipt, lazyAltView.projection_receipt);
  assert.notStrictEqual(lazy.view_receipt, lazyAltView.view_receipt);

  console.log("  OK narrative timeline is deterministic and view-stable\n");
}

function testComposerShellNarrativeSurface() {
  console.log("Testing composer shell narrative timeline surface");

  const trailerSource = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const composer = composerShell.createComposer(trailerSource);
  const current = composerShell.currentNarrativeTimeline(composer);
  const projected = composerShell.projectNarrativeTimeline(composer, {
    mode: "greedy",
    view_mode: "movie"
  });
  const projectedAgain = composerShell.projectNarrativeTimeline(composer, {
    mode: "greedy",
    view_mode: "movie"
  });

  assert.ok(current);
  assert.strictEqual(current.root, "narrative-series");
  assert.strictEqual(projected.identity_receipt, current.identity_receipt);
  assert.strictEqual(projected.movie.frame_count, projectedAgain.movie.frame_count);
  assert.strictEqual(projected.projection_receipt, projectedAgain.projection_receipt);
  assert.strictEqual(projected.view_receipt, projectedAgain.view_receipt);

  console.log("  OK composer shell exposes deterministic narrative timeline readouts\n");
}

function testRejectionPaths() {
  console.log("Testing narrative timeline rejection paths");

  assert.throws(function () {
    narrativeTimeline.createNarrativeTimeline({
      identity: { sid: "broken" }
    }, {
      base_dir: path.join(__dirname, "..")
    });
  }, /invalid-narrative-declaration/);

  assert.throws(function () {
    narrativeTimeline.projectNarrativeTimeline(null, { mode: "lazy" });
  }, /invalid-narrative-projection/);

  console.log("  OK malformed narrative inputs reject deterministically\n");
}

console.log("Testing Phase 79 - Narrative Timeline as Declared World");
console.log("========================================================\n");

testNarrativeTimelineModes();
testComposerShellNarrativeSurface();
testRejectionPaths();

console.log("\n========================================================");
console.log("ALL PHASE 79 NARRATIVE TIMELINE TESTS PASSED");
