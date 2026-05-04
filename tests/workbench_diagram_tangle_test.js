const assert = require("assert");
const fs = require("fs");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const diagramTangle = require("../workbench/src/diagram_tangle.js");
const orgBabelBlocks = require("../workbench/src/org_babel_blocks.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testDiagramTangle() {
  console.log("Testing deterministic diagram/graph tangle");

  const source = read("models/world/cargo-yard-demo.alist");
  const document = parser.parseDocument(source);
  const templateText = read("diagrams/qpbo-graph.omilisp");
  const nowebDoc = [
    "#+name: graph-preamble",
    "#+begin_src dot",
    "rankdir=LR;",
    "#+end_src"
  ].join("\n");
  const blocks = orgBabelBlocks.parse(nowebDoc);

  const tangledA = diagramTangle.tangleArtifacts({
    document: document,
    templateText: templateText,
    nowebBlocks: blocks
  });
  const tangledB = diagramTangle.tangleArtifacts({
    document: document,
    templateText: templateText,
    nowebBlocks: blocks
  });

  assert.deepStrictEqual(tangledA, tangledB);
  assert.strictEqual(tangledA.template.id, "diagram.qpbo-graph");
  assert.ok(tangledA.outputs["graph.dot"].includes("hitch-link.001"));
  assert.ok(tangledA.outputs["graph.dot"].includes("load-support.001"));
  assert.ok(tangledA.outputs["graph.dot"].includes("rolling.001"));
  assert.ok(tangledA.outputs["graph.dot"].includes("omi_path="));
  assert.ok(tangledA.outputs["graph.dot"].includes("rankdir=LR;"));

  const relations = JSON.parse(tangledA.outputs["relations.json"]);
  assert.strictEqual(relations.relation_count, 3);
  assert.strictEqual(relations.relations[0].id, "hitch-link.001");
  assert.ok(tangledA.outputs["diagram.index.org"].includes("world.cargo-yard-demo"));
  assert.ok(tangledA.outputs["diagram.index.org"].includes("diagram.qpbo-graph"));
  assert.ok(tangledA.outputs["diagram.index.org"].includes(String(tangledA.receipts.source)));

  console.log("  OK diagram artifacts tangle deterministically from canonical world relations\n");
}

console.log("Testing Phase 53 - Diagram/Graph Template Tangle Court");
console.log("=======================================================\n");

testDiagramTangle();

console.log("\n=======================================================");
console.log("ALL PHASE 53 DIAGRAM TANGLE TESTS PASSED");
