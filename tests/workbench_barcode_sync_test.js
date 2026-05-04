const assert = require("assert");
const fs = require("fs");
const path = require("path");

const sourceBuffer = require("../workbench/src/source_buffer.js");
const editLog = require("../workbench/src/edit_log.js");
const editReplay = require("../workbench/src/edit_replay.js");
const syncPacket = require("../workbench/src/sync_packet.js");
const barcodeSync = require("../workbench/src/barcode_sync_adapter.js");

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

function testDeterministicCarrierEncoding() {
  console.log("Testing deterministic barcode carrier declaration encoding");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const log = makeCommittedLog([
    {
      action: "move-object",
      path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
      proposalText: sourceBuffer.proposeMoveEdit("model.trailer.wike-ebike-cargo/motion/wheel.left", "x8.y0.r0")
    }
  ]);
  const packet = syncPacket.createPacket(syncPacket.packetKinds.EDIT_LOG_SEGMENT, {
    base_receipt: baseReceipt,
    source_peer: "alice",
    target_peer: "scanner",
    sequence: 1,
    log_events: log.events,
    conflict_events: []
  });

  const encoded = barcodeSync.encodeCarrierDeclaration(packet, syncPacket, baseReceipt);
  const decoded = barcodeSync.decodeCarrierDeclaration(encoded, syncPacket, baseReceipt);
  const encodedAgain = barcodeSync.encodeCarrierDeclaration(decoded.packet, syncPacket, baseReceipt);

  assert.strictEqual(encoded, encodedAgain);
  assert.strictEqual(decoded.packet.receipt_hash, packet.receipt_hash);
  assert.strictEqual(decoded.declaration.code16k.sequence, 1);

  console.log("  OK sync packets encode into deterministic carrier declarations\n");
}

function testSelectorAndTimingBounds() {
  console.log("Testing BeeCode selector bounds and Code16K timing enforcement");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const packet = syncPacket.createPacket(syncPacket.packetKinds.ACK_RECEIPT, {
    base_receipt: baseReceipt,
    source_peer: "alice",
    target_peer: "scanner",
    sequence: 1,
    log_events: [],
    conflict_events: []
  });
  const encoded = barcodeSync.encodeCarrierDeclaration(packet, syncPacket, baseReceipt);
  const parsed = JSON.parse(encoded);

  parsed.beecode.selector_15bit = barcodeSync.constants.OMI_BEECODE_MAX_15BIT + 1;
  assert.throws(function () {
    barcodeSync.decodeCarrierDeclaration(JSON.stringify(parsed), syncPacket, baseReceipt);
  }, /invalid-beecode-selector/);

  parsed.beecode.selector_15bit = 42;
  parsed.code16k.operator_16 = 15;
  assert.throws(function () {
    barcodeSync.decodeCarrierDeclaration(JSON.stringify(parsed), syncPacket, baseReceipt);
  }, /invalid-code16k-timing/);

  console.log("  OK selector bounds and timing constants are enforced\n");
}

function testDecodedPacketAppliesThroughCourt() {
  console.log("Testing decoded carrier applies through Phase 50 packet court");

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
  const packet = syncPacket.createPacket(syncPacket.packetKinds.EDIT_LOG_SEGMENT, {
    base_receipt: baseReceipt,
    source_peer: "alice",
    target_peer: "local",
    sequence: 1,
    log_events: log.events,
    conflict_events: []
  });
  const declaration = barcodeSync.encodeCarrierDeclaration(packet, syncPacket, baseReceipt);
  const first = barcodeSync.applyDecodedCarrier(state, declaration, syncPacket, editLog, baseReceipt);
  const second = barcodeSync.applyDecodedCarrier(state, declaration, syncPacket, editLog, baseReceipt);
  const replay = editReplay.replay(base, state.imported_log, editLog);

  assert.strictEqual(first.result.status, "applied");
  assert.strictEqual(second.result.status, "duplicate");
  assert.ok(replay.source.includes("texture.black-rubber-wheel"));

  console.log("  OK decoded carrier packets import through the packet court\n");
}

function testInvalidCarrierTimingAndBaseReject() {
  console.log("Testing invalid carrier timing and base receipt rejection");

  const base = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const baseReceipt = syncPacket.sourceReceipt(base);
  const packet = syncPacket.createPacket(syncPacket.packetKinds.ACK_RECEIPT, {
    base_receipt: baseReceipt,
    source_peer: "alice",
    target_peer: "local",
    sequence: 1,
    log_events: [],
    conflict_events: []
  });
  const encoded = barcodeSync.encodeCarrierDeclaration(packet, syncPacket, baseReceipt);
  const parsed = JSON.parse(encoded);

  parsed.aztec.base_receipt = baseReceipt + 1;
  assert.throws(function () {
    barcodeSync.decodeCarrierDeclaration(JSON.stringify(parsed), syncPacket, baseReceipt);
  }, /base-receipt-mismatch/);

  parsed.aztec.base_receipt = baseReceipt;
  parsed.packet_text = parsed.packet_text.replace("\"base_receipt\":" + baseReceipt, "\"base_receipt\":" + (baseReceipt + 1));
  assert.throws(function () {
    barcodeSync.decodeCarrierDeclaration(JSON.stringify(parsed), syncPacket, baseReceipt);
  }, /base-receipt-mismatch/);

  console.log("  OK invalid carrier/base receipts reject deterministically\n");
}

console.log("Testing Phase 51C - Barcode Workbench Sync Adapter");
console.log("==================================================\n");

testDeterministicCarrierEncoding();
testSelectorAndTimingBounds();
testDecodedPacketAppliesThroughCourt();
testInvalidCarrierTimingAndBaseReject();

console.log("\n==================================================");
console.log("ALL PHASE 51C BARCODE SYNC TESTS PASSED");
