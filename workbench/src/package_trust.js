(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity
  );
  root.OMIPackageTrust = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (artifactIdentity) {
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

  function normalizeStatus(status) {
    const text = String(status || "unsigned").toLowerCase();
    if (text === "approved" || text === "reviewed" || text === "signed") {
      return "approved";
    }
    if (text === "rejected" || text === "blocked") {
      return "rejected";
    }
    if (text === "pending") {
      return "pending";
    }
    return "unsigned";
  }

  function signerEnvelope(packageReceipt, signerFixture, options) {
    const fixture = signerFixture || {};
    const algorithm = String(fixture.signature_algorithm || "fnv1a-package-attestation");
    const signerId = String(fixture.signer_id || "fixture-signer");
    const signerScope = String(fixture.signer_scope || "public.global");
    const signedAtTick = Number.isInteger(fixture.signed_at_tick) ? fixture.signed_at_tick : 0;
    const reviewStatus = normalizeStatus(fixture.review_status);
    const packageReceiptNumber = Number(packageReceipt);
    if (!Number.isInteger(packageReceiptNumber) || packageReceiptNumber <= 0) {
      throw new Error("invalid-package-receipt");
    }
    const signatureValue = fnv1a(stableString({
      package_receipt: packageReceiptNumber,
      signer_id: signerId,
      signer_scope: signerScope,
      signed_at_tick: signedAtTick,
      signature_algorithm: algorithm,
      review_status: reviewStatus
    }));
    const record = {
      package_receipt: packageReceiptNumber,
      signer_id: signerId,
      signer_scope: signerScope,
      signed_at_tick: signedAtTick,
      signature_algorithm: algorithm,
      signature_value: signatureValue,
      review_status: reviewStatus
    };
    record.trust_receipt = fnv1a(stableString(record));
    return record;
  }

  function appendTrustRecord(bundle, record) {
    const next = bundle ? clone(bundle) : {
      package_receipt: 0,
      signatures: [],
      trust_receipt: 0,
      review_status: "unsigned"
    };
    if (!next.signatures) {
      next.signatures = [];
    }
    next.signatures.push(clone(record));
    next.package_receipt = Number(record.package_receipt || next.package_receipt || 0);
    next.review_status = next.signatures.map(function (item) {
      return normalizeStatus(item.review_status);
    }).includes("approved") ? "approved" : next.signatures.every(function (item) {
      return normalizeStatus(item.review_status) === "unsigned";
    }) ? "unsigned" : "pending";
    next.trust_receipt = fnv1a(stableString({
      package_receipt: next.package_receipt,
      signatures: next.signatures,
      review_status: next.review_status
    }));
    return next;
  }

  function verifyTrustRecord(packageReceipt, record) {
    if (!record) {
      return { ok: false, error: "missing-trust-record" };
    }
    if (Number(record.package_receipt) !== Number(packageReceipt)) {
      return { ok: false, error: "package-receipt-mismatch" };
    }
    const expected = signerEnvelope(packageReceipt, record, {});
    if (Number(expected.signature_value) !== Number(record.signature_value)) {
      return { ok: false, error: "invalid-signature-value" };
    }
    if (Number(expected.trust_receipt) !== Number(record.trust_receipt)) {
      return { ok: false, error: "invalid-trust-receipt" };
    }
    return { ok: true, record: clone(record) };
  }

  function buildTrustBundle(packageReceipt, signerFixtures) {
    const fixtures = Array.isArray(signerFixtures) ? signerFixtures : [];
    const bundle = {
      package_receipt: Number(packageReceipt || 0),
      signatures: [],
      review_status: "unsigned",
      trust_receipt: 0
    };
    fixtures.forEach(function (fixture) {
      const record = signerEnvelope(packageReceipt, fixture);
      bundle.signatures.push(record);
    });
    if (bundle.signatures.length > 0) {
      bundle.review_status = bundle.signatures.map(function (item) {
        return normalizeStatus(item.review_status);
      }).includes("approved") ? "approved" : "pending";
    }
    bundle.trust_receipt = fnv1a(stableString({
      package_receipt: bundle.package_receipt,
      signatures: bundle.signatures,
      review_status: bundle.review_status
    }));
    return bundle;
  }

  function validateTrustBundle(packageReceipt, bundle) {
    if (!bundle) {
      const unsigned = {
        package_receipt: Number(packageReceipt || 0),
        signatures: [],
        review_status: "unsigned",
        trust_receipt: 0
      };
      return {
        ok: true,
        bundle: unsigned
      };
    }
    if (Number(bundle.package_receipt) !== Number(packageReceipt)) {
      return { ok: false, error: "package-receipt-mismatch" };
    }
    if (!Array.isArray(bundle.signatures)) {
      return { ok: false, error: "invalid-trust-bundle" };
    }
    const normalized = {
      package_receipt: Number(bundle.package_receipt),
      signatures: [],
      review_status: normalizeStatus(bundle.review_status),
      trust_receipt: Number(bundle.trust_receipt || 0)
    };
    for (let i = 0; i < bundle.signatures.length; i += 1) {
      const result = verifyTrustRecord(packageReceipt, bundle.signatures[i]);
      if (!result.ok) {
        return result;
      }
      normalized.signatures.push(result.record);
    }
    if (normalized.signatures.length === 0) {
      normalized.review_status = "unsigned";
      normalized.trust_receipt = fnv1a(stableString({
        package_receipt: normalized.package_receipt,
        signatures: normalized.signatures,
        review_status: normalized.review_status
      }));
      return { ok: true, bundle: normalized };
    }
    const expected = fnv1a(stableString({
      package_receipt: normalized.package_receipt,
      signatures: normalized.signatures,
      review_status: normalized.review_status
    }));
    if (Number(normalized.trust_receipt) !== expected) {
      return { ok: false, error: "invalid-trust-receipt" };
    }
    return { ok: true, bundle: normalized };
  }

  function reportTrust(packageReceipt, trustBundle) {
    const validated = validateTrustBundle(packageReceipt, trustBundle);
    if (!validated.ok) {
      return {
        ok: false,
        error: validated.error
      };
    }
    return {
      ok: true,
      package_receipt: Number(packageReceipt || 0),
      review_status: validated.bundle.review_status,
      signatures: validated.bundle.signatures,
      trust_receipt: validated.bundle.trust_receipt
    };
  }

  return {
    signerEnvelope: signerEnvelope,
    appendTrustRecord: appendTrustRecord,
    verifyTrustRecord: verifyTrustRecord,
    buildTrustBundle: buildTrustBundle,
    validateTrustBundle: validateTrustBundle,
    reportTrust: reportTrust,
    normalizeStatus: normalizeStatus
  };
}));
