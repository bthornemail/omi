const assert = require("assert");
const fs = require("fs");
const path = require("path");

const sourceBuffer = require("../workbench/src/source_buffer.js");
const editLog = require("../workbench/src/edit_log.js");
const editReplay = require("../workbench/src/edit_replay.js");
const editMerge = require("../workbench/src/edit_merge.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function makeCommittedLog(entries) {
  const log = editLog.createEditLog();
  entries.forEach(function (entry) {
    const proposal = editLog.appendProposal(log, entry);
    editLog.commitProposal(log, proposal.seq);
  });
  return log;
}

function testNonConflictingMerge() {
  console.log("Testing deterministic non-conflicting merge");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const left = makeCommittedLog([
    {
      action: "move-object",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
      proposalText: sourceBuffer.proposeMoveEdit("model.trailer.wike-ebike-cargo/motion/wheel.left", "x3.y0.r0")
    }
  ]);
  const right = makeCommittedLog([
    {
      action: "apply-texture",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.right",
      proposalText: sourceBuffer.proposeTextureEdit("model.trailer.wike-ebike-cargo/motion/wheel.right", "texture.black-rubber-wheel")
    }
  ]);

  const merged = editMerge.mergeLogs(base, left, right, editLog, editReplay, {
    leftId: "alice",
    rightId: "bob"
  });

  assert.strictEqual(merged.conflicts.length, 0);
  assert.ok(merged.replay.source.includes("x3.y0.r0"));
  assert.ok(merged.replay.source.includes("texture.black-rubber-wheel"));
  assert.strictEqual(left.events.length, 2);
  assert.strictEqual(right.events.length, 2);

  const mergedAgain = editMerge.mergeLogs(base, left, right, editLog, editReplay, {
    leftId: "alice",
    rightId: "bob"
  });
  assert.strictEqual(merged.receipt, mergedAgain.receipt);
  assert.strictEqual(merged.replay.source, mergedAgain.replay.source);

  console.log("  OK non-conflicting logs merge deterministically\n");
}

function testMoveConflict() {
  console.log("Testing conflicting move edits");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const left = makeCommittedLog([
    {
      action: "move-object",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
      proposalText: sourceBuffer.proposeMoveEdit("model.trailer.wike-ebike-cargo/motion/wheel.left", "x1.y0.r0")
    }
  ]);
  const right = makeCommittedLog([
    {
      action: "move-object",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
      proposalText: sourceBuffer.proposeMoveEdit("model.trailer.wike-ebike-cargo/motion/wheel.left", "x9.y0.r0")
    }
  ]);

  const merged = editMerge.mergeLogs(base, left, right, editLog, editReplay);
  assert.strictEqual(merged.conflicts.length, 1);
  assert.strictEqual(merged.conflicts[0].type, "conflict");
  assert.strictEqual(merged.conflicts[0].action, "move-object");
  assert.ok(!merged.replay.source.includes("x1.y0.r0"));
  assert.ok(!merged.replay.source.includes("x9.y0.r0"));

  console.log("  OK conflicting move edits produce a conflict record\n");
}

function testRelationAndTextureConflicts() {
  console.log("Testing relation and texture conflicts");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const relationLeft = makeCommittedLog([
    {
      action: "relation-create",
      path: "world.cargo-yard-demo/interactions/hitch-link.001",
      proposalText: sourceBuffer.proposeRelationEdit(
        "bicycle.001/hitch",
        "trailer.001/tow-arm",
        "paired-with"
      )
    }
  ]);
  const relationRight = makeCommittedLog([
    {
      action: "relation-create",
      path: "world.cargo-yard-demo/interactions/hitch-link.001",
      proposalText: sourceBuffer.proposeRelationEdit(
        "bicycle.001/hitch",
        "trailer.001/panel.floor",
        "paired-with"
      )
    }
  ]);
  const textureLeft = makeCommittedLog([
    {
      action: "apply-texture",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
      proposalText: sourceBuffer.proposeTextureEdit(
        "model.trailer.wike-ebike-cargo/motion/wheel.left",
        "texture.black-rubber-wheel"
      )
    }
  ]);
  const textureRight = makeCommittedLog([
    {
      action: "apply-texture",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
      proposalText: sourceBuffer.proposeTextureEdit(
        "model.trailer.wike-ebike-cargo/motion/wheel.left",
        "texture.orange-warning-wheel"
      )
    }
  ]);

  const relationMerged = editMerge.mergeLogs(base, relationLeft, relationRight, editLog, editReplay);
  const textureMerged = editMerge.mergeLogs(base, textureLeft, textureRight, editLog, editReplay);

  assert.strictEqual(relationMerged.conflicts.length, 1);
  assert.strictEqual(relationMerged.conflicts[0].action, "relation-create");
  assert.strictEqual(textureMerged.conflicts.length, 1);
  assert.strictEqual(textureMerged.conflicts[0].action, "apply-texture");

  console.log("  OK relation and texture collisions produce conflict records\n");
}

function testMergedUndoRedoReplay() {
  console.log("Testing merged replay with undo and redo");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const left = makeCommittedLog([
    {
      action: "move-object",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
      proposalText: sourceBuffer.proposeMoveEdit("model.trailer.wike-ebike-cargo/motion/wheel.left", "x4.y0.r0")
    }
  ]);
  const right = makeCommittedLog([
    {
      action: "apply-texture",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.right",
      proposalText: sourceBuffer.proposeTextureEdit("model.trailer.wike-ebike-cargo/motion/wheel.right", "texture.black-rubber-wheel")
    }
  ]);

  const merged = editMerge.mergeLogs(base, left, right, editLog, editReplay);
  const textureCommit = merged.mergedLog.events.find(function (event) {
    return event.type === "commit" && event.action === "apply-texture";
  });
  assert.ok(textureCommit);

  editLog.appendUndo(merged.mergedLog, textureCommit.seq);
  let replay = editReplay.replay(base, merged.mergedLog, editLog);
  assert.ok(!replay.source.includes("texture.black-rubber-wheel"));

  editLog.appendRedo(merged.mergedLog, textureCommit.seq);
  replay = editReplay.replay(base, merged.mergedLog, editLog);
  assert.ok(replay.source.includes("texture.black-rubber-wheel"));

  console.log("  OK merged logs remain replayable under undo/redo\n");
}

console.log("Testing Phase 49 - Workbench Collaboration and Merge Court");
console.log("==========================================================\n");

testNonConflictingMerge();
testMoveConflict();
testRelationAndTextureConflicts();
testMergedUndoRedoReplay();

console.log("\n==========================================================");
console.log("ALL PHASE 49 WORKBENCH MERGE TESTS PASSED");
