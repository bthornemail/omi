(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("fs") : root.fs,
    typeof require === "function" ? require("path") : root.path,
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./org_exporter.js") : root.OMIOrgExporter,
    typeof require === "function" ? require("./sync_packet.js") : root.OMISyncPacket,
    typeof require === "function" ? require("./export_pipeline.js") : root.OMIExportPipeline,
    typeof require === "function" ? require("./graphics_backend_equivalence.js") : root.OMIGraphicsBackendEquivalence,
    typeof require === "function" ? require("./visual_artifact_equivalence.js") : root.OMIVisualArtifactEquivalence
  );
  root.OMIComposerPackage = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  fs,
  path,
  artifactIdentity,
  orgExporter,
  syncPacket,
  exportPipeline,
  graphicsBackendEquivalence,
  visualArtifactEquivalence
) {
  "use strict";

  function fnv1a(text) {
    let hash = 2166136261;
    const data = String(text || "");
    for (let i = 0; i < data.length; i += 1) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
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

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function requireFs() {
    if (!fs || !path) {
      throw new Error("fs-unavailable");
    }
  }

  function sceneId(state) {
    return state && state.scene && state.scene.id ? state.scene.id : (state && state.document && state.document.id ? state.document.id : "composer.scene");
  }

  function rootMetadata(state, root) {
    return root || artifactIdentity.rootMetadata(sceneId(state));
  }

  function sceneSummary(state, options) {
    const mode = options && options.mode ? options.mode : (state.document && state.document.kind === "world" ? "barcode-template-scene" : "polyform-3d");
    const comparison = visualArtifactEquivalence.compareState(state, { mode: mode });
    if (!comparison || !comparison.same) {
      throw new Error("visual-equivalence-failed");
    }
    return comparison;
  }

  function exportPackage(state, options) {
    const mode = options && options.mode ? options.mode : (state.document && state.document.kind === "world" ? "barcode-template-scene" : "polyform-3d");
    const comparison = sceneSummary(state, { mode: mode });
    const graphics = comparison.backend;
    const exports = exportPipeline.exportAll(state);
    const objMtl = exportPipeline.exportObjMtl(state);
    const orgBundle = orgExporter.exportBundle({
      source: state.source,
      document: state.document,
      editLog: state.editLog,
      editLogApi: state.editLogApi,
      syncPackets: state.syncPackets || [],
      syncPacketApi: options && options.syncPacketApi ? options.syncPacketApi : syncPacket
    });
    const receipts = JSON.parse(orgBundle["receipts.json"]);
    const root = rootMetadata(state, comparison.canonical);

    const files = {
      "manifest.json": null,
      "source/model.omilisp": orgBundle["model.omilisp"],
      "logs/edits.omi-log.json": orgBundle["edits.omi-log.json"],
      "sync/sync.omi-synclog.json": orgBundle["sync.omi-synclog.json"],
      "receipts/receipts.json": orgBundle["receipts.json"],
      "artifacts/scene.svg": exports["scene.svg"],
      "artifacts/scene.gltf.json": exports["scene.gltf.json"],
      "artifacts/scene.obj": objMtl.obj,
      "artifacts/scene.mtl": objMtl.mtl,
      "artifacts/scene.omi.receipt": objMtl.receipt,
      "plans/webgl-plan.json": stableString(comparison.backend.summaries[0]),
      "plans/gles-plan.json": stableString(comparison.backend.summaries[1]),
      "plans/opengl-plan.json": stableString(comparison.backend.summaries[2]),
      "equivalence/graphics-equivalence.json": stableString(graphics),
      "equivalence/visual-artifact-equivalence.json": stableString(comparison),
      "README.org": orgBundle["README.org"]
    };

    const manifest = {
      package_kind: "omi-composer-package",
      version: 1,
      scene_root_identity: clone(root),
      scene_root_receipt: fnv1a(stableString(root)),
      source_receipt: orgExporter.sourceReceipt(state.source),
      edit_log_receipt: state.editLogApi.receipt(state.editLog),
      sync_bundle_receipt: receipts.sync_bundle_receipt,
      graphics_equivalence_receipt: graphics.receipt,
      visual_artifact_equivalence_receipt: comparison.receipt,
      file_receipts: {},
      required_files: Object.keys(files).filter(function (name) {
        return name !== "manifest.json";
      }).sort(),
      projection_mode: mode
    };

    Object.keys(files).forEach(function (name) {
      if (name !== "manifest.json") {
        manifest.file_receipts[name] = fnv1a(String(files[name] || ""));
      }
    });
    manifest.manifest_receipt = fnv1a(stableString(manifest));
    files["manifest.json"] = stableString(manifest);

    return {
      manifest: manifest,
      files: files,
      receipt: manifest.manifest_receipt,
      scene_root_identity: root,
      scene_root_receipt: manifest.scene_root_receipt,
      graphics_equivalence: graphics,
      visual_artifact_equivalence: comparison
    };
  }

  function normalizePackageInput(input) {
    if (typeof input === "string") {
      return readPackage(input);
    }
    if (!input) {
      return null;
    }
    if (input.files && typeof input.files === "object") {
      return {
        files: input.files,
        manifest: input.manifest || null
      };
    }
    if (input["manifest.json"] || input["README.org"]) {
      return {
        files: input,
        manifest: null
      };
    }
    return null;
  }

  function readPackage(dirPath) {
    requireFs();
    const files = {};

    function walk(current, rel) {
      fs.readdirSync(current, { withFileTypes: true }).forEach(function (entry) {
        const nextPath = path.join(current, entry.name);
        const nextRel = rel ? path.join(rel, entry.name) : entry.name;
        if (entry.isDirectory()) {
          walk(nextPath, nextRel);
          return;
        }
        files[nextRel.replace(/\\/g, "/")] = fs.readFileSync(nextPath, "utf8");
      });
    }

    walk(dirPath, "");
    return {
      files: files,
      manifest: files["manifest.json"] ? JSON.parse(files["manifest.json"]) : null
    };
  }

  function validateManifest(manifest, files) {
    if (!manifest || manifest.package_kind !== "omi-composer-package") {
      throw new Error("invalid-manifest");
    }
    if (!Number.isInteger(manifest.version) || manifest.version !== 1) {
      throw new Error("invalid-manifest-version");
    }
    if (!manifest.scene_root_identity || !manifest.scene_root_identity.omi_path) {
      throw new Error("invalid-scene-root");
    }
    if (!manifest.file_receipts || typeof manifest.file_receipts !== "object") {
      throw new Error("invalid-file-receipts");
    }
    if (!Array.isArray(manifest.required_files)) {
      throw new Error("invalid-required-files");
    }

    const receiptCheck = clone(manifest);
    delete receiptCheck.manifest_receipt;
    const expectedManifestReceipt = fnv1a(stableString(receiptCheck));
    if (Number(manifest.manifest_receipt) !== expectedManifestReceipt) {
      throw new Error("invalid-manifest-receipt");
    }

    manifest.required_files.forEach(function (name) {
      if (!Object.prototype.hasOwnProperty.call(files, name)) {
        throw new Error("missing-package-entry:" + name);
      }
      const expected = manifest.file_receipts[name];
      const actual = fnv1a(String(files[name] || ""));
      if (Number(expected) !== actual) {
        throw new Error("receipt-mismatch:" + name);
      }
    });

    const receipts = JSON.parse(String(files["receipts/receipts.json"] || "{}"));
    if (Number(receipts.base_source_receipt) !== Number(manifest.source_receipt)) {
      throw new Error("receipt-mismatch:source");
    }
    if (Number(receipts.edit_log_receipt) !== Number(manifest.edit_log_receipt)) {
      throw new Error("receipt-mismatch:edit-log");
    }
    if (Number(receipts.sync_bundle_receipt) !== Number(manifest.sync_bundle_receipt)) {
      throw new Error("receipt-mismatch:sync-bundle");
    }

    const svgSummary = visualArtifactEquivalence.parseSvgSummary(files["artifacts/scene.svg"]);
    const gltfSummary = visualArtifactEquivalence.parseGltfSummary(JSON.parse(String(files["artifacts/scene.gltf.json"] || "{}")));
    const objSummary = visualArtifactEquivalence.parseObjSummary({
      receipt: String(files["artifacts/scene.omi.receipt"] || "")
    });
    const webglSummary = visualArtifactEquivalence.parsePlanSummary(JSON.parse(String(files["plans/webgl-plan.json"] || "{}")));
    const glesSummary = visualArtifactEquivalence.parsePlanSummary(JSON.parse(String(files["plans/gles-plan.json"] || "{}")));
    const openglSummary = visualArtifactEquivalence.parsePlanSummary(JSON.parse(String(files["plans/opengl-plan.json"] || "{}")));
    const graphicsSummaryValue = JSON.parse(String(files["equivalence/graphics-equivalence.json"] || "{}"));
    const visualSummaryValue = JSON.parse(String(files["equivalence/visual-artifact-equivalence.json"] || "{}"));

    if (!svgSummary || !gltfSummary || !objSummary || !webglSummary || !glesSummary || !openglSummary) {
      throw new Error("invalid-artifact-summary");
    }
    if (stableString(svgSummary.root) !== stableString(manifest.scene_root_identity) ||
        stableString(gltfSummary.root) !== stableString(manifest.scene_root_identity) ||
        stableString(objSummary.root) !== stableString(manifest.scene_root_identity) ||
        stableString(webglSummary.root) !== stableString(manifest.scene_root_identity) ||
        stableString(glesSummary.root) !== stableString(manifest.scene_root_identity) ||
        stableString(openglSummary.root) !== stableString(manifest.scene_root_identity)) {
      throw new Error("scene-root-mismatch");
    }
    if (!graphicsSummaryValue || graphicsSummaryValue.same !== true) {
      throw new Error("invalid-graphics-equivalence");
    }
    if (!visualSummaryValue || visualSummaryValue.same !== true) {
      throw new Error("invalid-visual-equivalence");
    }
    if (Number(manifest.scene_root_receipt) !== Number(svgSummary.root_receipt) ||
        Number(manifest.scene_root_receipt) !== Number(gltfSummary.root_receipt) ||
        Number(manifest.scene_root_receipt) !== Number(objSummary.root_receipt) ||
        Number(manifest.scene_root_receipt) !== Number(webglSummary.root_receipt) ||
        Number(manifest.scene_root_receipt) !== Number(glesSummary.root_receipt) ||
        Number(manifest.scene_root_receipt) !== Number(openglSummary.root_receipt)) {
      throw new Error("scene-root-receipt-mismatch");
    }
    if (Number(manifest.graphics_equivalence_receipt) !== Number(graphicsSummaryValue.receipt)) {
      throw new Error("graphics-equivalence-receipt-mismatch");
    }
    if (Number(manifest.visual_artifact_equivalence_receipt) !== Number(visualSummaryValue.receipt)) {
      throw new Error("visual-equivalence-receipt-mismatch");
    }
    if (stableString(visualSummaryValue.canonical) !== stableString(manifest.scene_root_identity)) {
      throw new Error("visual-root-mismatch");
    }

    return {
      manifest: manifest,
      files: files,
      summaries: {
        svg: svgSummary,
        gltf: gltfSummary,
        obj: objSummary,
        webgl: webglSummary,
        gles: glesSummary,
        opengl: openglSummary,
        graphics: graphicsSummaryValue,
        visual: visualSummaryValue
      }
    };
  }

  function importPackage(input) {
    const normalized = normalizePackageInput(input);
    if (!normalized) {
      throw new Error("invalid-package");
    }
    if (!Object.prototype.hasOwnProperty.call(normalized.files, "manifest.json") && !normalized.manifest) {
      throw new Error("missing-manifest");
    }
    const manifest = normalized.manifest || JSON.parse(String(normalized.files["manifest.json"] || ""));
    return validateManifest(manifest, normalized.files);
  }

  function writePackage(dirPath, bundle) {
    requireFs();
    fs.mkdirSync(dirPath, { recursive: true });
    Object.keys(bundle.files).sort().forEach(function (name) {
      const target = path.join(dirPath, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, String(bundle.files[name]), "utf8");
    });
    return dirPath;
  }

  return {
    exportPackage: exportPackage,
    importPackage: importPackage,
    writePackage: writePackage,
    readPackage: readPackage,
    validateManifest: validateManifest
  };
}));
