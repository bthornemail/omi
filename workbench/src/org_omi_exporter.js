(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("crypto") : null,
    typeof require === "function" ? require("./org_parser.js") : root.OMIOrgParser,
    typeof require === "function" ? require("./tramp_path.js") : root.OMITrampPath
  );
  root.OMIOrgOmiExporter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (crypto, orgParser, trampPath) {
  "use strict";

  const KNOWN_SECTIONS = {
    identity: true,
    address: true,
    scope: true,
    carrier: true,
    ontology: true,
    projection: true,
    receipt: true,
    tree: true,
    svg: true,
    counts: true,
    chronological: true,
    blackboard: true,
    bands: true
  };

  function fnv1a32Value(text) {
    let hash = 2166136261;
    const data = String(text || "");
    for (let i = 0; i < data.length; i += 1) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function fnv1a32(text) {
    return "fnv1a32:" + fnv1a32Value(text).toString(16).padStart(8, "0");
  }

  function stableString(value) {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return "[" + value.map(stableString).join(",") + "]";
    }
    return "{" + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ":" + stableString(value[key]);
    }).join(",") + "}";
  }

  function parseFrontMatter(text) {
    const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
    const frontMatter = {};
    lines.forEach(function (line) {
      const match = line.match(/^#\+([A-Z0-9_]+):\s*(.*)$/);
      if (match) {
        frontMatter[match[1]] = match[2].trim();
      }
    });
    return frontMatter;
  }

  function normalizeBlock(text) {
    return String(text || "").trim();
  }

  function countParens(text) {
    let balance = 0;
    const source = String(text || "");
    for (let i = 0; i < source.length; i += 1) {
      if (source[i] === "(") {
        balance += 1;
      } else if (source[i] === ")") {
        balance -= 1;
        if (balance < 0) {
          return -1;
        }
      }
    }
    return balance;
  }

  function extractSectionNames(text) {
    const source = String(text || "");
    const names = [];
    let depth = 0;
    let i = 0;

    while (i < source.length) {
      const ch = source[i];
      if (ch === "(") {
        depth += 1;
        i += 1;
        while (i < source.length && /\s/.test(source[i])) {
          i += 1;
        }
        const start = i;
        while (i < source.length && /[A-Za-z0-9_.:-]/.test(source[i])) {
          i += 1;
        }
        const name = source.slice(start, i);
        if (depth === 2 && name) {
          names.push(name);
        }
        continue;
      }
      if (ch === ")") {
        depth -= 1;
      }
      i += 1;
    }

    return names;
  }

  function validateDeclaration(text) {
    const normalized = normalizeBlock(text);
    if (!/^\(omi(?:[\s\S]*)\)$/.test(normalized)) {
      throw new Error("invalid-omi-envelope");
    }
    if (countParens(normalized) !== 0) {
      throw new Error("unbalanced-omi-envelope");
    }
    extractSectionNames(normalized).forEach(function (name) {
      if (!KNOWN_SECTIONS[name]) {
        return;
      }
    });
    return normalized;
  }

  function safeIdToFileName(omiId) {
    return String(omiId || "omi").replace(/[^A-Za-z0-9._-]/g, "_");
  }

  function selectPrimarySection(document) {
    const sections = document && Array.isArray(document.sections) ? document.sections : [];
    for (let i = 0; i < sections.length; i += 1) {
      if (sections[i].properties && Object.keys(sections[i].properties).length > 0) {
        return sections[i];
      }
    }
    return sections[0] || null;
  }

  function buildManifest(frontMatter, declarationText, options) {
    const opts = options || {};
    const declarationReceipt = fnv1a32(declarationText);
    const manifest = {
      version: 1,
      omi_id: frontMatter.OMI_ID,
      authority: frontMatter.OMI_AUTHORITY || "decoded-declaration+deterministic-receipt",
      surface: frontMatter.OMI_SURFACE || "org-omi",
      source_surface_path: opts.sourcePath || "",
      tangle_root: opts.tangleRoot || frontMatter.OMI_TANGLE_ROOT || "declarations/",
      declaration_file: opts.declarationFile || "",
      markdown_file: opts.markdownFile || "",
      canvas_file: opts.canvasFile || "",
      blob_file: opts.blobFile || "",
      declaration_receipt: declarationReceipt
    };

    if (opts.surfaceDigest) {
      manifest.surface_digest = opts.surfaceDigest;
    }
    if (opts.blobReceipt) {
      manifest.blob_receipt = opts.blobReceipt;
    }
    if (frontMatter.OMI_TRAMP_ROOT) {
      manifest.tramp = trampPath.parse(frontMatter.OMI_TRAMP_ROOT);
    }

    manifest.manifest_receipt = fnv1a32(stableString(manifest));
    return manifest;
  }

  function canvasPorts() {
    return {
      top: "FS",
      right: "GS",
      bottom: "RS",
      left: "US"
    };
  }

  function buildCanvas(document, manifest) {
    const sections = document && Array.isArray(document.sections) ? document.sections : [];
    const nodes = [];
    const edges = [];
    const ancestry = [];
    const rootId = safeIdToFileName(manifest.omi_id || "omi-root");

    nodes.push({
      id: rootId,
      type: "text",
      text: manifest.omi_id || "omi-root",
      x: 40,
      y: 40,
      width: 260,
      height: 90,
      omi: {
        receipt: manifest.declaration_receipt,
        declaration: manifest.omi_id || "omi-root",
        ports: canvasPorts(),
        clockwise: ["FS", "GS", "RS", "US"]
      }
    });

    sections.forEach(function (section, index) {
      const nodeId = rootId + "--section-" + index;
      const level = Math.max(1, Number(section.level || 1));
      ancestry[level] = nodeId;
      ancestry.length = level + 1;
      const parentId = level === 1 ? rootId : ancestry[level - 1] || rootId;
      nodes.push({
        id: nodeId,
        type: "text",
        text: section.title,
        x: 60 + (level - 1) * 280,
        y: 180 + index * 140,
        width: 240,
        height: 90,
        omi: {
          receipt: manifest.declaration_receipt,
          declaration: section.title,
          ports: canvasPorts(),
          clockwise: ["FS", "GS", "RS", "US"],
          properties: section.properties || {}
        }
      });
      edges.push({
        id: "edge-" + index,
        fromNode: parentId,
        fromSide: "right",
        toNode: nodeId,
        toSide: "top",
        label: section.properties && section.properties.OMI_LAYER ? section.properties.OMI_LAYER : "grouped-under",
        omi: {
          authority: "projection-only",
          relation: "grouped-under"
        }
      });
    });

    return {
      nodes: nodes,
      edges: edges
    };
  }

  function yamlValue(text) {
    const value = String(text || "");
    if (value === "" || /[:#\-\n]/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }

  function buildMarkdown(frontMatter, document, manifest) {
    const primary = selectPrimarySection(document);
    const lines = [
      "---",
      "omi_id: " + yamlValue(manifest.omi_id),
      "omi_surface: " + yamlValue(manifest.surface),
      "omi_authority: " + yamlValue(manifest.authority),
      "omi_receipt: " + yamlValue(manifest.declaration_receipt),
      "omi_manifest_receipt: " + yamlValue(manifest.manifest_receipt),
      "omi_fs: FS",
      "omi_gs: GS",
      "omi_rs: RS",
      "omi_us: US"
    ];

    if (primary && primary.properties) {
      if (primary.properties.OMI_LAYER) {
        lines.push("omi_layer: " + yamlValue(primary.properties.OMI_LAYER));
      }
      if (primary.properties.OMI_OPERATOR) {
        lines.push("omi_operator: " + yamlValue(primary.properties.OMI_OPERATOR));
      }
    }
    if (frontMatter.OMI_TRAMP_ROOT) {
      lines.push("omi_tramp_root: " + yamlValue(frontMatter.OMI_TRAMP_ROOT));
    }
    lines.push("---", "");
    lines.push("# " + (frontMatter.TITLE || manifest.omi_id || "org-omi declaration"), "");
    lines.push("Decoded declaration plus deterministic receipt remains the authority witness.", "");
    lines.push("## Receipt", "");
    lines.push("- Declaration receipt: `" + manifest.declaration_receipt + "`");
    lines.push("- Manifest receipt: `" + manifest.manifest_receipt + "`");
    if (manifest.surface_digest) {
      lines.push("- Surface digest: `" + manifest.surface_digest + "`");
    }
    if (manifest.blob_receipt) {
      lines.push("- BLOB receipt: `" + manifest.blob_receipt + "`");
    }
    lines.push("", "## Sections", "");
    (document.sections || []).forEach(function (section) {
      lines.push("- " + section.title);
    });
    return lines.join("\n") + "\n";
  }

  function normalizeDeclarationFromOrg(text) {
    const parsed = orgParser.parse(text);
    const frontMatter = parseFrontMatter(text);
    const blocks = (parsed.blocks || []).filter(function (block) {
      return String(block.language || "") === "omi";
    });
    if (!frontMatter.OMI_ID) {
      throw new Error("missing-omi-id");
    }
    if (blocks.length === 0) {
      throw new Error("missing-omi-blocks");
    }
    const normalizedBlocks = blocks.map(function (block) {
      return validateDeclaration(block.text);
    });
    return {
      frontMatter: frontMatter,
      document: parsed,
      blocks: blocks,
      declarationText: normalizedBlocks.join("\n\n")
    };
  }

  function sha256(text) {
    if (!crypto) {
      return "";
    }
    return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
  }

  function exportBundle(text, options) {
    const normalized = normalizeDeclarationFromOrg(text);
    const frontMatter = normalized.frontMatter;
    const safeId = safeIdToFileName(frontMatter.OMI_ID);
    const opts = Object.assign({
      tangleRoot: frontMatter.OMI_TANGLE_ROOT || "declarations/",
      declarationFile: safeId + ".omi",
      markdownFile: safeId + ".md",
      canvasFile: safeId + ".canvas",
      manifestFile: safeId + ".manifest.json",
      includeSurfaceDigest: false
    }, options || {});
    const manifest = buildManifest(frontMatter, normalized.declarationText, {
      sourcePath: opts.sourcePath || "",
      tangleRoot: opts.tangleRoot,
      declarationFile: opts.declarationFile,
      markdownFile: opts.markdownFile,
      canvasFile: opts.canvasFile,
      blobFile: opts.blobFile || "",
      surfaceDigest: opts.includeSurfaceDigest ? sha256(text) : "",
      blobReceipt: opts.blobReceipt || ""
    });
    const canvas = buildCanvas(normalized.document, manifest);
    const markdown = buildMarkdown(frontMatter, normalized.document, manifest);
    const manifestJson = stableString(manifest);
    const canvasJson = JSON.stringify(canvas, null, 2) + "\n";

    return {
      declarationText: normalized.declarationText,
      declarationReceipt: manifest.declaration_receipt,
      manifest: manifest,
      manifestJson: manifestJson + "\n",
      markdown: markdown,
      canvas: canvas,
      canvasJson: canvasJson,
      frontMatter: frontMatter,
      document: normalized.document
    };
  }

  return {
    fnv1a32: fnv1a32,
    fnv1a32Value: fnv1a32Value,
    stableString: stableString,
    parseFrontMatter: parseFrontMatter,
    normalizeDeclarationFromOrg: normalizeDeclarationFromOrg,
    exportBundle: exportBundle,
    safeIdToFileName: safeIdToFileName
  };
}));
