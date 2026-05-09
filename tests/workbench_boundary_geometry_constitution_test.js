const assert = require("assert");
const fs = require("fs");
const path = require("path");

const omilispDeclaration = require("../workbench/src/omilisp_declaration.js");
const spomAdapter = require("../workbench/src/spom_adapter.js");

const repoRoot = path.join(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function testDeclarationAndProjections() {
  console.log("Testing boundary geometry constitution declaration");

  const source = read("declarations/boundary-geometry-constitution.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const lazy = omilispDeclaration.projectDeclaration(parsedA, "lazy");
  const greedy = omilispDeclaration.projectDeclaration(parsedA, "greedy");
  const staticView = omilispDeclaration.projectDeclaration(parsedA, "static");
  const animated = omilispDeclaration.projectDeclaration(parsedA, "animated");

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.root, "omi");
  assert.strictEqual(parsedA.declaration.identity.sid, "boundary-geometry-constitution");
  assert.strictEqual(parsedA.declaration.identity.kind, "constitutional.doctrine");
  assert.strictEqual(parsedA.declaration.address.addr, "boundary-geometry-constitution.self");
  assert.strictEqual(parsedA.identity_receipt, parsedB.identity_receipt);
  assert.strictEqual(lazy.identity_receipt, parsedA.identity_receipt);
  assert.strictEqual(greedy.identity_receipt, parsedA.identity_receipt);
  assert.strictEqual(staticView.identity_receipt, parsedA.identity_receipt);
  assert.strictEqual(animated.identity_receipt, parsedA.identity_receipt);
  assert.notStrictEqual(lazy.view_receipt, greedy.view_receipt);
  assert.notStrictEqual(greedy.view_receipt, staticView.view_receipt);
  assert.notStrictEqual(staticView.view_receipt, animated.view_receipt);
  assert.strictEqual(lazy.sealed_address, "boundary-geometry-constitution.self");
  assert.strictEqual(greedy.chart.kind, "constitutional.doctrine");
  assert.ok(greedy.chart.section_count >= 7);
  assert.ok(greedy.chart.projection_modes.includes("lazy"));
  assert.ok(staticView.declared_space.section_order.includes("constitution"));
  assert.ok(staticView.declared_space.section_order.includes("references"));
  assert.strictEqual(animated.timeline.frame_count, 5040);
  assert.strictEqual(animated.timeline.coordination, "sexagesimal rolling difference");

  console.log("  OK declaration parses deterministically and projects through the same receipts\n");
}

function testBoundaryTriplets() {
  console.log("Testing boundary geometry triplets");

  const source = read("declarations/boundary-geometry-constitution.omilisp");
  const declaration = omilispDeclaration.parseDeclaration(source);
  const triangulationA = spomAdapter.triangulateSource(source);
  const triangulationB = spomAdapter.triangulateSource(source);

  assert.strictEqual(triangulationA.identity_receipt, triangulationB.identity_receipt);
  assert.strictEqual(triangulationA.source_kind, "omilisp");
  assert.strictEqual(triangulationA.root, "boundary-geometry-constitution");
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "boundary-geometry-constitution" &&
    triplet.predicate === "section" &&
    triplet.object === "constitution"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "boundary-geometry-constitution" &&
    triplet.predicate === "section" &&
    triplet.object === "references"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "cons" &&
    triplet.predicate === "statement" &&
    String(triplet.object).includes("minimal oriented boundary")
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "closed_null" &&
    triplet.predicate === "statement" &&
    String(triplet.object).includes("closed admissible null")
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "differentiated_null" &&
    triplet.predicate === "statement" &&
    String(triplet.object).includes("explicitly differentiated null")
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "omicron_threshold" &&
    triplet.predicate === "statement" &&
    String(triplet.object).includes("0x20")
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "spom_boundary_frame" &&
    triplet.predicate === "subject" &&
    triplet.object === "boundary"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "spom_boundary_frame" &&
    triplet.predicate === "predicate" &&
    triplet.object === "null"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "spom_boundary_frame" &&
    triplet.predicate === "object" &&
    triplet.object === "projection"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "spom_boundary_frame" &&
    triplet.predicate === "modality" &&
    triplet.object === "orientation"
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "projection" &&
    triplet.predicate === "statement" &&
    String(triplet.object).includes("observable rendering")
  )));

  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "phase_90_chunk_index" &&
    triplet.predicate === "path" &&
    String(triplet.object).includes("raw-binary-chunk-receipt-index.omilisp")
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "constitutional_geometry" &&
    triplet.predicate === "path" &&
    String(triplet.object).includes("OMI-CONSTITUTIONAL-GEOMETRY.md")
  )));
  assert.ok(triangulationA.triplets.some((triplet) => (
    triplet.subject === "core_principle" &&
    triplet.predicate === "path" &&
    String(triplet.object).includes("CORE-PRINCIPLE.md")
  )));

  const spom = declaration.declaration.constitution || {};
  assert.ok(Object.keys(spom).length > 0);

  console.log("  OK S-P-O-M derives boundary, null, and projection relations\n");
}

function testReferencedSurfacesExist() {
  console.log("Testing OMI self-map references Phase 91");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  const required = [
    "docs/PHASE-91-BOUNDARY-GEOMETRY-CONSTITUTION.md",
    "declarations/boundary-geometry-constitution.omilisp",
    "docs/OMI-CONSTITUTIONAL-GEOMETRY.md",
    "docs/CORE-PRINCIPLE.md"
  ];

  required.forEach((relPath) => {
    assert.ok(declaredPaths.includes(relPath), `${relPath} must be declared`);
    assert.ok(fs.existsSync(path.join(repoRoot, relPath)), `${relPath} must exist`);
  });

  console.log("  OK self-map references Phase 91 by link only\n");
}

console.log("Testing Phase 91 - Boundary Geometry Constitution");
console.log("===============================================\n");

testDeclarationAndProjections();
testBoundaryTriplets();
testReferencedSurfacesExist();

console.log("\n===============================================");
console.log("ALL PHASE 91 BOUNDARY GEOMETRY CONSTITUTION TESTS PASSED");
