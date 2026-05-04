const assert = require("assert");

const orgBabelBlocks = require("../workbench/src/org_babel_blocks.js");
const nowebExpander = require("../workbench/src/noweb_expander.js");
const tangleEngine = require("../workbench/src/tangle_engine.js");

const sample = [
  "#+name: wheel-record",
  "#+begin_src omilisp",
  "((RS . wheel.left)",
  "  ((US . primitive) . circle))",
  "#+end_src",
  "#+begin_src omilisp :tangle model.omilisp :noweb yes",
  "((FS . model.demo)",
  "  ((GS . motion)",
  "    <<wheel-record>>))",
  "#+end_src"
].join("\n");

function testNowebAndTangle() {
  console.log("Testing deterministic noweb expansion and tangle");

  const blocks = orgBabelBlocks.parse(sample);
  const expanded = nowebExpander.expand(blocks[1].text, blocks);
  const tangled = tangleEngine.tangle(blocks);

  assert.ok(expanded.includes("((RS . wheel.left)"));
  assert.ok(tangled["model.omilisp"].includes("((RS . wheel.left)"));
  assert.strictEqual(tangled["model.omilisp"], tangleEngine.tangle(blocks)["model.omilisp"]);

  console.log("  OK noweb expansion and tangle outputs are deterministic\n");
}

console.log("Testing Phase 52 - Noweb/Tangle");
console.log("================================\n");

testNowebAndTangle();

console.log("\n================================");
console.log("ALL PHASE 52 NOWEB/TANGLE TESTS PASSED");
