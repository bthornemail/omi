(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_browser.js") : root.OMIAutonomousWorldBrowser,
    typeof require === "function" ? require("./autonomous_world_live_renderer.js") : root.OMIAutonomousWorldLiveRenderer,
    typeof require === "function" ? require("./autonomous_world_interjection_overlay.js") : root.OMIAutonomousWorldInterjectionOverlay,
    typeof require === "function" ? require("./model_parser.js") : root.OMIModelParser,
    typeof require === "function" ? require("./composer_shell.js") : root.OMIComposerShell,
    typeof require === "function" ? require("./raw_binary_chunk_index.js") : root.OMIRawBinaryChunkIndex,
    typeof require === "function" ? require("./universal_closure_coding.js") : root.OMIUniversalClosureCoding,
    typeof require === "function" ? require("./spom_adapter.js") : root.OMISPOMAdapter
  );
  root.OMIAutonomousWorldOverlayAdmission = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldBrowser,
  autonomousWorldLiveRenderer,
  autonomousWorldInterjectionOverlay,
  modelParser,
  composerShell,
  rawBinaryChunkIndex,
  closureCoding,
  spomAdapter
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

  function normalizeBrowser(input) {
    if (input && input.kind === "autonomous-world-browser") {
      return input;
    }
    return autonomousWorldBrowser.openWorld(input);
  }

  function normalizeOverlay(browser, overlay) {
    if (overlay && overlay.overlay_receipt) {
      return overlay;
    }
    return autonomousWorldInterjectionOverlay.createOverlay(browser, overlay);
  }

  function safeId(value) {
    return String(value || "candidate")
      .replace(/[^A-Za-z0-9_.-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "candidate";
  }

  function createCandidateEdit(input, overlayInput, options) {
    const browser = normalizeBrowser(input);
    const overlay = normalizeOverlay(browser, overlayInput);
    const candidate = {
      kind: "autonomous-world-candidate-edit",
      candidate_id: String(options && options.candidate_id || "candidate." + safeId(overlay.overlay_id)),
      action: String(options && options.action || "admit-interjection-overlay"),
      overlay: clone(overlay),
      original_world_id: browser.document.id,
      original_world_identity_receipt: browser.identity_receipt,
      authority: false,
      admitted_history: false,
      candidate_edit_receipt: null
    };
    candidate.candidate_edit_receipt = fnv1a(stableString({
      candidate_id: candidate.candidate_id,
      action: candidate.action,
      overlay_receipt: overlay.overlay_receipt,
      original_world_id: candidate.original_world_id,
      original_world_identity_receipt: candidate.original_world_identity_receipt
    }));
    return candidate;
  }

  function overlayDeclarationBlock(candidate) {
    const overlay = candidate.overlay;
    return [
      "",
      ";; ============================================================",
      ";; OMI PHASE 103 OVERLAY ADMISSION SNAPSHOT",
      ";; Candidate: " + candidate.candidate_id,
      ";; Overlay: " + overlay.overlay_id,
      ";; Authority: admitted declaration + receipts, not overlay projection",
      ";; ============================================================",
      "((GS . admitted-overlays)",
      "  ((RS . " + candidate.candidate_id + ")",
      "    ((US . overlay_id) . " + overlay.overlay_id + ")",
      "    ((US . target_path) . " + overlay.target_path + ")",
      "    ((US . target_kind) . " + overlay.target_kind + ")",
      "    ((US . kind) . " + overlay.kind + ")",
      "    ((US . modality) . " + overlay.modality + ")",
      "    ((US . observer) . " + overlay.observer + ")",
      "    ((US . branch) . " + overlay.branch + ")",
      "    ((US . body) . " + overlay.body.replace(/\s+/g, "_") + ")",
      "    ((US . overlay_receipt) . " + overlay.overlay_receipt + ")",
      "    ((US . candidate_edit_receipt) . " + candidate.candidate_edit_receipt + ")))"
    ].join("\n");
  }

  function snapshotIdentity(source, document, originalIdentity) {
    return fnv1a(stableString({
      source: source,
      counts: document.counts,
      graph: document.graph,
      original_world_identity_receipt: originalIdentity
    }));
  }

  function buildAdmissionArtifacts(source, document, identityReceipt, options) {
    const composer = composerShell.createComposer(source, {
      sceneId: document.id
    });
    const pkg = composerShell.exportPackage(composer);
    const importedPackage = composerShell.importPackage(pkg);
    const serializedPackage = stableString({
      manifest: pkg.manifest,
      files: pkg.files
    });
    const rawIndex = rawBinaryChunkIndex.createRawBinaryChunkIndex({
      index_id: document.id + ".phase103.package.raw",
      omi_path: document.id + "/phase103/package",
      scope: "public.global",
      identity_anchor: document.id,
      block_size: options && options.block_size ? options.block_size : 64,
      bytes: serializedPackage
    });
    const closureCharacter = closureCoding.encodeClosure({
      closure_law: "unary",
      payload: document.id + ":" + identityReceipt,
      boundary: "self-delimiting",
      cons_orientation: "car-cdr",
      carrier: "character"
    });
    const closureBinary64 = closureCoding.encodeClosure({
      closure_law: "unary",
      payload: document.id + ":" + identityReceipt,
      boundary: "self-delimiting",
      cons_orientation: "car-cdr",
      carrier: "binary64"
    });
    return {
      composer: composer,
      package: pkg,
      imported_package: importedPackage,
      raw_binary: rawIndex,
      closure: {
        character: closureCharacter,
        binary64: closureBinary64
      },
      triangulation: spomAdapter.triangulateDocument(document, { mode: "lazy" })
    };
  }

  function rejectCandidate(input, candidateInput, reason) {
    const browser = normalizeBrowser(input);
    const candidate = candidateInput && candidateInput.candidate_edit_receipt
      ? candidateInput
      : createCandidateEdit(browser, candidateInput);
    const report = {
      kind: "autonomous-world-overlay-admission-report",
      decision: "reject",
      reason: String(reason || "not-admitted"),
      original_world_id: browser.document.id,
      original_world_identity_receipt: browser.identity_receipt,
      overlay_receipt: candidate.overlay.overlay_receipt,
      candidate_edit_receipt: candidate.candidate_edit_receipt,
      admission_decision_receipt: null,
      new_world_identity_receipt: null,
      authority: false,
      mutation: false
    };
    report.admission_decision_receipt = fnv1a(stableString({
      decision: report.decision,
      reason: report.reason,
      original_world_identity_receipt: report.original_world_identity_receipt,
      overlay_receipt: report.overlay_receipt,
      candidate_edit_receipt: report.candidate_edit_receipt
    }));
    return {
      candidate: candidate,
      report: report,
      world_identity_receipt: browser.identity_receipt,
      admitted: false
    };
  }

  function admitCandidate(input, candidateInput, options) {
    const browser = normalizeBrowser(input);
    const candidate = candidateInput && candidateInput.candidate_edit_receipt
      ? candidateInput
      : createCandidateEdit(browser, candidateInput, options);
    const source = browser.build.admission.source + overlayDeclarationBlock(candidate);
    const document = modelParser.parseDocument(source);
    const identityReceipt = snapshotIdentity(source, document, browser.identity_receipt);
    const artifacts = buildAdmissionArtifacts(source, document, identityReceipt, options);
    const admissionDecisionReceipt = fnv1a(stableString({
      decision: "admit",
      original_world_identity_receipt: browser.identity_receipt,
      overlay_receipt: candidate.overlay.overlay_receipt,
      candidate_edit_receipt: candidate.candidate_edit_receipt,
      new_world_identity_receipt: identityReceipt
    }));
    const report = {
      kind: "autonomous-world-overlay-admission-report",
      decision: "admit",
      original_world_id: browser.document.id,
      original_world_identity_receipt: browser.identity_receipt,
      old_world_identity_receipt: browser.identity_receipt,
      overlay_receipt: candidate.overlay.overlay_receipt,
      candidate_edit_receipt: candidate.candidate_edit_receipt,
      admission_decision_receipt: admissionDecisionReceipt,
      new_world_identity_receipt: identityReceipt,
      package: {
        manifest_receipt: artifacts.package.manifest.manifest_receipt,
        imported_manifest_receipt: artifacts.imported_package.manifest.manifest_receipt,
        scene_root_receipt: artifacts.package.scene_root_receipt
      },
      raw_binary: {
        identity_receipt: artifacts.raw_binary.identity_receipt,
        index_receipt: artifacts.raw_binary.index_receipt,
        chunk_count: artifacts.raw_binary.chunk_count
      },
      closure: {
        character_identity_receipt: artifacts.closure.character.identity_receipt,
        binary64_identity_receipt: artifacts.closure.binary64.identity_receipt,
        character_projection_receipt: artifacts.closure.character.projection_receipt,
        binary64_projection_receipt: artifacts.closure.binary64.projection_receipt
      },
      authority: {
        overlay_authority: false,
        candidate_authority: false,
        package_authority: false,
        raw_binary_authority: false,
        closure_carrier_authority: false,
        admitted_declaration_and_receipts_authority: true
      }
    };
    report.report_receipt = fnv1a(stableString(report));
    return {
      candidate: candidate,
      admission: {
        authority: "declaration+receipts",
        source: source,
        document: document,
        identity_receipt: identityReceipt,
        admitted: true,
        original_world_identity_receipt: browser.identity_receipt,
        admission_decision_receipt: admissionDecisionReceipt
      },
      package: artifacts.package,
      imported_package: artifacts.imported_package,
      raw_binary: artifacts.raw_binary,
      closure: artifacts.closure,
      triangulation: artifacts.triangulation,
      report: report
    };
  }

  function openAdmitted(admitted) {
    return autonomousWorldBrowser.openWorld({
      admission: admitted.admission,
      triangulation: admitted.triangulation,
      report: admitted.report
    });
  }

  function renderAdmitted(admitted, options) {
    return autonomousWorldLiveRenderer.createRenderPlan(openAdmitted(admitted), options || {});
  }

  return {
    createCandidateEdit: createCandidateEdit,
    rejectCandidate: rejectCandidate,
    admitCandidate: admitCandidate,
    openAdmitted: openAdmitted,
    renderAdmitted: renderAdmitted
  };
}));
