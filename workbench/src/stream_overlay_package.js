(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("fs") : root.fs,
    typeof require === "function" ? require("path") : root.path,
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./stream_projection.js") : root.OMIStreamProjection
  );
  root.OMIStreamOverlayPackage = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  fs,
  path,
  artifactIdentity,
  streamProjection
) {
  "use strict";

  function fnv1a(text) {
    return artifactIdentity.fnv1a(String(text || ""));
  }

  function stableString(value) {
    return artifactIdentity.stableString(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function requireFs() {
    if (!fs || !path) {
      throw new Error("fs-unavailable");
    }
  }

  function normalizeDeclaration(input) {
    if (!input) {
      return null;
    }
    if (typeof input.snapshot === "function") {
      return normalizeDeclaration(input.snapshot());
    }
    if (input.streamDeclaration && typeof input.streamDeclaration.snapshot === "function") {
      return normalizeDeclaration(input.streamDeclaration.snapshot());
    }
    if (input.stream_id && Array.isArray(input.regions) && Object.prototype.hasOwnProperty.call(input, "identity_receipt")) {
      return clone(input);
    }
    return null;
  }

  function normalizeMode(mode, declaration) {
    const value = String(mode || (declaration && declaration.active && declaration.active.presentation) || "barcode");
    if (value === "lazy") {
      return "barcode";
    }
    if (value === "greedy") {
      return "chart";
    }
    if (value === "barcode" || value === "chart") {
      return value;
    }
    return null;
  }

  function normalizeIndices(declaration, options) {
    const sourceLength = Math.max(0, Math.floor(Number(declaration && declaration.source_length) || 0));
    const raw = options && Array.isArray(options.sample_indices)
      ? options.sample_indices
      : (options && Array.isArray(options.indices) ? options.indices : null);
    if (!raw) {
      const indices = [];
      for (let i = 0; i < sourceLength; i += 1) {
        indices.push(i);
      }
      return indices;
    }
    return Array.from(new Set(raw.map(function (value) {
      return Math.max(0, Math.floor(Number(value) || 0));
    }).filter(function (value) {
      return value < sourceLength;
    }))).sort(function (a, b) {
      return a - b;
    });
  }

  function normalizeResolvedRegions(samples) {
    return samples.map(function (sample) {
      return clone(sample.resolved_region);
    });
  }

  function normalizeSamples(samples) {
    return samples.map(function (sample) {
      return clone(sample);
    });
  }

  function packageReceiptData(manifest) {
    return {
      package_kind: manifest.package_kind,
      version: manifest.version,
      stream_id: manifest.stream_id,
      stream_scope: manifest.stream_scope,
      identity_receipt: manifest.identity_receipt,
      projection_receipt: manifest.projection_receipt,
      view_receipt: manifest.view_receipt,
      overlay_receipt: manifest.overlay_receipt,
      resolved_region_receipt: manifest.resolved_region_receipt,
      projection_mode: manifest.projection_mode,
      active_presentation: manifest.active_presentation,
      source_length: manifest.source_length,
      region_count: manifest.region_count,
      sample_count: manifest.sample_count,
      sample_indices: manifest.sample_indices,
      required_files: manifest.required_files,
      file_receipts: manifest.file_receipts
    };
  }

  function exportStreamOverlayPackage(input, options) {
    const declaration = normalizeDeclaration(input);
    if (!declaration) {
      throw new Error("invalid-stream-declaration");
    }
    const mode = normalizeMode(options && options.mode, declaration);
    if (!mode) {
      throw new Error("invalid-projection-mode");
    }
    const projection = streamProjection.projectStreamDeclaration(declaration, { mode: mode });
    if (!projection) {
      throw new Error("invalid-stream-projection");
    }
    const sampleIndices = normalizeIndices(declaration, options || {});
    const samples = sampleIndices.map(function (index) {
      return streamProjection.projectStreamIndex(declaration, index, { mode: mode });
    });
    const resolvedRegions = normalizeResolvedRegions(samples);
    const overlayReceipt = fnv1a(stableString({
      identity_receipt: declaration.identity_receipt,
      projection_receipt: projection.projection_receipt,
      view_receipt: projection.view_receipt,
      projection_mode: mode,
      sample_indices: sampleIndices,
      sample_receipts: samples.map(function (sample) {
        return sample.overlay_receipt;
      })
    }));
    const receipts = {
      identity_receipt: declaration.identity_receipt,
      projection_receipt: projection.projection_receipt,
      view_receipt: projection.view_receipt,
      overlay_receipt: overlayReceipt,
      resolved_region_receipt: fnv1a(stableString(resolvedRegions)),
      sample_count: samples.length
    };
    const files = {
      "manifest.json": null,
      "declaration/declaration.json": stableString(declaration),
      "projection/projection.json": stableString(projection),
      "overlays/overlay-stack.json": stableString({
        package_kind: "stream-overlay-stack",
        version: 1,
        stream_id: declaration.stream_id,
        stream_scope: declaration.stream_scope,
        identity_receipt: declaration.identity_receipt,
        projection_receipt: projection.projection_receipt,
        view_receipt: projection.view_receipt,
        overlay_receipt: overlayReceipt,
        resolved_region_receipt: receipts.resolved_region_receipt,
        projection_mode: mode,
        sample_indices: sampleIndices,
        samples: normalizeSamples(samples)
      }),
      "overlays/resolved-regions.json": stableString({
        package_kind: "stream-overlay-resolved-regions",
        version: 1,
        stream_id: declaration.stream_id,
        stream_scope: declaration.stream_scope,
        identity_receipt: declaration.identity_receipt,
        projection_receipt: projection.projection_receipt,
        view_receipt: projection.view_receipt,
        overlay_receipt: overlayReceipt,
        resolved_regions: resolvedRegions
      }),
      "receipts/receipts.json": stableString(receipts),
      "README.org": [
        "#+TITLE: OMI Stream Overlay Package",
        "",
        "This package carries a deterministic stream declaration,",
        "its overlay projection stack, resolved regions, and receipts.",
        "",
        "Identity follows declaration.",
        "Projection follows the lens.",
        "View follows presentation."
      ].join("\n")
    };

    const manifest = {
      package_kind: "stream-overlay-package",
      version: 1,
      stream_id: declaration.stream_id,
      stream_scope: declaration.stream_scope,
      source_length: declaration.source_length,
      region_count: Array.isArray(declaration.regions) ? declaration.regions.length : 0,
      active_presentation: declaration.active && declaration.active.presentation ? declaration.active.presentation : "barcode",
      projection_mode: mode,
      identity_receipt: declaration.identity_receipt,
      projection_receipt: projection.projection_receipt,
      view_receipt: projection.view_receipt,
      overlay_receipt: overlayReceipt,
      resolved_region_receipt: receipts.resolved_region_receipt,
      sample_count: samples.length,
      sample_indices: sampleIndices,
      file_receipts: {},
      required_files: Object.keys(files).filter(function (name) {
        return name !== "manifest.json";
      }).sort()
    };

    Object.keys(files).forEach(function (name) {
      if (name !== "manifest.json") {
        manifest.file_receipts[name] = fnv1a(String(files[name] || ""));
      }
    });
    manifest.package_receipt = fnv1a(stableString(packageReceiptData(manifest)));
    files["manifest.json"] = stableString(manifest);

    return {
      manifest: manifest,
      files: files,
      declaration: declaration,
      projection: projection,
      overlay_stack: samples,
      resolved_regions: resolvedRegions,
      receipts: receipts
    };
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

  function normalizeInput(input) {
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

  function validateManifest(manifest, files) {
    if (!manifest || manifest.package_kind !== "stream-overlay-package") {
      throw new Error("invalid-manifest");
    }
    if (!Number.isInteger(manifest.version) || manifest.version !== 1) {
      throw new Error("invalid-manifest-version");
    }
    if (!manifest.stream_id || !manifest.stream_scope) {
      throw new Error("invalid-stream-identity");
    }
    if (!Array.isArray(manifest.sample_indices)) {
      throw new Error("invalid-sample-indices");
    }
    if (!manifest.file_receipts || typeof manifest.file_receipts !== "object") {
      throw new Error("invalid-file-receipts");
    }
    if (!Array.isArray(manifest.required_files)) {
      throw new Error("invalid-required-files");
    }
    if (Object.prototype.hasOwnProperty.call(files, "manifest.json") &&
        String(files["manifest.json"]) !== stableString(manifest)) {
      throw new Error("manifest-mismatch");
    }

    const manifestCheck = clone(manifest);
    delete manifestCheck.package_receipt;
    const expectedPackageReceipt = fnv1a(stableString(packageReceiptData(manifestCheck)));
    if (Number(manifest.package_receipt) !== expectedPackageReceipt) {
      throw new Error("invalid-package-receipt");
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

    const declaration = JSON.parse(String(files["declaration/declaration.json"] || "{}"));
    const projection = JSON.parse(String(files["projection/projection.json"] || "{}"));
    const overlayStack = JSON.parse(String(files["overlays/overlay-stack.json"] || "{}"));
    const resolvedRegions = JSON.parse(String(files["overlays/resolved-regions.json"] || "{}"));
    const receipts = JSON.parse(String(files["receipts/receipts.json"] || "{}"));

    if (Number(declaration.identity_receipt || 0) !== Number(manifest.identity_receipt)) {
      throw new Error("identity-receipt-mismatch");
    }
    if (Number(projection.identity_receipt || 0) !== Number(manifest.identity_receipt)) {
      throw new Error("identity-receipt-mismatch");
    }
    if (Number(projection.projection_receipt || 0) !== Number(manifest.projection_receipt)) {
      throw new Error("projection-receipt-mismatch");
    }
    if (Number(projection.view_receipt || 0) !== Number(manifest.view_receipt)) {
      throw new Error("view-receipt-mismatch");
    }
    if (Number(overlayStack.identity_receipt || 0) !== Number(manifest.identity_receipt)) {
      throw new Error("overlay-identity-receipt-mismatch");
    }
    if (Number(overlayStack.projection_receipt || 0) !== Number(manifest.projection_receipt)) {
      throw new Error("overlay-projection-receipt-mismatch");
    }
    if (Number(overlayStack.view_receipt || 0) !== Number(manifest.view_receipt)) {
      throw new Error("overlay-view-receipt-mismatch");
    }
    if (Number(overlayStack.overlay_receipt || 0) !== Number(manifest.overlay_receipt)) {
      throw new Error("overlay-receipt-mismatch");
    }
    if (Number(overlayStack.resolved_region_receipt || 0) !== Number(manifest.resolved_region_receipt)) {
      throw new Error("resolved-region-receipt-mismatch");
    }
    if (!Array.isArray(overlayStack.samples)) {
      throw new Error("invalid-overlay-stack");
    }
    if (!Array.isArray(resolvedRegions.resolved_regions)) {
      throw new Error("invalid-resolved-regions");
    }
    if (Number(receipts.identity_receipt || 0) !== Number(manifest.identity_receipt) ||
        Number(receipts.projection_receipt || 0) !== Number(manifest.projection_receipt) ||
        Number(receipts.view_receipt || 0) !== Number(manifest.view_receipt) ||
        Number(receipts.overlay_receipt || 0) !== Number(manifest.overlay_receipt) ||
        Number(receipts.resolved_region_receipt || 0) !== Number(manifest.resolved_region_receipt)) {
      throw new Error("receipt-mismatch:overlay");
    }
    if (Number(receipts.resolved_region_receipt || 0) !== fnv1a(stableString(resolvedRegions.resolved_regions))) {
      throw new Error("receipt-mismatch:resolved-regions");
    }

    const expectedSamples = manifest.sample_indices.map(function (index) {
      return streamProjection.projectStreamIndex(declaration, index, { mode: manifest.projection_mode });
    });

    if (stableString(expectedSamples) !== stableString(overlayStack.samples)) {
      throw new Error("overlay-stack-mismatch");
    }
    if (stableString(expectedSamples.map(function (sample) {
      return sample.resolved_region;
    })) !== stableString(resolvedRegions.resolved_regions)) {
      throw new Error("resolved-regions-mismatch");
    }

    return {
      ok: true,
      manifest: manifest,
      declaration: declaration,
      projection: projection,
      overlay_stack: overlayStack.samples,
      resolved_regions: resolvedRegions.resolved_regions,
      receipts: receipts
    };
  }

  function importStreamOverlayPackage(input) {
    const normalized = normalizeInput(input);
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
    exportStreamOverlayPackage: exportStreamOverlayPackage,
    importStreamOverlayPackage: importStreamOverlayPackage,
    validateManifest: validateManifest,
    readPackage: readPackage,
    writePackage: writePackage
  };
}));
