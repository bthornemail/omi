const assert = require("assert");
const fs = require("fs");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const polyformCoordinate = require("../workbench/src/polyform_coordinate.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testCanonicalLookupCoordinates() {
  console.log("Testing workbench canonical path lookup -> polyform coordinates");

  const trailer = parser.parseDocument(read("models/trailer/wike-ebike-cargo-trailer.alist"));
  const world = parser.parseDocument(read("models/world/cargo-yard-demo.alist"));

  const wheel = polyformCoordinate.fromPath(trailer, "model.trailer.wike-ebike-cargo/motion/wheel.left");
  const wheelAgain = polyformCoordinate.fromPath(trailer, "model.trailer.wike-ebike-cargo/motion/wheel.left");
  const panel = polyformCoordinate.fromPath(trailer, "model.trailer.wike-ebike-cargo/panels/panel.floor");
  const interaction = polyformCoordinate.fromPath(world, "world.cargo-yard-demo/interactions/hitch-link.001");
  const primitive = polyformCoordinate.fromPath(trailer, "model.trailer.wike-ebike-cargo/motion/wheel.left/primitive");

  assert.ok(wheel);
  assert.ok(panel);
  assert.ok(interaction);
  assert.ok(primitive);
  assert.strictEqual(wheel.x, wheelAgain.x);
  assert.strictEqual(wheel.y, wheelAgain.y);
  assert.strictEqual(wheel.z, wheelAgain.z);
  assert.strictEqual(wheel.w, wheelAgain.w);
  assert.strictEqual(wheel.receipt_hash, wheelAgain.receipt_hash);
  assert.strictEqual(wheel.fs, "model.trailer.wike-ebike-cargo");
  assert.strictEqual(wheel.gs, "motion");
  assert.strictEqual(wheel.rs, "wheel.left");
  assert.strictEqual(wheel.w, 0);
  assert.notStrictEqual(primitive.w, 0);
  assert.strictEqual(interaction.gs, "interactions");
  assert.strictEqual(interaction.sign, "relation-closure");
  assert.notStrictEqual(panel.receipt_hash, wheel.receipt_hash);
  assert.strictEqual(polyformCoordinate.fromPath(trailer, "unknown/path"), null);

  console.log("  OK canonical workbench paths construct stable coordinate blocks\n");
}

function testTimingConsAndOverlays() {
  console.log("Testing timing law, cons geometry, and overlay preservation");

  const trailer = parser.parseDocument(read("models/trailer/wike-ebike-cargo-trailer.alist"));
  const wheel = polyformCoordinate.fromPath(trailer, "model.trailer.wike-ebike-cargo/motion/wheel.left");
  const overlay = polyformCoordinate.applyOverlay(wheel, {
    color: "red",
    mesh: "mesh.wheel",
    texture: "texture.black-rubber-wheel",
    shader: "highlight",
    typecast: "inspection"
  });
  const geometry = polyformCoordinate.consGeometry(3, 4);

  assert.strictEqual(polyformCoordinate.validateTiming(polyformCoordinate.TIMING), true);
  assert.strictEqual(polyformCoordinate.validateTiming(Object.assign({}, polyformCoordinate.TIMING, { operator_16: 15 })), false);
  assert.ok(geometry);
  assert.strictEqual(geometry.cons, 5);
  assert.strictEqual(geometry.tan_theta, 4 / 3);
  assert.strictEqual(geometry.cos_theta, 3 / 5);
  assert.strictEqual(geometry.sin_theta, 4 / 5);
  assert.strictEqual(overlay.receipt_hash, wheel.receipt_hash);
  assert.strictEqual(overlay.x, wheel.x);
  assert.strictEqual(overlay.y, wheel.y);
  assert.strictEqual(overlay.z, wheel.z);
  assert.strictEqual(overlay.w, wheel.w);

  console.log("  OK timing constants, cons geometry, and overlays stay non-causal\n");
}

function testSexagesimalClosures() {
  console.log("Testing sexagesimal closure witnesses");

  const trailer = parser.parseDocument(read("models/trailer/wike-ebike-cargo-trailer.alist"));
  const world = parser.parseDocument(read("models/world/cargo-yard-demo.alist"));
  const wheel = polyformCoordinate.fromPath(trailer, "model.trailer.wike-ebike-cargo/motion/wheel.left");
  const panel = polyformCoordinate.fromPath(trailer, "model.trailer.wike-ebike-cargo/panels/panel.floor");
  const interaction = polyformCoordinate.fromPath(world, "world.cargo-yard-demo/interactions/hitch-link.001");
  const closure = polyformCoordinate.closureFromBlocks(wheel, panel);
  const closureAgain = polyformCoordinate.closureFromBlocks(wheel, panel);
  const reversed = polyformCoordinate.reverseClosure(closure);

  assert.ok(closure);
  assert.ok(polyformCoordinate.validateClosure(closure));
  assert.ok(polyformCoordinate.validateClosure(reversed));
  assert.strictEqual(closure.receipt_hash, closureAgain.receipt_hash);
  assert.strictEqual(closure.sexagesimal_readout, String(closure.orientation4) + ":" + String(closure.sexagesimal_slot));
  assert.ok(closure.orientation4 >= 0 && closure.orientation4 <= 3);
  assert.ok(closure.public_frame240 >= 0 && closure.public_frame240 < polyformCoordinate.TIMING.public_240);
  assert.strictEqual(reversed.distance_class, closure.distance_class);
  assert.strictEqual(reversed.orientation4, (closure.orientation4 + 2) % 4);
  assert.notStrictEqual(reversed.receipt_hash, closure.receipt_hash);
  assert.ok(polyformCoordinate.closureFromBlocks(null, panel) === null);
  assert.ok(polyformCoordinate.closureFromBlocks(interaction, wheel));

  console.log("  OK canonical blocks derive stable sexagesimal closure witnesses\n");
}

console.log("Testing Phase 54 - Workbench Polyform Coordinate Law");
console.log("====================================================\n");

testCanonicalLookupCoordinates();
testTimingConsAndOverlays();
testSexagesimalClosures();

console.log("\n====================================================");
console.log("ALL PHASE 54 WORKBENCH POLYFORM COORDINATE TESTS PASSED");
