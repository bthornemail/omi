const assert = require("assert");
const fs = require("fs");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const polyformCoordinate = require("../workbench/src/polyform_coordinate.js");
const scopeMultigraph = require("../workbench/src/scope_multigraph.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function fixtureBlock(x, y, z, w, name) {
  return {
    omi_path: name,
    fs: "fixture",
    gs: "multigraph",
    rs: name,
    us: "",
    x: x,
    y: y,
    z: z,
    w: w,
    basis: "fixture",
    degree: "closure",
    sign: "structural",
    depth: "inspect",
    timing: Object.assign({}, polyformCoordinate.TIMING),
    receipt_hash: x ^ (y << 1) ^ (z << 2) ^ (w << 3) ^ 0x54c00001
  };
}

function testScopeRoundtrip() {
  console.log("Testing scope visibility/location roundtrip");

  const expected = [
    "public.global",
    "public.local",
    "public.remote",
    "private.global",
    "private.local",
    "private.remote",
    "protected.global",
    "protected.local",
    "protected.remote"
  ];
  const seen = [];
  Object.keys(scopeMultigraph.VISIBILITY).forEach(function (visibilityName) {
    Object.keys(scopeMultigraph.LOCATION).forEach(function (locationName) {
      const scopeClass = scopeMultigraph.encodeScope(
        scopeMultigraph.VISIBILITY[visibilityName],
        scopeMultigraph.LOCATION[locationName]
      );
      const decoded = scopeMultigraph.decodeScope(scopeClass);
      seen.push(scopeClass);
      assert.ok(decoded);
      assert.strictEqual(decoded.visibility, scopeMultigraph.VISIBILITY[visibilityName]);
      assert.strictEqual(decoded.location, scopeMultigraph.LOCATION[locationName]);
    });
  });
  assert.deepStrictEqual(seen.sort(), expected.sort());
  assert.strictEqual(scopeMultigraph.decodeScope("unknown.scope"), null);

  console.log("  OK all nine scope classes roundtrip deterministically\n");
}

function testCanonicalAndBarcodeEdges() {
  console.log("Testing canonical and barcode edges over shared closure receipts");

  const trailer = parser.parseDocument(read("models/trailer/wike-ebike-cargo-trailer.alist"));
  const world = parser.parseDocument(read("models/world/cargo-yard-demo.alist"));
  const wheel = polyformCoordinate.fromPath(trailer, "model.trailer.wike-ebike-cargo/motion/wheel.left");
  const interaction = polyformCoordinate.fromPath(world, "world.cargo-yard-demo/interactions/hitch-link.001");
  const closure = polyformCoordinate.closureFromBlocks(wheel, interaction);
  const canonical = scopeMultigraph.canonicalEdge(
    wheel,
    interaction,
    closure,
    scopeMultigraph.VISIBILITY.public,
    scopeMultigraph.LOCATION.global
  );
  const barcode = scopeMultigraph.barcodeEdge(
    wheel,
    interaction,
    closure,
    scopeMultigraph.VISIBILITY.public,
    scopeMultigraph.LOCATION.remote,
    closure.orientation4
  );

  assert.ok(canonical);
  assert.ok(barcode);
  assert.ok(scopeMultigraph.validateEdge(canonical));
  assert.ok(scopeMultigraph.validateEdge(barcode));
  assert.strictEqual(canonical.carrier, scopeMultigraph.CARRIER.none);
  assert.strictEqual(barcode.closure_receipt, canonical.closure_receipt);
  assert.notStrictEqual(barcode.receipt, canonical.receipt);
  assert.strictEqual(barcode.carrier, closure.orientation4);
  assert.strictEqual(
    scopeMultigraph.barcodeEdge(
      wheel,
      interaction,
      closure,
      scopeMultigraph.VISIBILITY.public,
      scopeMultigraph.LOCATION.remote,
      (closure.orientation4 + 1) % 4
    ),
    null
  );

  console.log("  OK canonical structure and barcode projection stay distinct\n");
}

function testCarrierOrientations() {
  console.log("Testing Code16K/Aztec/MaxiCode/BeeCode carrier alignment");

  [
    { carrier: scopeMultigraph.CARRIER.Code16K, to: fixtureBlock(2, 0, 0, 0, "fixture.to.x") },
    { carrier: scopeMultigraph.CARRIER.Aztec, to: fixtureBlock(0, 2, 0, 0, "fixture.to.y") },
    { carrier: scopeMultigraph.CARRIER.MaxiCode, to: fixtureBlock(0, 0, 2, 0, "fixture.to.z") },
    { carrier: scopeMultigraph.CARRIER.BeeCode, to: fixtureBlock(0, 0, 0, 2, "fixture.to.w") }
  ].forEach(function (fixture) {
    const from = fixtureBlock(0, 0, 0, 0, "fixture.from");
    const closure = polyformCoordinate.closureFromBlocks(from, fixture.to);
    const edge = scopeMultigraph.barcodeEdge(
      from,
      fixture.to,
      closure,
      scopeMultigraph.VISIBILITY.protected,
      scopeMultigraph.LOCATION.remote,
      fixture.carrier
    );

    assert.ok(closure);
    assert.strictEqual(closure.orientation4, fixture.carrier);
    assert.ok(edge);
    assert.ok(scopeMultigraph.validateEdge(edge));
  });

  console.log("  OK all four barcode orientations roundtrip deterministically\n");
}

console.log("Testing Phase 54C - Workbench Scope Multigraph Law");
console.log("===================================================\n");

testScopeRoundtrip();
testCanonicalAndBarcodeEdges();
testCarrierOrientations();

console.log("\n===================================================");
console.log("ALL PHASE 54C WORKBENCH SCOPE MULTIGRAPH TESTS PASSED");
