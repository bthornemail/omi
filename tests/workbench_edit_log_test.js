const assert = require("assert");
const fs = require("fs");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const pointerRouter = require("../workbench/src/pointer_router.js");
const sourceBuffer = require("../workbench/src/source_buffer.js");
const editLog = require("../workbench/src/edit_log.js");
const editReplay = require("../workbench/src/edit_replay.js");
const svgBackend = require("../workbench/src/svg_backend.js");
const gltfExporter = require("../workbench/src/gltf_exporter.js");
const objExporter = require("../workbench/src/obj_mtl_exporter.js");
const polyform2d = require("../workbench/src/polyform_2d.js");
const polyform3d = require("../workbench/src/polyform_3d.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testCommitUndoRedoReplay() {
  console.log("Testing workbench edit log commit / undo / redo");

  const baseSource = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const document = parser.parseDocument(baseSource);
  const log = editLog.createEditLog();
  const moveRef = {
    id: "wheel.left",
    path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
    fs: "model.trailer.wike-ebike-cargo",
    gs: "motion",
    rs: "wheel.left",
    depth: "near"
  };
  const targetRef = {
    id: "tow-arm",
    path: "model.trailer.wike-ebike-cargo/motion/tow-arm",
    fs: "model.trailer.wike-ebike-cargo",
    gs: "motion",
    rs: "tow-arm",
    depth: "near"
  };

  const moveIntent = pointerRouter.proposeMove(moveRef, "x2.y1.r0");
  const relationIntent = pointerRouter.proposeRelation(moveRef, targetRef, "paired-with");
  const textureIntent = pointerRouter.proposeTexture(moveRef, "texture.black-rubber-wheel");

  const moveProposal = editLog.appendProposal(log, {
    action: moveIntent.relation,
    path: moveIntent.target,
    proposalText: moveIntent.proposedEdit
  });
  const relationProposal = editLog.appendProposal(log, {
    action: relationIntent.relation,
    path: relationIntent.target,
    proposalText: sourceBuffer.proposeRelationEdit(moveRef.path, targetRef.path, relationIntent.relation)
  });
  const textureProposal = editLog.appendProposal(log, {
    action: textureIntent.relation,
    path: textureIntent.target,
    proposalText: sourceBuffer.proposeTextureEdit(textureIntent.target, textureIntent.texture)
  });

  const moveCommit = editLog.commitProposal(log, moveProposal.seq);
  const relationCommit = editLog.commitProposal(log, relationProposal.seq);
  const textureCommit = editLog.commitProposal(log, textureProposal.seq);

  assert.ok(moveCommit);
  assert.ok(relationCommit);
  assert.ok(textureCommit);

  let replay = editReplay.replay(baseSource, log, editLog);
  assert.ok(replay.source.includes("x2.y1.r0"));
  assert.ok(replay.source.includes("paired-with"));
  assert.ok(replay.source.includes("texture.black-rubber-wheel"));

  const undo = editLog.appendUndo(log, relationCommit.seq);
  assert.strictEqual(undo.type, "undo");
  replay = editReplay.replay(baseSource, log, editLog);
  assert.ok(!replay.source.includes("paired-with"));

  const redo = editLog.appendRedo(log, relationCommit.seq);
  assert.strictEqual(redo.type, "redo");
  const replayAgain = editReplay.replay(baseSource, log, editLog);
  assert.ok(replayAgain.source.includes("paired-with"));
  assert.deepStrictEqual(replay.activeCommitSeqs.length + 1, replayAgain.activeCommitSeqs.length);

  const replayDeterministic = editReplay.replay(baseSource, log, editLog);
  assert.strictEqual(replayAgain.source, replayDeterministic.source);
  assert.strictEqual(replayAgain.receipt, replayDeterministic.receipt);
  assert.ok(editLog.receipt(log) !== 0);

  const reparsed = parser.parseDocument(replayAgain.source);
  assert.strictEqual(reparsed.id, document.id);

  console.log("  OK proposals commit into append-only log and replay deterministically\n");
}

function testExportReceiptMetadata() {
  console.log("Testing edit receipt metadata export");

  const baseSource = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const document = parser.parseDocument(baseSource);
  const log = editLog.createEditLog();
  const proposal = editLog.appendProposal(log, {
    action: "move-object",
    path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
    proposalText: sourceBuffer.proposeMoveEdit("model.trailer.wike-ebike-cargo/motion/wheel.left", "x1.y0.r0")
  });
  editLog.commitProposal(log, proposal.seq);
  const receipt = editLog.receipt(log);

  const shapes = polyform2d.build(document, "near");
  const solids = polyform3d.build(document);
  const svg = svgBackend.buildSvg(document, shapes, "near", { editReceipt: receipt });
  const gltf = gltfExporter.build(document, solids, "3d", { editReceipt: receipt });
  const obj = objExporter.build(document, solids, "3d", { editReceipt: receipt });
  const objReceipt = JSON.parse(obj.receipt);

  assert.ok(svg.includes("data-omi-edit-receipt=\"" + receipt + "\""));
  assert.strictEqual(gltf.extras.omi_edit_receipt, receipt);
  assert.strictEqual(objReceipt.omi_edit_receipt, receipt);

  console.log("  OK SVG, glTF, and OBJ receipt metadata include edit-log witness\n");
}

console.log("Testing Phase 48 - Workbench Edit Log and Undo/Redo Court");
console.log("=========================================================\n");

testCommitUndoRedoReplay();
testExportReceiptMetadata();

console.log("\n=========================================================");
console.log("ALL PHASE 48 WORKBENCH EDIT LOG TESTS PASSED");
