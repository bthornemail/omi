#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const exporter = require("../workbench/src/org_omi_exporter.js");

function usage() {
  console.error("Usage: node tools/org_omi_export.js <input.org> <output-dir> [--surface-digest] [--blob-receipt fnv1a32:...]");
}

function parseArgs(argv) {
  const args = {
    input: "",
    outputDir: "",
    includeSurfaceDigest: false,
    blobReceipt: ""
  };

  if (argv.length < 4) {
    return null;
  }
  args.input = argv[2];
  args.outputDir = argv[3];

  for (let i = 4; i < argv.length; i += 1) {
    if (argv[i] === "--surface-digest") {
      args.includeSurfaceDigest = true;
    } else if (argv[i] === "--blob-receipt" && argv[i + 1]) {
      args.blobReceipt = argv[i + 1];
      i += 1;
    } else {
      return null;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args) {
    usage();
    process.exit(1);
  }

  const text = fs.readFileSync(args.input, "utf8");
  const bundle = exporter.exportBundle(text, {
    sourcePath: args.input,
    tangleRoot: args.outputDir,
    includeSurfaceDigest: args.includeSurfaceDigest,
    blobReceipt: args.blobReceipt
  });
  const safe = exporter.safeIdToFileName(bundle.frontMatter.OMI_ID);

  fs.mkdirSync(args.outputDir, { recursive: true });
  fs.writeFileSync(path.join(args.outputDir, safe + ".md"), bundle.markdown, "utf8");
  fs.writeFileSync(path.join(args.outputDir, safe + ".canvas"), bundle.canvasJson, "utf8");
  fs.writeFileSync(path.join(args.outputDir, safe + ".manifest.json"), bundle.manifestJson, "utf8");

  process.stdout.write(JSON.stringify({
    markdown: safe + ".md",
    canvas: safe + ".canvas",
    manifest: safe + ".manifest.json",
    declaration_receipt: bundle.declarationReceipt
  }, null, 2) + "\n");
}

main();
