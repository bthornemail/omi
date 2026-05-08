const assert = require("assert");
const geometricReconciliation = require("../workbench/src/geometric_reconciliation.js");

function testViewDoctrine() {
  console.log("Testing geometric reconciliation view doctrine");

  assert.strictEqual(geometricReconciliation.normalizeViewName("barcode"), "lazy");
  assert.strictEqual(geometricReconciliation.normalizeViewName("chart"), "greedy");
  assert.strictEqual(geometricReconciliation.normalizeViewName("reconciled"), "static");
  assert.strictEqual(geometricReconciliation.normalizeViewName("sexagesimal"), "animated");

  const lazy = geometricReconciliation.describeView("lazy");
  const greedy = geometricReconciliation.describeView("greedy");
  const staticView = geometricReconciliation.describeView("static");
  const animated = geometricReconciliation.describeView("animated");

  assert.strictEqual(lazy.alias, "barcode");
  assert.strictEqual(greedy.alias, "chart");
  assert.strictEqual(staticView.alias, "reconciled");
  assert.strictEqual(animated.alias, "sexagesimal");
  assert.strictEqual(lazy.declaration_surface, "sealed address");
  assert.strictEqual(greedy.geometry_surface, "state-space chart");
  assert.strictEqual(staticView.reconciliation_surface, "identity proof");
  assert.strictEqual(animated.reconciliation_surface, "5040-state court");
  assert.strictEqual(lazy.witness, geometricReconciliation.describeView("lazy").witness);

  console.log("  OK lazy, greedy, static, and animated views normalize deterministically\n");
}

function testFractalResolution() {
  console.log("Testing fractal resolution doctrine");

  const vertex = geometricReconciliation.describeResolution("vertex");
  const edge = geometricReconciliation.describeResolution("edge");
  const face = geometricReconciliation.describeResolution("face");
  const cell = geometricReconciliation.describeResolution("cell");
  const subchart = geometricReconciliation.describeResolution("subchart");

  assert.strictEqual(vertex.depth, 0);
  assert.strictEqual(edge.depth, 1);
  assert.strictEqual(face.depth, 2);
  assert.strictEqual(cell.depth, 3);
  assert.strictEqual(subchart.depth, 4);
  assert.strictEqual(vertex.expands_to, "edge");
  assert.strictEqual(edge.expands_to, "face");
  assert.strictEqual(face.expands_to, "cell");
  assert.strictEqual(cell.expands_to, "subchart");

  console.log("  OK vertex, edge, face, and cell resolve as recursive depth levels\n");
}

function testDeclaredObjectConsistency() {
  console.log("Testing consistent declared object views");

  const summary = geometricReconciliation.consistentDeclaredObjectSummary("frame.delta.001", {
    scene: "frame.scene.alpha",
    context: "sealed-to-chart"
  });
  const repeat = geometricReconciliation.consistentDeclaredObjectSummary("frame.delta.001", {
    scene: "frame.scene.alpha",
    context: "sealed-to-chart"
  });

  assert.deepStrictEqual(summary, repeat);
  assert.strictEqual(summary.declared, "frame.delta.001");
  assert.strictEqual(summary.views.lazy, "lazy");
  assert.strictEqual(summary.views.greedy, "greedy");
  assert.strictEqual(summary.views.static, "static");
  assert.strictEqual(summary.views.animated, "animated");
  assert.strictEqual(summary.reconciliation_period, 5040);
  assert.notStrictEqual(summary.identity_receipt, 0);

  console.log("  OK the same declared object survives lazy, greedy, static, and animated views\n");
}

function testTwoCubeDifferentialWitness() {
  console.log("Testing two-cube differential frame witness");

  const chart = geometricReconciliation.defaultTwoCubeDifferential();
  const repeat = geometricReconciliation.defaultTwoCubeDifferential();

  assert.deepStrictEqual(chart, repeat);
  assert.strictEqual(chart.origin.x, 0);
  assert.strictEqual(chart.origin.y, 0);
  assert.strictEqual(chart.origin.z, 0);
  assert.strictEqual(chart.difference_count, 6);
  assert.strictEqual(chart.difference_classes.length, 6);
  assert.strictEqual(chart.rolling_sweep, 60);
  assert.strictEqual(chart.public_frame, 240);
  assert.strictEqual(chart.master_reconciliation, 5040);
  assert.ok(chart.difference_labels.includes("1=√1"));
  assert.ok(chart.difference_labels.includes("2=√4"));
  assert.ok(chart.witness > 0);

  console.log("  OK the cube differential SVG normalizes as a six-ray frame-difference chart\n");
}

console.log("Testing Phase 63 - OMI Geometric Reconciliation Layer");
console.log("======================================================\n");

testViewDoctrine();
testFractalResolution();
testDeclaredObjectConsistency();
testTwoCubeDifferentialWitness();

console.log("\n======================================================");
console.log("ALL PHASE 63 GEOMETRIC RECONCILIATION TESTS PASSED");
