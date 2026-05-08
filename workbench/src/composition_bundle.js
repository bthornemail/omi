(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./composition_trust.js") : root.OMICompositionTrust
  );
  root.OMICompositionBundle = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (artifactIdentity, compositionTrust) {
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

  function bundleReceiptData(manifest) {
    return {
      bundle_kind: manifest.bundle_kind,
      version: manifest.version,
      composition_id: manifest.composition_id,
      composition_identity_receipt: manifest.composition_identity_receipt,
      composition_view_receipt: manifest.composition_view_receipt,
      composition_witness: manifest.composition_witness,
      review_status: manifest.review_status,
      trust_receipt: manifest.trust_receipt,
      template_count: manifest.template_count,
      relation_count: manifest.relation_count,
      required_files: manifest.required_files,
      file_receipts: manifest.file_receipts
    };
  }

  function normalizeComposition(input) {
    if (!input) {
      return null;
    }
    if (typeof input.snapshot === "function") {
      return normalizeComposition(input.snapshot());
    }
    const source = clone(input);
    return {
      composition_id: String(source.composition_id || source.id || "barcode.template.composition"),
      mode: String(source.mode || "lazy"),
      sealed_address: source.sealed_address || null,
      identity_receipt: Number(source.identity_receipt || 0),
      view_receipt: Number(source.view_receipt || 0),
      trust: source.trust || null,
      witness: Number(source.witness || 0),
      chart: source.chart || {
        template_count: Array.isArray(source.templates) ? source.templates.length : 0,
        relation_count: Array.isArray(source.relations) ? source.relations.length : 0
      },
      templates: Array.isArray(source.templates) ? source.templates.map(clone) : [],
      relations: Array.isArray(source.relations) ? source.relations.map(clone) : [],
      svg: String(source.svg || "")
    };
  }

  function bundleManifest(composition, trustStatus) {
    const identity = Number(composition.identity_receipt || 0);
    const trust = trustStatus || {
      ok: false,
      error: "missing-trust-status",
      identity_receipt: identity,
      review_status: "invalid",
      trust_receipt: 0,
      signatures: []
    };
    const reviewStatus = trust.ok ? trust.review_status : String(trust.review_status || "invalid");
    const trustReceipt = trust.ok ? trust.trust_receipt : Number(trust.trust_receipt || 0);
    const signatures = trust.ok ? trust.signatures : (Array.isArray(trust.signatures) ? trust.signatures : []);
    const manifest = {
      bundle_kind: "barcode-template-composition-bundle",
      version: 1,
      composition_id: composition.composition_id,
      composition_mode: composition.mode,
      composition_identity_receipt: identity,
      composition_view_receipt: Number(composition.view_receipt || 0),
      composition_witness: Number(composition.witness || 0),
      review_status: reviewStatus,
      trust_receipt: trustReceipt,
      trust_signatures: signatures,
      template_count: Array.isArray(composition.templates) ? composition.templates.length : 0,
      relation_count: Array.isArray(composition.relations) ? composition.relations.length : 0,
      file_receipts: {},
      required_files: [
        "composition/composition.json",
        "gallery/gallery.svg",
        "trust/trust.json",
        "README.org"
      ]
    };
    return Object.assign(manifest, {
      bundle_receipt: fnv1a(stableString({
        bundle_kind: manifest.bundle_kind,
        version: manifest.version,
        composition_id: manifest.composition_id,
        composition_identity_receipt: manifest.composition_identity_receipt,
        composition_view_receipt: manifest.composition_view_receipt,
        composition_witness: manifest.composition_witness,
        review_status: manifest.review_status,
        trust_receipt: manifest.trust_receipt,
        template_count: manifest.template_count,
        relation_count: manifest.relation_count,
        required_files: manifest.required_files
      }))
    });
  }

  function exportCompositionBundle(composition, options) {
    const normalized = normalizeComposition(composition);
    if (!normalized) {
      throw new Error("invalid-composition");
    }
    const trustBundle = options && options.trustBundle ? options.trustBundle : normalized.trust;
    const trustStatus = compositionTrust.reportTrust(normalized.identity_receipt, trustBundle);
    const trustForBundle = trustStatus.ok ? trustStatus : {
      ok: false,
      error: trustStatus.error,
      identity_receipt: normalized.identity_receipt,
      review_status: "invalid",
      signatures: [],
      trust_receipt: 0
    };
    const manifest = bundleManifest(normalized, trustForBundle);

    const files = {
      "manifest.json": stableString(manifest),
      "composition/composition.json": stableString({
        composition_id: normalized.composition_id,
        mode: normalized.mode,
        sealed_address: normalized.sealed_address,
        identity_receipt: normalized.identity_receipt,
        view_receipt: normalized.view_receipt,
        witness: normalized.witness,
        chart: normalized.chart,
        templates: normalized.templates,
        relations: normalized.relations
      }),
      "gallery/gallery.svg": normalized.svg,
      "trust/trust.json": stableString(trustForBundle),
      "README.org": [
        "#+TITLE: OMI Barcode Template Composition Bundle",
        "",
        "This bundle carries a deterministic barcode-template composition,",
        "its identity receipt, its projection gallery, and its trust seal.",
        "",
        "Trust follows identity, not projection."
      ].join("\n")
    };

    Object.keys(files).forEach(function (name) {
      if (name !== "manifest.json") {
        manifest.file_receipts[name] = fnv1a(String(files[name] || ""));
      }
    });
    manifest.bundle_receipt = fnv1a(stableString(bundleReceiptData(manifest)));
    files["manifest.json"] = stableString(manifest);

    return {
      manifest: manifest,
      files: files,
      composition: normalized,
      trust: trustStatus
    };
  }

  function readBundle(input) {
    if (!input) {
      return null;
    }
    if (input.files && typeof input.files === "object") {
      return {
        files: input.files,
        manifest: input.manifest || null
      };
    }
    if (input["manifest.json"] || input["composition/composition.json"]) {
      return {
        files: input,
        manifest: null
      };
    }
    return null;
  }

  function validateBundle(manifest, files) {
    if (!manifest || manifest.bundle_kind !== "barcode-template-composition-bundle") {
      return { ok: false, error: "invalid-manifest" };
    }
    if (!Number.isInteger(manifest.version) || manifest.version !== 1) {
      return { ok: false, error: "invalid-manifest-version" };
    }
    if (!Object.prototype.hasOwnProperty.call(files, "manifest.json")) {
      return { ok: false, error: "missing-bundle-entry:manifest.json" };
    }
    if (String(files["manifest.json"]) !== stableString(manifest)) {
      return { ok: false, error: "manifest-mismatch" };
    }
    const receiptCheck = clone(manifest);
    delete receiptCheck.bundle_receipt;
    const expectedManifestReceipt = fnv1a(stableString(bundleReceiptData(receiptCheck)));
    if (Number(manifest.bundle_receipt) !== expectedManifestReceipt) {
      return { ok: false, error: "invalid-bundle-receipt" };
    }
    if (!manifest.required_files || !Array.isArray(manifest.required_files)) {
      return { ok: false, error: "invalid-required-files" };
    }
    for (let i = 0; i < manifest.required_files.length; i += 1) {
      const name = manifest.required_files[i];
      if (!Object.prototype.hasOwnProperty.call(files, name)) {
        return { ok: false, error: "missing-bundle-entry:" + name };
      }
      const actual = fnv1a(String(files[name] || ""));
      if (Number(manifest.file_receipts[name]) !== actual) {
        return { ok: false, error: "receipt-mismatch:" + name };
      }
    }
    const composition = JSON.parse(String(files["composition/composition.json"] || "{}"));
    if (Number(composition.identity_receipt || 0) !== Number(manifest.composition_identity_receipt)) {
      return { ok: false, error: "identity-receipt-mismatch" };
    }
    if (Number(composition.view_receipt || 0) !== Number(manifest.composition_view_receipt)) {
      return { ok: false, error: "view-receipt-mismatch" };
    }
    if (Number(composition.witness || 0) !== Number(manifest.composition_witness)) {
      return { ok: false, error: "witness-mismatch" };
    }
    const trust = JSON.parse(String(files["trust/trust.json"] || "{}"));
    const trustStatus = compositionTrust.reportTrust(manifest.composition_identity_receipt, trust);
    if (!trustStatus.ok) {
      return { ok: false, error: trustStatus.error };
    }
    if (Number(trustStatus.trust_receipt) !== Number(manifest.trust_receipt)) {
      return { ok: false, error: "trust-receipt-mismatch" };
    }
    if (String(trustStatus.review_status) !== String(manifest.review_status)) {
      return { ok: false, error: "review-status-mismatch" };
    }
    return {
      ok: true,
      manifest: manifest,
      composition: composition,
      trust: trustStatus
    };
  }

  function importCompositionBundle(input) {
    const bundle = readBundle(input);
    if (!bundle) {
      throw new Error("invalid-bundle");
    }
    const manifest = bundle.manifest || JSON.parse(String(bundle.files["manifest.json"] || ""));
    const validated = validateBundle(manifest, bundle.files);
    if (!validated.ok) {
      throw new Error(validated.error);
    }
    return validated;
  }

  return {
    exportCompositionBundle: exportCompositionBundle,
    importCompositionBundle: importCompositionBundle,
    validateBundle: validateBundle,
    normalizeComposition: normalizeComposition
  };
}));
