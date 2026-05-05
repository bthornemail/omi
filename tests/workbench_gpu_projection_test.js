const assert = require("assert");
const fs = require("fs");
const path = require("path");

const parser = require("../workbench/src/model_parser.js");
const polyformCoordinate = require("../workbench/src/polyform_coordinate.js");
const scopeMultigraph = require("../workbench/src/scope_multigraph.js");
const compositionScene = require("../workbench/src/composition_scene.js");
const composerShell = require("../workbench/src/composer_shell.js");
const gpuCommandStream = require("../workbench/src/gpu_command_stream.js");
const webglBackend = require("../workbench/src/webgl_projection_backend.js");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function buildTrailerBlocks() {
  const document = parser.parseDocument(read("models/trailer/wike-ebike-cargo-trailer.alist"));
  return {
    document,
    blocks: [
      polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/form/body"),
      polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/wheel.left"),
      polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/wheel.right"),
      polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/tow-arm")
    ]
  };
}

function buildClosureAndEdge(document) {
  const from = polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/motion/wheel.left");
  const to = polyformCoordinate.fromPath(document, "model.trailer.wike-ebike-cargo/panels/panel.floor");
  const closure = polyformCoordinate.closureFromBlocks(from, to);
  const edge = scopeMultigraph.canonicalEdge(from, to, closure, scopeMultigraph.VISIBILITY.public, scopeMultigraph.LOCATION.global);
  return { from, to, closure, edge };
}

function test2d25d3dModes() {
  console.log("Testing deterministic polyform GPU command modes");

  const trailer = buildTrailerBlocks();
  const scene = compositionScene.createScene("gpu.scene");
  const twoD = gpuCommandStream.project({
    mode: "polyform-2d",
    scene,
    blocks: trailer.blocks
  });
  const twoAndHalf = gpuCommandStream.project({
    mode: "polyform-2_5d",
    scene,
    blocks: trailer.blocks
  });
  const threeD = webglBackend.project({
    mode: "polyform-3d",
    scene,
    blocks: trailer.blocks
  });

  assert.ok(twoD);
  assert.ok(twoAndHalf);
  assert.ok(threeD);
  assert.notDeepStrictEqual(twoD.commands, twoAndHalf.commands);
  assert.notDeepStrictEqual(twoAndHalf.commands, threeD.commands);
  assert.strictEqual(twoD.command_receipt, gpuCommandStream.project({ mode: "polyform-2d", scene, blocks: trailer.blocks }).command_receipt);
  assert.ok(twoD.commands.some((command) => command.kind === "ATTACH_OMI_METADATA"));
  assert.ok(twoD.commands.every((command) => !command.metadata || command.metadata.omi_path));
  assert.ok(twoAndHalf.commands.some((command) => command.kind === "DRAW_POLYFORM"));
  assert.ok(threeD.commands.some((command) => command.kind === "DRAW_POLYFORM"));
  assert.strictEqual(gpuCommandStream.project({ mode: "unknown", scene, blocks: trailer.blocks }), null);

  console.log("  OK 2D, 2.5D, and 3D command streams are deterministic and distinct\n");
}

function testScopeAndBarcodeModes() {
  console.log("Testing scope graph and barcode template GPU projections");

  const trailer = buildTrailerBlocks();
  const trailerDoc = trailer.document;
  const relation = buildClosureAndEdge(trailerDoc);
  const scene = composerShell.createComposer(read("models/world/cargo-yard-demo.alist")).scene;
  const template = {
    omi_path: "world.cargo-yard-demo/objects/trailer.001",
    carrier: "Aztec",
    scope: "public.global",
    witness: "fixture-witness-001",
    coordinate_receipt: relation.from.receipt_hash,
    closure_receipt: relation.closure.receipt_hash
  };
  const scopeStream = gpuCommandStream.project({
    mode: "scope-graph-3d",
    scene,
    edges: [relation.edge]
  });
  const barcodeStream = gpuCommandStream.project({
    mode: "barcode-template-scene",
    scene,
    templates: [template]
  });
  const barcodeStreamAgain = gpuCommandStream.project({
    mode: "barcode-template-scene",
    scene,
    templates: [template]
  });

  assert.ok(scopeStream);
  assert.ok(barcodeStream);
  assert.strictEqual(barcodeStream.command_receipt, barcodeStreamAgain.command_receipt);
  assert.ok(scopeStream.commands.some((command) => command.kind === "DRAW_SCOPE_EDGE"));
  assert.ok(scopeStream.commands.some((command) => command.metadata && command.metadata.scope === "public.global"));
  assert.ok(scopeStream.commands.some((command) => command.metadata && command.metadata.closure_receipt === relation.closure.receipt_hash));
  assert.ok(barcodeStream.commands.some((command) => command.kind === "ATTACH_OMI_METADATA"));
  assert.ok(barcodeStream.commands.some((command) => command.metadata && command.metadata.carrier === "Aztec"));
  assert.ok(barcodeStream.commands.some((command) => command.metadata && command.metadata.scope === "public.global"));
  assert.strictEqual(gpuCommandStream.project({ mode: "barcode-template-scene", scene, templates: [] }).commands.length >= 2, true);

  console.log("  OK scope and barcode projections preserve OMI metadata deterministically\n");
}

console.log("Testing Phase 57 - Polyform GPU Projection Court");
console.log("=================================================\n");

test2d25d3dModes();
testScopeAndBarcodeModes();

console.log("\n=================================================");
console.log("ALL PHASE 57 GPU PROJECTION TESTS PASSED");
