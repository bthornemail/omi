const assert = require("assert");
const fs = require("fs");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const ascii = require("../workbench/src/ascii_plane.js");
const tree = require("../workbench/src/tree_view.js");
const graph = require("../workbench/src/graph_view.js");
const preview = require("../workbench/src/polyform_preview.js");
const sourceBuffer = require("../workbench/src/source_buffer.js");
const polyform2d = require("../workbench/src/polyform_2d.js");
const canvasBackend = require("../workbench/src/canvas2d_backend.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testTrailerModel() {
  console.log("Testing workbench trailer model load");

  const source = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const document = parser.parseDocument(source);
  const asciiView = ascii.inspectAsciiPlanes(source, document);
  const previewView = preview.buildPreview(document);
  const treeHtml = tree.renderTree(document);
  const buffer = sourceBuffer.createSourceBuffer(source);
  const shapes2d = polyform2d.build(document, "near");
  const canvas = canvasBackend.buildProjection(document, shapes2d, "near");

  assert.strictEqual(document.id, "model.trailer.wike-ebike-cargo");
  assert.deepStrictEqual(document.counts, { fs: 1, gs: 9, rs: 29, us: 76 });
  assert.strictEqual(previewView.far, "box.two-wheels.tow-arm");
  assert.strictEqual(previewView.middle, "panels.frame.wheels.tow-arm");
  assert.strictEqual(previewView.near, "rails.latches.reflectors.hinges.spokes");
  assert.ok(treeHtml.includes("GS"));
  assert.ok(treeHtml.includes("RS"));
  assert.ok(treeHtml.includes("US"));
  assert.ok(asciiView.structural.some((item) => item.code === "0x1C"));
  assert.ok(asciiView.structural.some((item) => item.code === "0x1D"));
  assert.ok(asciiView.structural.some((item) => item.code === "0x1E"));
  assert.ok(asciiView.structural.some((item) => item.code === "0x1F"));
  assert.ok(asciiView.summary.operator > 0);
  assert.ok(asciiView.summary.metric > 0);
  assert.ok(asciiView.summary.symbol > 0);
  assert.ok(treeHtml.includes("data-omi-path"));
  assert.ok(document.records.some((record) => record.path === "model.trailer.wike-ebike-cargo/motion/wheel.left"));
  assert.strictEqual(canvas.backend, "canvas2d");
  assert.strictEqual(canvas.operations.length, shapes2d.length);
  assert.strictEqual(buffer.getSource(), source);

  const serialized = parser.serializeDocument(document);
  const reparsed = parser.parseDocument(serialized);
  assert.deepStrictEqual(reparsed.counts, document.counts);

  console.log("  OK trailer tree, ASCII, source buffer, and preview stay deterministic\n");
}

function testWorldModel() {
  console.log("Testing workbench cargo world load");

  const source = read("models/world/cargo-yard-demo.alist");
  const document = parser.parseDocument(source);
  const graphHtml = graph.renderGraph(document);
  const previewView = preview.buildPreview(document);
  const shapes2d = polyform2d.build(document, "middle");
  const canvas = canvasBackend.buildProjection(document, shapes2d, "middle");

  assert.strictEqual(document.id, "world.cargo-yard-demo");
  assert.deepStrictEqual(document.counts, { fs: 1, gs: 3, rs: 7, us: 22 });
  assert.strictEqual(document.graph.nodes.length, 3);
  assert.strictEqual(document.graph.edges.length, 3);
  assert.ok(graphHtml.includes("trailer.001"));
  assert.ok(graphHtml.includes("bicycle.001"));
  assert.ok(graphHtml.includes("cargo.001"));
  assert.ok(graphHtml.includes("hitch-link.001"));
  assert.ok(graphHtml.includes("load-support.001"));
  assert.ok(graphHtml.includes("rolling.001"));
  assert.ok(graphHtml.includes("data-omi-path"));
  assert.strictEqual(previewView.far, "FS.GS");
  assert.strictEqual(previewView.middle, "FS.GS.RS");
  assert.strictEqual(previewView.near, "FS.GS.RS.US");
  assert.strictEqual(canvas.operations.length, 3);

  const serialized = parser.serializeDocument(document);
  const reparsed = parser.parseDocument(serialized);
  assert.deepStrictEqual(reparsed.counts, document.counts);

  console.log("  OK world graph and roundtrip counts stay pinned\n");
}

function testProposedSourceEdit() {
  console.log("Testing visual edit proposal surface");

  const source = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const document = parser.parseDocument(source);
  const proposal = sourceBuffer.proposePropertyEdit(document, "RS.preview-note", "US.status", "draft");
  const moveProposal = sourceBuffer.proposeMoveEdit("world.cargo-yard-demo/objects/trailer.001", "x1.y0.r0");

  assert.ok(proposal.includes("RS.preview-note"));
  assert.ok(proposal.includes("US.status"));
  assert.ok(proposal.includes("draft"));
  assert.ok(moveProposal.includes("trailer.001"));
  assert.ok(moveProposal.includes("x1.y0.r0"));

  console.log("  OK visual edits stay proposed and source-centric\n");
}

console.log("Testing Phase 46C - OMI World Workbench MVP");
console.log("===========================================\n");

testTrailerModel();
testWorldModel();
testProposedSourceEdit();

console.log("\n===========================================");
console.log("ALL PHASE 46C WORKBENCH TESTS PASSED");
