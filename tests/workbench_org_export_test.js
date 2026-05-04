const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const sourceBuffer = require("../workbench/src/source_buffer.js");
const editLog = require("../workbench/src/edit_log.js");
const editMerge = require("../workbench/src/edit_merge.js");
const editReplay = require("../workbench/src/edit_replay.js");
const syncPacket = require("../workbench/src/sync_packet.js");
const orgExporter = require("../workbench/src/org_exporter.js");
const orgParser = require("../workbench/src/org_parser.js");

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
  return fs.mkdtempSync(path.join(os.tmpdir(), "omi-org-export-"));
}

function testDeterministicBundleExport() {
  console.log("Testing deterministic Org export bundle");

  const source = read("models/world/cargo-yard-demo.alist");
  const document = parser.parseDocument(source);
  const left = makeCommittedLog([
    {
      action: "move-object",
      path: "world.cargo-yard-demo/objects/trailer.001",
      proposalText: sourceBuffer.proposeMoveEdit("world.cargo-yard-demo/objects/trailer.001", "x2.y0.r0")
    }
  ]);
  const right = makeCommittedLog([
    {
      action: "relation-create",
      path: "world.cargo-yard-demo/interactions/hitch-link.001",
      proposalText: sourceBuffer.proposeRelationEdit("bicycle.001/hitch", "trailer.001/tow-arm", "coupled-traction")
    }
  ]);
  const merged = editMerge.mergeLogs(source, left, right, editLog, editReplay, {
    leftId: "alice",
    rightId: "bob"
  });
  const baseReceipt = orgExporter.sourceReceipt(source);
  const packet = syncPacket.createPacket(syncPacket.packetKinds.MERGE_LOG_SEGMENT, {
    base_receipt: baseReceipt,
    source_peer: "merge-court",
    target_peer: "bundle",
    sequence: 1,
    log_events: merged.mergedLog.events.filter((event) => event.type !== "conflict"),
    conflict_events: merged.conflicts
  });

  const bundleA = orgExporter.exportBundle({
    source: source,
    document: document,
    editLog: merged.mergedLog,
    editLogApi: editLog,
    syncPackets: [packet],
    syncPacketApi: syncPacket
  });
  const bundleB = orgExporter.exportBundle({
    source: source,
    document: document,
    editLog: merged.mergedLog,
    editLogApi: editLog,
    syncPackets: [packet],
    syncPacketApi: syncPacket
  });

  assert.deepStrictEqual(bundleA, bundleB);
  assert.strictEqual(bundleA["model.omilisp"], source);
  assert.ok(bundleA["README.org"].includes("world.cargo-yard-demo"));
  assert.ok(bundleA["README.org"].includes("FS count :: 1"));
  assert.ok(bundleA["README.org"].includes("GS count :: 3"));
  assert.ok(bundleA["README.org"].includes("RS count :: 7"));
  assert.ok(bundleA["README.org"].includes("US count :: 22"));

  const receipts = JSON.parse(bundleA["receipts.json"]);
  assert.strictEqual(receipts.base_source_receipt, baseReceipt);
  assert.strictEqual(receipts.edit_log_receipt, editLog.receipt(merged.mergedLog));
  assert.ok(receipts.sync_bundle_receipt > 0);

  const editsRoundtrip = JSON.parse(bundleA["edits.omi-log.json"]);
  const syncRoundtrip = JSON.parse(bundleA["sync.omi-synclog.json"]);
  assert.strictEqual(editsRoundtrip.events.length, merged.mergedLog.events.length);
  assert.strictEqual(syncRoundtrip.packet_count, 1);

  const parsedOrg = orgParser.parse(bundleA["README.org"]);
  assert.ok(parsedOrg.blocks.some((block) => block.language === "omilisp"));
  assert.ok(parsedOrg.blocks.some((block) => block.language === "json"));
  assert.ok(parsedOrg.blocks.some((block) => block.language === "dot"));

  const tempDir = makeTempDir();
  orgExporter.writeBundle(tempDir, bundleA);
  const modelText = fs.readFileSync(path.join(tempDir, "model.omilisp"), "utf8");
  assert.strictEqual(modelText, source + "\n");

  console.log("  OK bundle export is deterministic and review-ready\n");
}

console.log("Testing Phase 52 - Literate Org/Tree-Sitter Export Court");
console.log("========================================================\n");

testDeterministicBundleExport();

console.log("\n========================================================");
console.log("ALL PHASE 52 ORG EXPORT TESTS PASSED");
