(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./org_omi_exporter.js") : root.OMIOrgOmiExporter,
    typeof require === "function" ? require("./tramp_path.js") : root.OMITrampPath
  );
  root.OMIOrgOmiNotebook = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (exporter, trampPath) {
  "use strict";

  function parseMarkdownFrontMatter(text) {
    const source = String(text || "");
    if (!source.startsWith("---\n")) {
      return { frontMatter: {}, body: source };
    }
    const end = source.indexOf("\n---\n", 4);
    if (end < 0) {
      return { frontMatter: {}, body: source };
    }

    const block = source.slice(4, end).split("\n");
    const frontMatter = {};
    block.forEach(function (line) {
      const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (match) {
        frontMatter[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
      }
    });
    return {
      frontMatter: frontMatter,
      body: source.slice(end + 5)
    };
  }

  function verifyBundle(bundle) {
    const manifest = typeof bundle.manifest === "string" ? JSON.parse(bundle.manifest) : bundle.manifest;
    const canvas = typeof bundle.canvas === "string" ? JSON.parse(bundle.canvas) : bundle.canvas;
    const markdown = parseMarkdownFrontMatter(bundle.markdown);
    const declarationReceipt = exporter.fnv1a32(bundle.declarationText);
    const manifestCheck = Object.assign({}, manifest);
    delete manifestCheck.manifest_receipt;
    const expectedManifestReceipt = exporter.fnv1a32(exporter.stableString(manifestCheck));
    const canvasReceipts = (canvas.nodes || []).map(function (node) {
      return node.omi && node.omi.receipt ? node.omi.receipt : "";
    }).filter(Boolean);

    return {
      ok: declarationReceipt === manifest.declaration_receipt &&
        markdown.frontMatter.omi_receipt === manifest.declaration_receipt &&
        manifest.manifest_receipt === expectedManifestReceipt &&
        canvasReceipts.every(function (receipt) { return receipt === manifest.declaration_receipt; }),
      declaration_receipt: declarationReceipt,
      manifest_receipt: manifest.manifest_receipt,
      expected_manifest_receipt: expectedManifestReceipt,
      markdown_receipt: markdown.frontMatter.omi_receipt || "",
      canvas_receipts: canvasReceipts
    };
  }

  function summarize(bundle) {
    const manifest = typeof bundle.manifest === "string" ? JSON.parse(bundle.manifest) : bundle.manifest;
    const canvas = typeof bundle.canvas === "string" ? JSON.parse(bundle.canvas) : bundle.canvas;
    const markdown = parseMarkdownFrontMatter(bundle.markdown);
    const tramp = manifest.tramp || (markdown.frontMatter.omi_tramp_root ? trampPath.parse(markdown.frontMatter.omi_tramp_root) : null);
    return {
      title: markdown.body.split("\n")[0].replace(/^#\s*/, "") || manifest.omi_id,
      omi_id: manifest.omi_id,
      declaration_receipt: manifest.declaration_receipt,
      manifest_receipt: manifest.manifest_receipt,
      node_count: (canvas.nodes || []).length,
      edge_count: (canvas.edges || []).length,
      tramp: tramp
    };
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function render(bundle) {
    const summary = summarize(bundle);
    const verification = verifyBundle(bundle);
    const canvas = typeof bundle.canvas === "string" ? JSON.parse(bundle.canvas) : bundle.canvas;

    return [
      "<div class=\"edge-card\"><strong>" + escapeHtml(summary.title) + "</strong><div class=\"muted\">" + escapeHtml(summary.omi_id) + "</div></div>",
      "<div class=\"edge-card\"><strong>Authority</strong><div>decoded declaration + deterministic receipt</div><div class=\"muted\">" + (verification.ok ? "verified" : "receipt mismatch") + "</div></div>",
      "<div class=\"edge-card\"><strong>Receipts</strong><div class=\"chip\">" + escapeHtml(summary.declaration_receipt) + "</div><div class=\"chip\">" + escapeHtml(summary.manifest_receipt) + "</div></div>",
      "<div class=\"edge-card\"><strong>Canvas Ports</strong><div>" + (canvas.nodes || []).slice(0, 3).map(function (node) {
        const ports = node.omi && node.omi.ports ? node.omi.ports : {};
        return "<div class=\"muted\">" + escapeHtml(node.text || node.id) + ": top=" + escapeHtml(ports.top || "") +
          " right=" + escapeHtml(ports.right || "") +
          " bottom=" + escapeHtml(ports.bottom || "") +
          " left=" + escapeHtml(ports.left || "") + "</div>";
      }).join("") + "</div></div>",
      summary.tramp ? "<div class=\"edge-card\"><strong>TRAMP Locator</strong><div class=\"muted\">" + escapeHtml(summary.tramp.method + ":" + summary.tramp.host + ":" + summary.tramp.path) + "</div></div>" : ""
    ].join("");
  }

  return {
    parseMarkdownFrontMatter: parseMarkdownFrontMatter,
    verifyBundle: verifyBundle,
    summarize: summarize,
    render: render
  };
}));
