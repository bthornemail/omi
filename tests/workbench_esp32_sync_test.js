const assert = require("assert");
const fs = require("fs");
const path = require("path");

const sourceBuffer = require("../workbench/src/source_buffer.js");
const editLog = require("../workbench/src/edit_log.js");
const editReplay = require("../workbench/src/edit_replay.js");
const syncPacket = require("../workbench/src/sync_packet.js");
const esp32Sync = require("../workbench/src/esp32_sync_adapter.js");

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

function testDeterministicEsp32Envelope() {
  console.log("Testing deterministic ESP32 sync envelope encoding");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const log = makeCommittedLog([
    {
      action: "move-object",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
      proposalText: sourceBuffer.proposeMoveEdit("model.trailer.wike-ebike-cargo/motion/wheel.left", "x9.y0.r0")
    }
  ]);
  const packet = syncPacket.createPacket(syncPacket.packetKinds.EDIT_LOG_SEGMENT, {
    base_receipt: baseReceipt,
    source_peer: "alice",
    target_peer: "esp32",
    sequence: 1,
    log_events: log.events,
    conflict_events: []
  });

  const encoded = esp32Sync.encodeSyncPacket(packet, syncPacket, baseReceipt);
  const decoded = esp32Sync.decodeSyncPacket(encoded, syncPacket, baseReceipt);
  const encodedAgain = esp32Sync.encodeSyncPacket(decoded.packet, syncPacket, baseReceipt);

  assert.strictEqual(encoded, encodedAgain);
  assert.strictEqual(decoded.packet.receipt_hash, packet.receipt_hash);
  assert.strictEqual(decoded.envelope.packet_kind, 4);

  console.log("  OK sync packets wrap into deterministic ESP32 MODEL_SYNC envelopes\n");
}

function testApplyThroughPacketCourtAndDuplicateSuppression() {
  console.log("Testing decoded ESP32 envelope applies through packet court");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const state = syncPacket.createSyncState({
    base_receipt: baseReceipt,
    local_peer: "local"
  }, editLog);
  const log = makeCommittedLog([
    {
      action: "apply-texture",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.right",
      proposalText: sourceBuffer.proposeTextureEdit("model.trailer.wike-ebike-cargo/motion/wheel.right", "texture.black-rubber-wheel")
    }
  ]);
  const packet = syncPacket.createPacket(syncPacket.packetKinds.MERGE_LOG_SEGMENT, {
    base_receipt: baseReceipt,
    source_peer: "merge-court",
    target_peer: "local",
    sequence: 1,
    log_events: log.events,
    conflict_events: []
  });
  const encoded = esp32Sync.encodeSyncPacket(packet, syncPacket, baseReceipt);
  const first = esp32Sync.applyDecodedEnvelope(state, encoded, syncPacket, editLog, baseReceipt);
  const second = esp32Sync.applyDecodedEnvelope(state, encoded, syncPacket, editLog, baseReceipt);
  const replay = editReplay.replay(base, state.imported_log, editLog);

  assert.strictEqual(first.result.status, "applied");
  assert.strictEqual(second.result.status, "duplicate");
  assert.ok(replay.source.includes("texture.black-rubber-wheel"));

  console.log("  OK decoded ESP32 imports go through the Phase 50 packet court\n");
}

function testInvalidTimingRejects() {
  console.log("Testing invalid ESP32 timing rejection");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const packet = syncPacket.createPacket(syncPacket.packetKinds.BASE_RECEIPT, {
    base_receipt: baseReceipt,
    source_peer: "alice",
    target_peer: "local",
    sequence: 1,
    log_events: [],
    conflict_events: []
  });
  const encoded = esp32Sync.encodeSyncPacket(packet, syncPacket, baseReceipt);
  const parsed = JSON.parse(encoded);

  parsed.timing.kernel_8 = 9;
  assert.throws(function () {
    esp32Sync.decodeSyncPacket(JSON.stringify(parsed), syncPacket, baseReceipt);
  }, /invalid-timing-receipt/);

  console.log("  OK invalid timing receipts reject\n");
}

function testSequenceGapEmitsMissingSegment() {
  console.log("Testing ESP32 sequence gap handling");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const state = syncPacket.createSyncState({
    base_receipt: baseReceipt,
    local_peer: "local"
  }, editLog);
  const packet = syncPacket.createPacket(syncPacket.packetKinds.REQUEST_MISSING_SEGMENT, {
    base_receipt: baseReceipt,
    source_peer: "remote",
    target_peer: "local",
    sequence: 2,
    log_events: [],
    conflict_events: []
  });
  const encoded = esp32Sync.encodeSyncPacket(packet, syncPacket, baseReceipt);
  const result = esp32Sync.applyDecodedEnvelope(state, encoded, syncPacket, editLog, baseReceipt);

  assert.strictEqual(result.result.status, "missing-sequence");
  assert.ok(result.result.emitted_packet);
  assert.strictEqual(result.result.emitted_packet.packet_kind, syncPacket.packetKinds.REQUEST_MISSING_SEGMENT);

  console.log("  OK sequence gaps emit missing segment requests\n");
}

console.log("Testing Phase 51D - ESP32 Workbench Sync Adapter");
console.log("================================================\n");

testDeterministicEsp32Envelope();
testApplyThroughPacketCourtAndDuplicateSuppression();
testInvalidTimingRejects();
testSequenceGapEmitsMissingSegment();

console.log("\n================================================");
console.log("ALL PHASE 51D ESP32 SYNC TESTS PASSED");
