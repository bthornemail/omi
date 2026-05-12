const assert = require("assert");

const exporter = require("../workbench/src/org_omi_exporter.js");
const notebook = require("../workbench/src/org_omi_notebook.js");

const sample = [
  "#+TITLE: org-omi Canonical Syntax Surface",
  "#+OMI_ID: omi://platform/omnicron/org-omi/canonical-syntax",
  "#+OMI_SURFACE: org-omi",
  "#+OMI_AUTHORITY: decoded-declaration+deterministic-receipt",
  "#+OMI_TANGLE_ROOT: declarations/",
  "#+OMI_TRAMP_ROOT: /ssh:builder@node-a:/srv/omi/blackboard.org",
  "",
  "* Root Statement",
  ":PROPERTIES:",
  ":OMI_LAYER: declarative",
  ":END:",
  "",
  "#+begin_src omi :tangle declarations/org-omi-envelope.omi",
  "(omi",
  "  (identity",
  "    (sid canonical-syntax)",
  "    (title \"Canonical Syntax\"))",
  "  (scope",
  "    (fs org-omi)",
  "    (gs canonical-syntax)",
  "    (rs declaration)",
  "    (us receipt))",
  "  (projection",
  "    (osi application presentation session transport network data-link physical)",
  "    (authority non-causal)",
  "    (runtime org-omi-pinch.v1))",
  "  (receipt",
  "    (status pending)))",
  "#+end_src",
  "",
  "* Chronological Event",
  ":PROPERTIES:",
  ":OMI_LAYER: chronological",
  ":OMI_OPERATOR: diametric",
  ":END:",
  "",
  "#+begin_src omi :tangle declarations/chronological.omi",
  "(omi",
  "  (identity",
  "    (sid derived-boundary))",
  "  (chronological",
  "    ((subject . derived-boundary)",
  "     (predicate . admitted-at)",
  "     (stdout . barcode-boundary))))",
  "#+end_src"
].join("\n");

function testOrgOmiBundleExport() {
  console.log("Testing org-omi bundle export");

  const bundle = exporter.exportBundle(sample, {
    sourcePath: "org/org-omi-canonical-syntax-surface.org",
    includeSurfaceDigest: true,
    blobReceipt: "fnv1a32:deadbeef"
  });
  const manifest = JSON.parse(bundle.manifestJson);
  const canvas = JSON.parse(bundle.canvasJson);
  const markdown = notebook.parseMarkdownFrontMatter(bundle.markdown);

  assert.strictEqual(bundle.frontMatter.OMI_ID, "omi://platform/omnicron/org-omi/canonical-syntax");
  assert.strictEqual(manifest.declaration_receipt, bundle.declarationReceipt);
  assert.strictEqual(manifest.blob_receipt, "fnv1a32:deadbeef");
  assert.ok(manifest.surface_digest.length > 0);
  assert.strictEqual(markdown.frontMatter.omi_receipt, bundle.declarationReceipt);
  assert.strictEqual(canvas.nodes[0].omi.ports.top, "FS");
  assert.strictEqual(canvas.nodes[0].omi.ports.right, "GS");
  assert.strictEqual(canvas.nodes[0].omi.ports.bottom, "RS");
  assert.strictEqual(canvas.nodes[0].omi.ports.left, "US");
  assert.ok(bundle.declarationText.includes("(omi"));

  console.log("  OK Org to declaration/manifest/Markdown/Canvas is deterministic\n");
}

function testNotebookVerification() {
  console.log("Testing org-omi notebook verification");

  const bundle = exporter.exportBundle(sample, {
    sourcePath: "org/org-omi-canonical-syntax-surface.org"
  });
  const verification = notebook.verifyBundle({
    declarationText: bundle.declarationText,
    manifest: bundle.manifestJson,
    markdown: bundle.markdown,
    canvas: bundle.canvasJson
  });
  const summary = notebook.summarize({
    manifest: bundle.manifestJson,
    markdown: bundle.markdown,
    canvas: bundle.canvasJson
  });
  const rendered = notebook.render({
    declarationText: bundle.declarationText,
    manifest: bundle.manifestJson,
    markdown: bundle.markdown,
    canvas: bundle.canvasJson
  });

  assert.strictEqual(verification.ok, true);
  assert.strictEqual(summary.omi_id, bundle.frontMatter.OMI_ID);
  assert.strictEqual(summary.tramp.host, "node-a");
  assert.ok(rendered.includes("decoded declaration + deterministic receipt"));
  assert.ok(rendered.includes(bundle.declarationReceipt));

  console.log("  OK notebook verification rejects surface authority drift\n");
}

console.log("Testing org-omi pinch point integration");
console.log("=======================================\n");

testOrgOmiBundleExport();
testNotebookVerification();

console.log("\n=======================================");
console.log("ALL ORG-OMI INTEGRATION TESTS PASSED");
