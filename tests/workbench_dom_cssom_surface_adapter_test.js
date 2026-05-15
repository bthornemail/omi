const assert = require("assert");

const adapter = require("../workbench/src/dom_cssom_surface_adapter.js");

function fixture(overrides) {
  return Object.assign({
    path: "omi://demo/node.001",
    car: "0x20",
    cdr: "0x00000000000000000000000000000080",
    meta: "0x0001",
    port: "0xffff",
    color: "#00ffff"
  }, overrides || {});
}

function testSurfaceProjection() {
  console.log("Testing DOM/CSSOM OMI surface projection");

  const omi = fixture();
  const decoded = adapter.decodeOmiSurface(omi);
  const attrs = adapter.dataAttributes(omi);
  const css = adapter.cssProjection(omi);
  const node = adapter.buildSurfaceNode(omi, { id: "surface-demo" });

  assert.strictEqual(decoded.path, "omi://demo/node.001");
  assert.strictEqual(decoded.car, "0x0000000000000020");
  assert.strictEqual(decoded.cdr, "0x00000000000000000000000000000080");
  assert.strictEqual(decoded.meta, "0x0000000000000001");
  assert.strictEqual(decoded.port, "0xffff");
  assert.strictEqual(decoded.color, "#00ffff");

  assert.strictEqual(attrs["data-omi-car"], "0x0000000000000020");
  assert.strictEqual(attrs["data-omi-cdr"], "0x00000000000000000000000000000080");
  assert.strictEqual(attrs["data-omi-authority"], "projection-only");

  assert.strictEqual(css["--omi-fs"], "block-start");
  assert.strictEqual(css["--omi-gs"], "inline-end");
  assert.strictEqual(css["--omi-rs"], "block-end");
  assert.strictEqual(css["--omi-us"], "inline-start");
  assert.strictEqual(css["--omi-color"], "#00ffff");

  assert.strictEqual(node.id, "surface-demo");
  assert.strictEqual(node.authority, "projection-only");
  assert.ok(node.surface_receipt.startsWith("fnv1a32:"));

  console.log("  OK DOM data attributes and CSSOM variables are projection-only\n");
}

function testCanvasAFrameAndDidProjection() {
  console.log("Testing Canvas, A-Frame, and DID projections");

  const omi = fixture();
  const canvasNode = adapter.buildCanvasNode(omi, {
    id: "canvas-demo",
    x: 12,
    y: 24
  });
  const entity = adapter.buildAFrameEntity(omi, {
    id: "entity-demo",
    position: "1 2 3"
  });
  const did = adapter.deriveDidDocument(omi);

  assert.strictEqual(canvasNode.id, "canvas-demo");
  assert.strictEqual(canvasNode.type, "text");
  assert.strictEqual(canvasNode.x, 12);
  assert.strictEqual(canvasNode.y, 24);
  assert.strictEqual(canvasNode.omi.ports.top, "FS");
  assert.strictEqual(canvasNode.omi.ports.right, "GS");
  assert.strictEqual(canvasNode.omi.ports.bottom, "RS");
  assert.strictEqual(canvasNode.omi.ports.left, "US");
  assert.ok(canvasNode.text.includes("authority: projection-only"));

  assert.ok(entity.includes("<a-entity "));
  assert.ok(entity.includes("id=\"entity-demo\""));
  assert.ok(entity.includes("position=\"1 2 3\""));
  assert.ok(entity.includes("data-omi-car=\"0x0000000000000020\""));
  assert.ok(entity.includes("material=\"color: #00ffff\""));

  assert.ok(did.id.startsWith("did:omi:"));
  assert.strictEqual(did.verificationMethod[0].type, "OmiMeta64");
  assert.ok(did.service[0].serviceEndpoint.includes("ip6:0000:0000:0000:0000:0000:0000:0000:0080"));
  assert.strictEqual(did.omi.authority, "projection-only");

  console.log("  OK Canvas, A-Frame, and DID views preserve OMI metadata\n");
}

function testSelectorsAndBundleReceipts() {
  console.log("Testing 2-of-5 selectors and deterministic bundle receipts");

  const omi = fixture();
  const selector = adapter.buildTwoOfFiveSelector("omi://demo/node.001");
  const transitions = adapter.buildFiveTermTransitionTable();
  const bundleA = adapter.buildSurfaceBundle(omi, { id: "bundle-demo" });
  const bundleB = adapter.buildSurfaceBundle(omi, { id: "bundle-demo" });
  const bundleC = adapter.buildSurfaceBundle(fixture({ port: "0xfffe" }), { id: "bundle-demo" });

  assert.strictEqual(selector.mode, "two-of-five-nonagram");
  assert.strictEqual(selector.active.boolean_metric.length, 2);
  assert.strictEqual(selector.active.linear_vector.length, 2);
  assert.strictEqual(selector.active.matrix_projective.length, 2);
  assert.strictEqual(selector.scales.length, 6);
  assert.ok(selector.receipt.startsWith("fnv1a32:"));

  assert.strictEqual(transitions.length, 10);
  assert.deepStrictEqual(transitions.slice(0, 5).map((row) => row.op), [
    "bind",
    "assign",
    "join",
    "compose",
    "target"
  ]);
  assert.ok(transitions.every((row) => row.receipt.startsWith("fnv1a32:")));

  assert.deepStrictEqual(bundleA, bundleB);
  assert.notStrictEqual(bundleA.bundle_receipt, bundleC.bundle_receipt);
  assert.strictEqual(bundleA.authority, "projection-only");
  assert.strictEqual(bundleA.selector.scales.length, 6);
  assert.strictEqual(bundleA.transitions.length, 10);

  console.log("  OK selectors, transitions, and bundle receipts are deterministic\n");
}

console.log("Testing DOM/CSSOM OMI Surface Adapter");
console.log("=====================================\n");

testSurfaceProjection();
testCanvasAFrameAndDidProjection();
testSelectorsAndBundleReceipts();

console.log("=====================================");
console.log("ALL DOM/CSSOM OMI SURFACE ADAPTER TESTS PASSED");
