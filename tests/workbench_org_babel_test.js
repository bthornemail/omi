const assert = require("assert");

const orgParser = require("../workbench/src/org_parser.js");
const orgPropertyDrawer = require("../workbench/src/org_property_drawer.js");
const orgBabelBlocks = require("../workbench/src/org_babel_blocks.js");
const treeSitterBridge = require("../workbench/src/tree_sitter_bridge.js");

const sample = [
  "#+TITLE: Demo",
  "* Model",
  ":PROPERTIES:",
  ":OMI_PATH: model.trailer.wike-ebike-cargo/motion/wheel.left",
  ":OMI_FS: model.trailer.wike-ebike-cargo",
  ":OMI_GS: motion",
  ":OMI_RS: wheel.left",
  ":END:",
  "#+name: wheel-record",
  "#+begin_src omilisp :tangle model.omilisp",
  "((RS . wheel.left)",
  "  ((US . primitive) . circle)",
  "  ((US . function) . rolling-support))",
  "#+end_src",
  "* Graph",
  "#+begin_src dot :tangle graph.dot",
  "digraph { trailer -> bicycle [label=\"hitch-link\"]; }",
  "#+end_src",
  "* SVG",
  "#+begin_src svg :tangle trailer.svg",
  "<svg><circle data-omi-path=\"model.trailer.wike-ebike-cargo/motion/wheel.left\" /></svg>",
  "#+end_src"
].join("\n");

function testOrgBabelAndBridge() {
  console.log("Testing Org/Babel parsing and tree-sitter bridge");

  const parsed = orgParser.parse(sample);
  const blocks = orgBabelBlocks.parse(sample);
  const properties = orgPropertyDrawer.parse(sample);
  const omiBlocks = treeSitterBridge.extractOmiBlocks(sample);
  const graphBlocks = treeSitterBridge.extractGraphBlocks(sample);
  const svgPointers = treeSitterBridge.extractSvgPointers(sample);

  assert.strictEqual(parsed.sections.length, 3);
  assert.strictEqual(blocks.length, 3);
  assert.strictEqual(properties.OMI_PATH, "model.trailer.wike-ebike-cargo/motion/wheel.left");
  assert.strictEqual(omiBlocks.length, 1);
  assert.strictEqual(graphBlocks.length, 1);
  assert.deepStrictEqual(svgPointers, ["model.trailer.wike-ebike-cargo/motion/wheel.left"]);

  console.log("  OK Org blocks, property drawers, and bridge extraction stay deterministic\n");
}

console.log("Testing Phase 52 - Org/Babel and Tree-Sitter Bridge");
console.log("===================================================\n");

testOrgBabelAndBridge();

console.log("\n===================================================");
console.log("ALL PHASE 52 ORG/BABEL TESTS PASSED");
