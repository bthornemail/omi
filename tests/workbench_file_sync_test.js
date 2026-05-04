const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const sourceBuffer = require("../workbench/src/source_buffer.js");
const editLog = require("../workbench/src/edit_log.js");
const editReplay = require("../workbench/src/edit_replay.js");
const editMerge = require("../workbench/src/edit_merge.js");
const syncPacket = require("../workbench/src/sync_packet.js");
const fileSync = require("../workbench/src/file_sync_adapter.js");

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

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "omi-file-sync-"));
}

function testDeterministicPacketFile() {
  console.log("Testing deterministic .omi-sync.json packet write/read");

  const tempDir = makeTempDir();
  const filePath = path.join(tempDir, "segment.omi-sync.json");
  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const log = makeCommittedLog([
    {
      action: "move-object",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
      proposalText: sourceBuffer.proposeMoveEdit("model.trailer.wike-ebike-cargo/motion/wheel.left", "x6.y0.r0")
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

  const encoded = fileSync.writePacketFile(filePath, packet, syncPacket, baseReceipt);
  const written = fs.readFileSync(filePath, "utf8").trim();
  const decoded = fileSync.readPacketFile(filePath, syncPacket, baseReceipt);

  assert.strictEqual(encoded, written);
  assert.strictEqual(decoded.receipt_hash, packet.receipt_hash);

  console.log("  OK packet files are written and read deterministically\n");
}

function testOrderedSyncLogBundle() {
  console.log("Testing ordered .omi-synclog.json bundle write/read");

  const tempDir = makeTempDir();
  const filePath = path.join(tempDir, "bundle.omi-synclog.json");
  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
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

  const bundle = fileSync.writeSyncLogFile(filePath, [packet], syncPacket, baseReceipt);
  const readBundle = fileSync.readSyncLogFile(filePath, syncPacket, baseReceipt);

  assert.strictEqual(bundle.bundle_receipt, readBundle.bundle_receipt);
  assert.strictEqual(readBundle.packet_count, 1);
  assert.strictEqual(readBundle.packets[0].receipt_hash, packet.receipt_hash);

  console.log("  OK ordered sync-log bundles stay deterministic\n");
}

function testApplyBundleAndDuplicateSuppression() {
  console.log("Testing bundle apply and duplicate suppression");

  const tempDir = makeTempDir();
  const filePath = path.join(tempDir, "bundle.omi-synclog.json");
  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const left = makeCommittedLog([
    {
      action: "move-object",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
      proposalText: sourceBuffer.proposeMoveEdit("model.trailer.wike-ebike-cargo/motion/wheel.left", "x7.y0.r0")
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

  fileSync.writeSyncLogFile(filePath, [packet], syncPacket, baseReceipt);
  const first = fileSync.applySyncLogFile(state, filePath, syncPacket, editLog, baseReceipt);
  const replay = editReplay.replay(base, state.imported_log, editLog);
  const second = fileSync.applySyncLogFile(state, filePath, syncPacket, editLog, baseReceipt);

  assert.strictEqual(first.applied, 1);
  assert.strictEqual(first.duplicates, 0);
  assert.strictEqual(replay.source, merged.replay.source);
  assert.strictEqual(second.applied, 0);
  assert.strictEqual(second.duplicates, 1);

  console.log("  OK sync-log bundles reconstruct imports and ignore duplicates\n");
}

function testMissingSequenceAndInvalidBaseReceipt() {
  console.log("Testing missing sequence requests and invalid base rejection");

  const tempDir = makeTempDir();
  const gapPath = path.join(tempDir, "gap.omi-synclog.json");
  const invalidPath = path.join(tempDir, "invalid.omi-sync.json");
  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const state = syncPacket.createSyncState({
    base_receipt: baseReceipt,
    local_peer: "local"
  }, editLog);
  const gapPacket = syncPacket.createPacket(syncPacket.packetKinds.ACK_RECEIPT, {
    base_receipt: baseReceipt,
    source_peer: "remote",
    target_peer: "local",
    sequence: 2,
    log_events: [],
    conflict_events: []
  });
  const invalidPacket = syncPacket.createPacket(syncPacket.packetKinds.EDIT_LOG_SEGMENT, {
    base_receipt: baseReceipt + 1,
    source_peer: "remote",
    target_peer: "local",
    sequence: 1,
    log_events: [],
    conflict_events: []
  });

  fileSync.writeSyncLogFile(gapPath, [gapPacket], syncPacket, baseReceipt);
  const gapResult = fileSync.applySyncLogFile(state, gapPath, syncPacket, editLog, baseReceipt);

  assert.strictEqual(gapResult.applied, 0);
  assert.strictEqual(gapResult.emitted_packets.length, 1);
  assert.strictEqual(gapResult.emitted_packets[0].packet_kind, syncPacket.packetKinds.REQUEST_MISSING_SEGMENT);

  fileSync.writePacketFile(invalidPath, invalidPacket, syncPacket);
  assert.throws(function () {
    fileSync.readPacketFile(invalidPath, syncPacket, baseReceipt);
  }, /base-receipt-mismatch/);

  console.log("  OK sequence gaps request missing packets and invalid bases reject\n");
}

console.log("Testing Phase 51A - File-Based Workbench Sync Adapter");
console.log("=====================================================\n");

testDeterministicPacketFile();
testOrderedSyncLogBundle();
testApplyBundleAndDuplicateSuppression();
testMissingSequenceAndInvalidBaseReceipt();

console.log("\n=====================================================");
console.log("ALL PHASE 51A FILE SYNC TESTS PASSED");
