const assert = require("assert");
const fs = require("fs");
const path = require("path");

const sourceBuffer = require("../workbench/src/source_buffer.js");
const editLog = require("../workbench/src/edit_log.js");
const editReplay = require("../workbench/src/edit_replay.js");
const editMerge = require("../workbench/src/edit_merge.js");
const syncPacket = require("../workbench/src/sync_packet.js");

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

function testEditLogSegmentEncoding() {
  console.log("Testing deterministic edit log segment packets");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const log = makeCommittedLog([
    {
      action: "move-object",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
      proposalText: sourceBuffer.proposeMoveEdit("model.trailer.wike-ebike-cargo/motion/wheel.left", "x5.y0.r0")
    }
  ]);
  const packet = syncPacket.createPacket(syncPacket.packetKinds.EDIT_LOG_SEGMENT, {
    base_receipt: baseReceipt,
    source_peer: "alice",
    target_peer: "bob",
    sequence: 1,
    log_events: log.events,
    conflict_events: []
  });
  const encoded = syncPacket.encodePacket(packet, baseReceipt);
  const decoded = syncPacket.decodePacket(encoded, baseReceipt);
  const encodedAgain = syncPacket.encodePacket(decoded, baseReceipt);

  assert.strictEqual(encoded, encodedAgain);
  assert.strictEqual(packet.receipt_hash, decoded.receipt_hash);
  assert.strictEqual(decoded.packet_kind, syncPacket.packetKinds.EDIT_LOG_SEGMENT);
  assert.strictEqual(decoded.log_events.length, 2);

  console.log("  OK edit log segments encode and decode deterministically\n");
}

function testMergeAndConflictPackets() {
  console.log("Testing merge log and conflict packets");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
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
  const merged = editMerge.mergeLogs(base, left, right, editLog, editReplay, {
    leftId: "alice",
    rightId: "bob"
  });

  const mergePacket = syncPacket.createPacket(syncPacket.packetKinds.MERGE_LOG_SEGMENT, {
    base_receipt: baseReceipt,
    source_peer: "merge-court",
    target_peer: "carol",
    sequence: 1,
    log_events: merged.mergedLog.events.filter(function (event) {
      return event.type !== "conflict";
    }),
    conflict_events: merged.conflicts
  });
  const conflictPacket = syncPacket.createPacket(syncPacket.packetKinds.CONFLICT_RECORD, {
    base_receipt: baseReceipt,
    source_peer: "merge-court",
    target_peer: "carol",
    sequence: 2,
    log_events: [],
    conflict_events: merged.conflicts
  });

  assert.strictEqual(syncPacket.decodePacket(syncPacket.encodePacket(mergePacket, baseReceipt), baseReceipt).packet_kind, syncPacket.packetKinds.MERGE_LOG_SEGMENT);
  assert.strictEqual(syncPacket.decodePacket(syncPacket.encodePacket(conflictPacket, baseReceipt), baseReceipt).packet_kind, syncPacket.packetKinds.CONFLICT_RECORD);
  assert.strictEqual(conflictPacket.conflict_events.length, 1);

  console.log("  OK merge and conflict packets preserve deterministic payloads\n");
}

function testInvalidBaseReceiptAndDuplicates() {
  console.log("Testing invalid base receipt rejection and duplicate suppression");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const state = syncPacket.createSyncState({
    base_receipt: baseReceipt,
    local_peer: "local"
  }, editLog);
  const log = makeCommittedLog([
    {
      action: "apply-texture",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
      proposalText: sourceBuffer.proposeTextureEdit("model.trailer.wike-ebike-cargo/motion/wheel.left", "texture.black-rubber-wheel")
    }
  ]);
  const packet = syncPacket.createPacket(syncPacket.packetKinds.EDIT_LOG_SEGMENT, {
    base_receipt: baseReceipt,
    source_peer: "alice",
    target_peer: "local",
    sequence: 1,
    log_events: log.events,
    conflict_events: []
  });
  const invalid = syncPacket.createPacket(syncPacket.packetKinds.EDIT_LOG_SEGMENT, {
    base_receipt: baseReceipt + 1,
    source_peer: "alice",
    target_peer: "local",
    sequence: 1,
    log_events: log.events,
    conflict_events: []
  });

  const rejected = syncPacket.applyPacket(state, invalid, editLog);
  assert.strictEqual(rejected.status, "rejected");
  assert.strictEqual(rejected.error, "base-receipt-mismatch");

  const applied = syncPacket.applyPacket(state, packet, editLog);
  assert.strictEqual(applied.status, "applied");
  const duplicate = syncPacket.applyPacket(state, packet, editLog);
  assert.strictEqual(duplicate.status, "duplicate");

  console.log("  OK invalid base receipts reject and duplicate packets are ignored\n");
}

function testMissingSequenceRequest() {
  console.log("Testing deterministic missing segment request");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const state = syncPacket.createSyncState({
    base_receipt: baseReceipt,
    local_peer: "local"
  }, editLog);
  const packet = syncPacket.createPacket(syncPacket.packetKinds.ACK_RECEIPT, {
    base_receipt: baseReceipt,
    source_peer: "remote",
    target_peer: "local",
    sequence: 2,
    log_events: [],
    conflict_events: []
  });

  const result = syncPacket.applyPacket(state, packet, editLog);
  assert.strictEqual(result.status, "missing-sequence");
  assert.ok(result.emitted_packet);
  assert.strictEqual(result.emitted_packet.packet_kind, syncPacket.packetKinds.REQUEST_MISSING_SEGMENT);
  assert.strictEqual(result.emitted_packet.sequence, 1);

  console.log("  OK missing sequences emit deterministic request packets\n");
}

function testApplyPacketsReconstructMergedLog() {
  console.log("Testing packet application reconstructs deterministic merged log");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
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
  const merged = editMerge.mergeLogs(base, left, right, editLog, editReplay, {
    leftId: "alice",
    rightId: "bob"
  });
  const packet = syncPacket.createPacket(syncPacket.packetKinds.MERGE_LOG_SEGMENT, {
    base_receipt: baseReceipt,
    source_peer: "merge-court",
    target_peer: "local",
    sequence: 1,
    log_events: merged.mergedLog.events.filter(function (event) {
      return event.type !== "conflict";
    }),
    conflict_events: merged.conflicts
  });
  const state = syncPacket.createSyncState({
    base_receipt: baseReceipt,
    local_peer: "local"
  }, editLog);

  const result = syncPacket.applyPacket(state, packet, editLog);
  const replay = editReplay.replay(base, state.imported_log, editLog);

  assert.strictEqual(result.status, "applied");
  assert.strictEqual(replay.source, merged.replay.source);
  assert.strictEqual(editLog.receipt(state.imported_log), editLog.receipt(merged.mergedLog));

  console.log("  OK packet application reconstructs the same merged log replay\n");
}

console.log("Testing Phase 50 - Workbench Sync Packet Court");
console.log("==============================================\n");

testEditLogSegmentEncoding();
testMergeAndConflictPackets();
testInvalidBaseReceiptAndDuplicates();
testMissingSequenceRequest();
testApplyPacketsReconstructMergedLog();

console.log("\n==============================================");
console.log("ALL PHASE 50 WORKBENCH SYNC PACKET TESTS PASSED");
