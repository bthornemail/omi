const assert = require("assert");
const fs = require("fs");
const path = require("path");

const omilispDeclaration = require("../workbench/src/omilisp_declaration.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testNarrativeDeclaration() {
  console.log("Testing canonical narrative declaration");

  const text = read("declarations/narrative-series.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(text);
  const parsedB = omilispDeclaration.parseDeclaration(text);
  const lazy = omilispDeclaration.projectDeclaration(parsedA, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsedA, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsedA, "static");
  const animated = omilispDeclaration.projectDeclaration(parsedA, "animated");

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.root, "omi");
  assert.strictEqual(parsedA.declaration.identity.sid, "narrative-series");
  assert.strictEqual(parsedA.declaration.identity.kind, "narrative.world");
  assert.strictEqual(parsedA.declaration.address.addr, "narrative-series.addr128");
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);
  assert.strictEqual(lazy.identity_receipt, parsedA.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsedA.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsedA.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsedA.identity_receipt);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);
  assert.strictEqual(lazy.sealed_address, "narrative-series.addr128");
  assert.strictEqual(greedy.chart.kind, "narrative.world");
  assert.strictEqual(greedy.chart.section_count, 7);
  assert.strictEqual(greedy.chart.entry_count, 14);
  assert.strictEqual(greedy.chart.relation_count, 12);
  assert.ok(greedy.chart.projection_modes.includes("lazy"));
  assert.ok(staticView.declared_space.section_order.includes("chapters"));
  assert.strictEqual(animated.timeline.frame_count, 5040);
  assert.strictEqual(animated.timeline.coordination, "sexagesimal rolling difference");

  console.log("  OK narrative declaration parses deterministically and projects lazily/greedily/static/animated\n");
}

function testAddr128Declaration() {
  console.log("Testing canonical addr128 declaration");

  const text = read("declarations/addr128.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(text);
  const parsedB = omilispDeclaration.parseDeclaration(text);
  const lazy = omilispDeclaration.projectDeclaration(parsedA, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsedA, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsedA, "static");
  const animated = omilispDeclaration.projectDeclaration(parsedA, "animated");

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "addr128");
  assert.strictEqual(parsedA.declaration.identity.kind, "locator.graph");
  assert.strictEqual(parsedA.declaration.address.addr, "addr128.v0");
  assert.strictEqual(parsedA.declaration.address.width, 128);
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);
  assert.strictEqual(lazy.identity_receipt, parsedA.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsedA.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsedA.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsedA.identity_receipt);
  assert.strictEqual(lazy.sealed_address, "addr128.v0");
  assert.strictEqual(greedy.chart.address_width, 128);
  assert.strictEqual(greedy.chart.lane_count, 11);
  assert.strictEqual(greedy.chart.kind, "locator.graph");
  assert.ok(staticView.declared_space.section_order.includes("lanes"));
  assert.strictEqual(animated.timeline.frame_count, 5040);

  console.log("  OK addr128 declaration parses deterministically and projects through the same receipts\n");
}

function testStableIdentityRoundTrip() {
  console.log("Testing stable identity receipt roundtrip");

  const narrative = omilispDeclaration.parseDeclaration(read("declarations/narrative-series.omilisp"));
  const addr128 = omilispDeclaration.parseDeclaration(read("declarations/addr128.omilisp"));
  const narrativeRoundTrip = omilispDeclaration.parseDeclaration(read("declarations/narrative-series.omilisp"));
  const addrRoundTrip = omilispDeclaration.parseDeclaration(read("declarations/addr128.omilisp"));

  assert.strictEqual(narrative.identity_receipt, narrativeRoundTrip.identity_receipt);
  assert.strictEqual(addr128.identity_receipt, addrRoundTrip.identity_receipt);
  assert.notStrictEqual(narrative.identity_receipt, addr128.identity_receipt);

  console.log("  OK identity receipts are stable and distinct across canonical declarations\n");
}

console.log("Testing Phase 75 - OMI-Lisp Canonical Declaration Surface");
console.log("===========================================================\n");

testNarrativeDeclaration();
testAddr128Declaration();
testStableIdentityRoundTrip();

console.log("\n===========================================================");
console.log("ALL PHASE 75 OMI-LISP DECLARATION TESTS PASSED");
