const assert = require("assert");
const fs = require("fs");
const path = require("path");

const spomAdapter = require("../workbench/src/spom_adapter.js");
const composerShell = require("../workbench/src/composer_shell.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testCanonicalDeclarationTriangulation() {
  console.log("Testing canonical declaration triangulation");

  const narrativeSource = read("declarations/narrative-series.omilisp");
  const addrSource = read("declarations/addr128.omilisp");
  const narrativeA = spomAdapter.triangulateSource(narrativeSource);
  const narrativeB = spomAdapter.triangulateSource(narrativeSource);
  const addr128 = spomAdapter.triangulateSource(addrSource);
  const lazy = spomAdapter.projectTriangulation(narrativeA, "lazy");
  const greedy = spomAdapter.projectTriangulation(narrativeA, "greedy");
  const staticView = spomAdapter.projectTriangulation(narrativeA, "static");
  const animated = spomAdapter.projectTriangulation(narrativeA, "animated");

  assert.deepStrictEqual(narrativeA.summary.section_order, ["identity", "address", "scope", "chapters", "relations", "projections", "receipts"]);
  assert.strictEqual(narrativeA.identity_receipt, narrativeB.identity_receipt);
  assert.strictEqual(narrativeA.source_kind, "omilisp");
  assert.strictEqual(narrativeA.root, "narrative-series");
  assert.ok(narrativeA.triplets.length > 0);
  assert.ok(narrativeA.triplets.some((triplet) => triplet.subject === "narrative-series" && triplet.predicate === "section" && triplet.object === "identity"));
  assert.ok(narrativeA.triplets.some((triplet) => triplet.subject === "narrative-series" && triplet.predicate === "title" && triplet.object === "When Wisdom, Law, and the Tribe Sat Down Together"));
  assert.ok(narrativeA.triplets.some((triplet) => triplet.subject === "narrative-series.addr128" && triplet.predicate === "locator" && triplet.object === "addr128.v0"));
  assert.ok(narrativeA.triplets.some((triplet) => triplet.subject === "prelude.turning-away-from-the-word" && triplet.predicate === "path" && String(triplet.object).includes("Turning Away from the Word")));
  assert.strictEqual(lazy.identity_receipt, narrativeA.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, narrativeA.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, narrativeA.identity_receipt);
  assert.strictEqual(animated.identity_receipt, narrativeA.identity_receipt);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);
  assert.strictEqual(lazy.sealed_address, "narrative-series");
  assert.strictEqual(greedy.chart.triplet_count, narrativeA.triplets.length);
  assert.strictEqual(staticView.declared_space.plane_order.join(","), "FS,GS,RS,US");
  assert.strictEqual(animated.timeline.frame_count, 5040);

  assert.strictEqual(addr128.source_kind, "omilisp");
  assert.strictEqual(addr128.identity_receipt, spomAdapter.triangulateSource(addrSource).identity_receipt);
  assert.ok(addr128.triplets.some((triplet) => triplet.subject === "addr128" && triplet.predicate === "section" && triplet.object === "address"));
  assert.ok(addr128.triplets.some((triplet) => triplet.subject === "addr128.v0" && triplet.predicate === "width" && triplet.object === 128));
  assert.strictEqual(addr128.triplets.some((triplet) => triplet.modality.hearing.subject_band === "projection"), true);

  console.log("  OK canonical declarations triangulate deterministically with stable receipts and projection lenses\n");
}

function testLegacyTraceTriangulation() {
  console.log("Testing legacy FS/GS/RS/US trace triangulation");

  const trailerSource = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const trailerA = spomAdapter.triangulateSource(trailerSource);
  const trailerB = spomAdapter.triangulateSource(trailerSource);
  const greedy = spomAdapter.projectTriangulation(trailerA, "greedy");

  assert.strictEqual(trailerA.identity_receipt, trailerB.identity_receipt);
  assert.strictEqual(trailerA.source_kind, "legacy-trace");
  assert.strictEqual(trailerA.root, "model.trailer.wike-ebike-cargo");
  assert.ok(trailerA.triplets.length > 0);
  assert.ok(trailerA.triplets.some((triplet) => triplet.subject === "model.trailer.wike-ebike-cargo" && triplet.predicate === "group" && triplet.object === "identity"));
  assert.ok(trailerA.triplets.some((triplet) => triplet.subject === "identity" && triplet.predicate === "record" && triplet.object === "object"));
  assert.ok(trailerA.triplets.some((triplet) => triplet.subject === "object" && triplet.predicate === "class" && triplet.object === "trailer"));
  assert.strictEqual(greedy.chart.source_kind, "legacy-trace");
  assert.strictEqual(greedy.chart.triplet_count, trailerA.triplets.length);
  assert.strictEqual(greedy.witness, trailerA.identity_receipt);

  console.log("  OK legacy trace documents triangulate into the same S-P-O-M surface\n");
}

function testRawStreamTriangulation() {
  console.log("Testing raw stream declaration triangulation");

  const streamSource = "\u0000\u001f!09AB";
  const stream = spomAdapter.triangulateSource(streamSource, {
    stream_id: "stream.declaration.demo",
    stream_scope: "pre-os.declaration"
  });
  const animated = spomAdapter.projectTriangulation(stream, "animated");

  assert.strictEqual(stream.source_kind, "stream");
  assert.strictEqual(stream.root, "stream.declaration.demo");
  assert.strictEqual(stream.summary.band_counts.control, 2);
  assert.strictEqual(stream.summary.band_counts.operator, 1);
  assert.strictEqual(stream.summary.band_counts.measurement, 2);
  assert.strictEqual(stream.summary.band_counts.projection, 2);
  assert.ok(stream.triplets.some((triplet) => triplet.subject === "stream.declaration.demo" && triplet.predicate === "control" && triplet.object === 2));
  assert.ok(stream.triplets.some((triplet) => triplet.subject === "stream.declaration.demo" && triplet.predicate === "region" && triplet.object === "stream.0"));
  assert.ok(stream.triplets.some((triplet) => triplet.subject === "stream.0" && triplet.predicate === "start" && triplet.object === 0));
  assert.strictEqual(animated.timeline.frame_count, 5040);

  console.log("  OK raw byte streams triangulate into gauge-resolved declarations and projections\n");
}

function testComposerTriangulationSurface() {
  console.log("Testing composer triangulation surface");

  const worldSource = read("models/world/cargo-yard-demo.alist");
  const composer = composerShell.createComposer(worldSource);
  const current = composerShell.currentTriangulation(composer);
  const lazy = composerShell.projectTriangulation(composer, "lazy");
  const greedy = composerShell.projectTriangulation(composer, "greedy");

  assert.ok(current);
  assert.ok(current.triplet_count > 0 || (current.chart && current.chart.triplet_count > 0));
  assert.strictEqual(lazy.identity_receipt, greedy.identity_receipt);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.strictEqual(current.root, "world.cargo-yard-demo");

  console.log("  OK composer exposes a triangulation lens over its current trace source\n");
}

console.log("Testing Phase 76 - Gauge-Resolved Canonical Unification");
console.log("========================================================\n");

testCanonicalDeclarationTriangulation();
testLegacyTraceTriangulation();
testRawStreamTriangulation();
testComposerTriangulationSurface();

console.log("\n========================================================");
console.log("ALL PHASE 76 TRIANGULATION TESTS PASSED");
