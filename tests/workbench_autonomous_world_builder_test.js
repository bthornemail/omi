const assert = require("assert");
const fs = require("fs");
const path = require("path");

const autonomousWorldBuilder = require("../workbench/src/autonomous_world_builder.js");
const modelParser = require("../workbench/src/model_parser.js");
const composerShell = require("../workbench/src/composer_shell.js");
const omilispDeclaration = require("../workbench/src/omilisp_declaration.js");
const spomAdapter = require("../workbench/src/spom_adapter.js");

const repoRoot = path.join(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function recordId(record) {
  return record && record.values ? record.values[0] : record.sid || record.name;
}

function testDeterministicBuild() {
  console.log("Testing deterministic autonomous world build");

  const first = autonomousWorldBuilder.buildAutonomousWorld();
  const second = autonomousWorldBuilder.buildAutonomousWorld();

  assert.deepStrictEqual(first.report, second.report);
  assert.strictEqual(first.report.seed, "world.autonomous-fixture");
  assert.strictEqual(first.report.world.id, "world.autonomous-fixture");
  assert.strictEqual(first.report.world.kind, "world");
  assert.deepStrictEqual(first.report.world.counts, { fs: 1, gs: 3, rs: 7, us: 22 });
  assert.strictEqual(first.report.world.graph_node_count, 3);
  assert.strictEqual(first.report.world.graph_edge_count, 3);
  assert.strictEqual(first.report.plan.proposal_count, 6);
  assert.strictEqual(first.plan.proposals.every((proposal) => proposal.authority === false), true);
  assert.strictEqual(first.report.admission.authority, "declaration+receipts");
  assert.strictEqual(first.report.authority.proposals_authority, false);
  assert.strictEqual(first.report.authority.declarations_and_receipts_authority, true);

  console.log("  OK deterministic builder emits stable fixture world and non-authoritative proposals\n");
}

function testAdmissionAndComposer() {
  console.log("Testing admitted world parser and composer path");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const reparsed = modelParser.parseDocument(built.admission.source);
  const composer = composerShell.createComposer(built.admission.source, {
    sceneId: "world.autonomous-fixture"
  });

  assert.strictEqual(reparsed.id, "world.autonomous-fixture");
  assert.strictEqual(reparsed.kind, "world");
  assert.strictEqual(reparsed.graph.nodes.length, 3);
  assert.strictEqual(reparsed.graph.edges.length, 3);
  assert.strictEqual(composer.document.id, "world.autonomous-fixture");
  assert.strictEqual(built.report.composer.committed, true);
  assert.strictEqual(built.composer.package.manifest.scene_root_identity.omi_path, "world.autonomous-fixture");
  assert.strictEqual(
    built.composer.imported_package.manifest.manifest_receipt,
    built.composer.package.manifest.manifest_receipt
  );

  console.log("  OK admitted snapshot parses as world and composer/package replay validates\n");
}

function testReceiptSurfaces() {
  console.log("Testing autonomous world raw-binary and closure receipts");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const changedSeed = autonomousWorldBuilder.buildAutonomousWorld({ seed: "world.autonomous-fixture.changed" });

  assert.strictEqual(built.raw_binary.identity_receipt, built.report.raw_binary.identity_receipt);
  assert.ok(built.raw_binary.chunk_count > 0);
  assert.strictEqual(built.closure.character.identity_receipt, built.closure.binary64.identity_receipt);
  assert.notStrictEqual(built.closure.character.projection_receipt, built.closure.binary64.projection_receipt);
  assert.notStrictEqual(built.closure.character.identity_receipt, built.closure.changed.identity_receipt);
  assert.notStrictEqual(built.report.admission.identity_receipt, changedSeed.report.admission.identity_receipt);
  assert.notStrictEqual(built.report.raw_binary.identity_receipt, changedSeed.report.raw_binary.identity_receipt);

  console.log("  OK raw-binary and closure witnesses preserve identity discipline\n");
}

function testTriangulationAndDoctrine() {
  console.log("Testing autonomous world S-P-O-M and declaration doctrine");

  const built = autonomousWorldBuilder.buildAutonomousWorld();
  const sourceTriangulation = built.triangulation;
  const doctrineSource = read("declarations/autonomous-world-builder-model.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(doctrineSource);
  const parsedB = omilispDeclaration.parseDeclaration(doctrineSource);
  const doctrineTriangulation = spomAdapter.triangulateSource(doctrineSource);
  const guards = new Map(asArray(parsedA.declaration.guardrails.guard).map((guard) => [recordId(guard), guard.statement]));

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "autonomous-world-builder-model");
  assert.strictEqual(parsedA.declaration.identity.kind, "world.autonomous-builder-model");
  assert.strictEqual(parsedA.declaration.rule["builder-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["proposal-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["admitted-declaration-and-receipts-are-authority"], true);
  assert.ok(sourceTriangulation.triplets.some((triplet) => (
    triplet.subject === "trailer.001" &&
    triplet.predicate === "model" &&
    triplet.object === "model.trailer.wike-ebike-cargo"
  )));
  assert.ok(sourceTriangulation.triplets.some((triplet) => (
    triplet.subject === "hitch-link.001" &&
    triplet.predicate === "relation" &&
    triplet.object === "coupled-traction"
  )));
  assert.ok(doctrineTriangulation.triplets.some((triplet) => (
    triplet.subject === "autonomous-world-builder-model" &&
    triplet.predicate === "section" &&
    triplet.object === "builder-workflow"
  )));
  assert.ok(doctrineTriangulation.triplets.some((triplet) => (
    triplet.subject === "receipt-admission" &&
    triplet.predicate === "role" &&
    triplet.object === "authority-boundary"
  )));
  assert.ok(String(guards.get("proposal-admission-split")).includes("non-authoritative"));

  console.log("  OK S-P-O-M derives world/build/admission relations without changing authority\n");
}

function testOmiSystemReferencesPhase99() {
  console.log("Testing OMI self-map references Phase 99 by link only");

  const parsed = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const builders = asArray(parsed.declaration["world-builder-models"].model);
  const surfaces = asArray(parsed.declaration.surfaces.paths);
  const declaredPaths = surfaces.map((surface) => surface.path);

  assert.ok(builders.map(recordId).includes("autonomous-world-builder-model"));
  assert.ok(declaredPaths.includes("docs/PHASE-99-AUTONOMOUS-WORLD-BUILDER-MODEL.md"));
  assert.ok(declaredPaths.includes("declarations/autonomous-world-builder-model.omilisp"));
  assert.ok(declaredPaths.includes("workbench/src/autonomous_world_builder.js"));
  assert.ok(!JSON.stringify(parsed.declaration["world-builder-models"]).includes("trailer.001"));

  console.log("  OK self-map links Phase 99 without copying fixture world structure\n");
}

console.log("Testing Phase 99 - Autonomous World Builder Model");
console.log("=================================================\n");

testDeterministicBuild();
testAdmissionAndComposer();
testReceiptSurfaces();
testTriangulationAndDoctrine();
testOmiSystemReferencesPhase99();

console.log("\n=================================================");
console.log("ALL PHASE 99 AUTONOMOUS WORLD BUILDER TESTS PASSED");
