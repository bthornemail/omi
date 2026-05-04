const assert = require("assert");
const fs = require("fs");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const basis = require("../workbench/src/polyform_basis.js");
const polyform25d = require("../workbench/src/polyform_25d.js");
const polyform3d = require("../workbench/src/polyform_3d.js");
const aframeBackend = require("../workbench/src/aframe_backend.js");
const gltfExporter = require("../workbench/src/gltf_exporter.js");
const objExporter = require("../workbench/src/obj_mtl_exporter.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function testPolyformDimensions() {
  console.log("Testing polyform basis registry");

  const registry = basis.getRegistry();
  assert.ok(registry["2d"].some((entry) => entry.id === "polyomino"));
  assert.ok(registry["2.5d"].some((entry) => entry.id === "extruded-panel"));
  assert.ok(registry["3d"].some((entry) => entry.id === "polycube"));

  console.log("  OK 2D, 2.5D, and 3D basis families are pinned\n");
}

function testExportsPreservePointers() {
  console.log("Testing A-Frame, glTF, and OBJ/MTL exports");

  const source = read("models/trailer/wike-ebike-cargo-trailer.alist");
  const document = parser.parseDocument(source);
  const solids25d = polyform25d.build(document);
  const solids3d = polyform3d.build(document);
  const aframe = aframeBackend.buildScene(document, solids3d, "3d");
  const gltf = gltfExporter.build(document, solids3d, "3d");
  const obj = objExporter.build(document, solids3d, "3d");
  const receipt = JSON.parse(obj.receipt);

  assert.strictEqual(solids25d.length, 2);
  assert.strictEqual(solids3d.length, 3);
  assert.ok(aframe.includes("data-omi-path=\"model.trailer.wike-ebike-cargo/motion/wheel.left\""));
  assert.strictEqual(gltf.extras.omi_root, "model.trailer.wike-ebike-cargo");
  assert.strictEqual(gltf.nodes[1].extras.omi_path, "model.trailer.wike-ebike-cargo/motion/wheel.left");
  assert.ok(obj.obj.includes("o model.trailer.wike-ebike-cargo__motion__wheel.left"));
  assert.strictEqual(receipt.objects["model.trailer.wike-ebike-cargo__motion__wheel.left"], "model.trailer.wike-ebike-cargo/motion/wheel.left");

  console.log("  OK export backends preserve OMI path metadata\n");
}

console.log("Testing Phase 47 - Workbench Export Backends");
console.log("============================================\n");

testPolyformDimensions();
testExportsPreservePointers();

console.log("\n============================================");
console.log("ALL PHASE 47 EXPORT TESTS PASSED");
