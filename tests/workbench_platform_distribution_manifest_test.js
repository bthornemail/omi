const assert = require("assert");
const fs = require("fs");
const path = require("path");

const omilispDeclaration = require("../workbench/src/omilisp_declaration.js");
const platformDistributionManifest = require("../workbench/src/platform_distribution_manifest.js");
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

function recordId(record) {
  return record && record.values ? record.values[0] : record.sid || record.name || record.id;
}

function testManifestDeclarationParses() {
  console.log("Testing Janet / Guix / WebView platform distribution declaration");

  const source = read("declarations/janet-guix-webview-platform-distribution.omilisp");
  const parsedA = omilispDeclaration.parseDeclaration(source);
  const parsedB = omilispDeclaration.parseDeclaration(source);
  const steps = asArray(parsedA.declaration["platform-ladder"].step);
  const components = asArray(parsedA.declaration.components.component);
  const lanes = asArray(parsedA.declaration.lanes.lane);

  assert.deepStrictEqual(parsedA, parsedB);
  assert.strictEqual(parsedA.declaration.identity.sid, "janet-guix-webview-platform-distribution");
  assert.strictEqual(parsedA.declaration.identity.kind, "platform.distribution-manifest");
  assert.strictEqual(parsedA.declaration.rule["janet-script-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["guix-package-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["browser-state-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["dom-cssom-appearance-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["transport-packet-is-authority"], false);
  assert.strictEqual(parsedA.declaration.rule["declared-kernel-and-receipts-are-authority"], true);
  assert.deepStrictEqual(steps.map(recordId), [
    "raw-binary-boot-kernel",
    "guix-distribution-closure",
    "janet-declaration-host",
    "omi-lisp-compiler",
    "semantic-web-bridge",
    "dom-cssom-projection-window",
    "modem-multiplexer-transport"
  ]);
  assert.deepStrictEqual(components.map(recordId), [
    "janet",
    "guix",
    "boot-kernel",
    "omi-lisp-compiler",
    "atom-browser",
    "webview",
    "semantic-web-bridge"
  ]);
  assert.deepStrictEqual(lanes.map(recordId), [
    "declaration",
    "receipt",
    "semantic",
    "ui",
    "transport"
  ]);

  console.log("  OK declaration parses with platform ladder, components, and lanes\n");
}

function testExecutableManifestShape() {
  console.log("Testing executable platform distribution manifest");

  const manifest = platformDistributionManifest.createPlatformDistributionManifest({
    manifest_id: "omi.platform.test",
    window: {
      title: "OMI Browser",
      width: 1440,
      height: 900,
      entry: "workbench/omi.html",
      backend: "webview"
    }
  });
  const summary = platformDistributionManifest.summarizeManifest(manifest);
  const matrix = platformDistributionManifest.projectChannelMatrix(manifest);

  assert.strictEqual(manifest.kind, "platform.distribution-manifest");
  assert.strictEqual(manifest.authority, false);
  assert.strictEqual(manifest.kernel_authority, "declared-kernel-and-receipts");
  assert.strictEqual(manifest.window.backend, "webview");
  assert.strictEqual(manifest.boot.host_language, "janet");
  assert.strictEqual(manifest.boot.package_manager, "guix");
  assert.ok(manifest.boot.semantic_bridge.includes("wordnet"));
  assert.ok(manifest.boot.semantic_bridge.includes("prolog"));
  assert.ok(manifest.boot.ui_projection.includes("dom"));
  assert.ok(manifest.boot.ui_projection.includes("cssom"));
  assert.strictEqual(manifest.components.find((component) => component.id === "boot-kernel").authority, true);
  assert.strictEqual(manifest.components.find((component) => component.id === "webview").authority, false);
  assert.strictEqual(manifest.lanes.length, 5);
  assert.strictEqual(new Set(manifest.lanes.map((lane) => lane.receipt)).size, manifest.lanes.length);
  assert.strictEqual(summary.component_count, 7);
  assert.strictEqual(summary.lane_count, 5);
  assert.strictEqual(summary.browser_shell, "webview");
  assert.strictEqual(matrix.channels.length, 5);
  assert.strictEqual(matrix.multiplexer.authority, false);
  assert.strictEqual(matrix.modem.authority, false);

  console.log("  OK executable manifest models Janet, Guix, WebView, and multiplexed lanes\n");
}

function testTriangulationAndSelfMap() {
  console.log("Testing S-P-O-M triangulation and OMI self-map references");

  const source = read("declarations/janet-guix-webview-platform-distribution.omilisp");
  const triangulation = spomAdapter.triangulateSource(source);
  const selfMap = omilispDeclaration.parseDeclaration(read("declarations/omi-system.omilisp"));
  const manifests = asArray(selfMap.declaration["platform-distribution-manifests"].manifest);
  const surfaces = asArray(selfMap.declaration.surfaces.paths);
  const surfacePaths = surfaces.map((surface) => surface.path);

  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "janet-guix-webview-platform-distribution" &&
    triplet.predicate === "section" &&
    triplet.object === "platform-ladder"
  )));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "webview" &&
    triplet.predicate === "role" &&
    triplet.object === "html-css-projection-window"
  )));
  assert.ok(triangulation.triplets.some((triplet) => (
    triplet.subject === "declaration" &&
    triplet.predicate === "kind" &&
    triplet.object === "compiler-lane"
  )));
  assert.ok(asArray(manifests).map(recordId).includes("janet-guix-webview-platform-distribution"));
  assert.ok(surfacePaths.includes("docs/PHASE-116-JANET-GUIX-WEBVIEW-PLATFORM-DISTRIBUTION.md"));
  assert.ok(surfacePaths.includes("declarations/janet-guix-webview-platform-distribution.omilisp"));
  assert.ok(surfacePaths.includes("workbench/src/platform_distribution_manifest.js"));

  console.log("  OK triangulation and self-map include the platform distribution phase by link only\n");
}

console.log("Testing Phase 116 - Janet / Guix / WebView Platform Distribution Manifest");
console.log("=========================================================================\n");

testManifestDeclarationParses();
testExecutableManifestShape();
testTriangulationAndSelfMap();

console.log("\n=========================================================================");
console.log("ALL PHASE 116 PLATFORM DISTRIBUTION TESTS PASSED");
