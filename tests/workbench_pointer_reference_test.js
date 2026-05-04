const assert = require("assert");
const fs = require("fs");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const pointerRouter = require("../workbench/src/pointer_router.js");
const svgBackend = require("../workbench/src/svg_backend.js");
const polyform2d = require("../workbench/src/polyform_2d.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testSvgPointersResolve() {
  console.log("Testing SVG data-omi pointer references");

  const source = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const document = parser.parseDocument(source);
  const shapes = polyform2d.build(document, "near");
  const svg = svgBackend.buildSvg(document, shapes, "near");

  assert.ok(svg.includes("data-omi-path=\"model.trailer.wike-ebike-cargo/motion/tow-arm\""));
  assert.ok(svg.includes("data-omi-fs=\"model.trailer.wike-ebike-cargo\""));
  assert.ok(svg.includes("data-omi-gs=\"motion\""));
  assert.ok(svg.includes("data-omi-rs=\"tow-arm\""));
  assert.ok(parser.resolvePath(document, "model.trailer.wike-ebike-cargo/motion/tow-arm"));

  console.log("  OK SVG pointers resolve back to canonical records\n");
}

function testPointerSelectAndMoveProposal() {
  console.log("Testing pointer routing and proposed edits");

  const reference = {
    id: "wheel.left",
    path: "model.trailer.wike-ebike-cargo/motion/wheel.left",
    fs: "model.trailer.wike-ebike-cargo",
    gs: "motion",
    rs: "wheel.left",
    depth: "near"
  };

  const event = pointerRouter.selectPointer(reference);
  const intent = pointerRouter.proposeMove(reference, "x2.y1.r0");

  assert.strictEqual(event.fs, "event.pointer-select");
  assert.strictEqual(event.target, reference.path);
  assert.strictEqual(event.relation, "select");
  assert.strictEqual(intent.fs, "intent.move-object");
  assert.strictEqual(intent.target, reference.path);
  assert.ok(intent.proposedEdit.includes("wheel.left"));
  assert.ok(intent.proposedEdit.includes("x2.y1.r0"));

  console.log("  OK pointer select emits event and move emits proposed intent only\n");
}

console.log("Testing Phase 47 - Workbench Pointer References");
console.log("===============================================\n");

testSvgPointersResolve();
testPointerSelectAndMoveProposal();

console.log("\n===============================================");
console.log("ALL PHASE 47 POINTER REFERENCE TESTS PASSED");
