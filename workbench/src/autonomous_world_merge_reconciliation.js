(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_browser.js") : root.OMIAutonomousWorldBrowser,
    typeof require === "function" ? require("./autonomous_world_live_renderer.js") : root.OMIAutonomousWorldLiveRenderer,
    typeof require === "function" ? require("./autonomous_world_version_history.js") : root.OMIAutonomousWorldVersionHistory,
    typeof require === "function" ? require("./model_parser.js") : root.OMIModelParser,
    typeof require === "function" ? require("./composer_shell.js") : root.OMIComposerShell,
    typeof require === "function" ? require("./raw_binary_chunk_index.js") : root.OMIRawBinaryChunkIndex,
    typeof require === "function" ? require("./universal_closure_coding.js") : root.OMIUniversalClosureCoding,
    typeof require === "function" ? require("./spom_adapter.js") : root.OMISPOMAdapter
  );
  root.OMIAutonomousWorldMergeReconciliation = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldBrowser,
  autonomousWorldLiveRenderer,
  autonomousWorldVersionHistory,
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

  function normalizeSnapshot(input) {
    if (!input || !input.admission || !input.report) {
      throw new Error("invalid-world-snapshot");
    }
    return input;
  }

  function normalizeBrowser(input) {
    return autonomousWorldBrowser.openWorld(input);
  }

  function safeId(value) {
    return String(value || "merge")
      .replace(/[^A-Za-z0-9_.-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "merge";
  }

  function groupRecords(document, groupId) {
    const group = document.groups.find(function (entry) {
      return entry.id === groupId;
    });
    return group ? group.records : [];
  }

  function unitMap(record) {
    const out = {};
    record.units.forEach(function (unit) {
      out[unit.key] = unit.value;
    });
    return out;
  }

  function admittedOverlays(snapshot) {
    const browser = normalizeBrowser(snapshot);
    return groupRecords(browser.document, "admitted-overlays").map(function (record) {
      const values = unitMap(record);
      return {
        record_id: record.id,
        target_path: values.target_path || "",
        target_kind: values.target_kind || "",
        kind: values.kind || "",
        body: values.body || "",
        overlay_receipt: values.overlay_receipt || "",
        candidate_edit_receipt: values.candidate_edit_receipt || "",
        source_identity_receipt: snapshot.admission.identity_receipt
      };
    });
  }

  function lineageReceipt(base, left, right) {
    return fnv1a(stableString({
      base_identity_receipt: base.admission.identity_receipt,
      left_identity_receipt: left.admission.identity_receipt,
      right_identity_receipt: right.admission.identity_receipt
    }));
  }

  function conflictRecord(base, leftOverlay, rightOverlay) {
    const record = {
      kind: "autonomous-world-merge-conflict",
      target_path: leftOverlay.target_path,
      left_overlay_receipt: leftOverlay.overlay_receipt,
      right_overlay_receipt: rightOverlay.overlay_receipt,
      left_candidate_edit_receipt: leftOverlay.candidate_edit_receipt,
      right_candidate_edit_receipt: rightOverlay.candidate_edit_receipt,
      authority: false,
      conflict_receipt: null
    };
    record.conflict_receipt = fnv1a(stableString({
      base_identity_receipt: base.admission.identity_receipt,
      target_path: record.target_path,
      left_overlay_receipt: record.left_overlay_receipt,
      right_overlay_receipt: record.right_overlay_receipt,
      left_candidate_edit_receipt: record.left_candidate_edit_receipt,
      right_candidate_edit_receipt: record.right_candidate_edit_receipt
    }));
    return record;
  }

  function classifyConflicts(base, left, right) {
    const leftByTarget = {};
    admittedOverlays(left).forEach(function (overlay) {
      leftByTarget[overlay.target_path] = overlay;
    });
    return admittedOverlays(right).reduce(function (conflicts, rightOverlay) {
      const leftOverlay = leftByTarget[rightOverlay.target_path];
      if (!leftOverlay) {
        return conflicts;
      }
      if (
        leftOverlay.overlay_receipt !== rightOverlay.overlay_receipt ||
        leftOverlay.body !== rightOverlay.body ||
        leftOverlay.kind !== rightOverlay.kind
      ) {
        conflicts.push(conflictRecord(base, leftOverlay, rightOverlay));
      }
      return conflicts;
    }, []).sort(function (a, b) {
      return String(a.conflict_receipt).localeCompare(String(b.conflict_receipt));
    });
  }

  function createMergeCandidate(baseInput, leftInput, rightInput, options) {
    const base = normalizeSnapshot(baseInput);
    const left = normalizeSnapshot(leftInput);
    const right = normalizeSnapshot(rightInput);
    const conflicts = classifyConflicts(base, left, right);
    const candidate = {
      kind: "autonomous-world-merge-candidate",
      candidate_id: String(options && options.candidate_id || [
        "merge",
        safeId(base.admission.identity_receipt),
        safeId(left.admission.identity_receipt),
        safeId(right.admission.identity_receipt)
      ].join(".")),
      base_identity_receipt: base.admission.identity_receipt,
      left_identity_receipt: left.admission.identity_receipt,
      right_identity_receipt: right.admission.identity_receipt,
      lineage_receipt: lineageReceipt(base, left, right),
      left_history_edge_receipt: left.report.history_edge_receipt || null,
      right_history_edge_receipt: right.report.history_edge_receipt || null,
      conflicts: conflicts,
      conflict_receipts: conflicts.map(function (conflict) {
        return conflict.conflict_receipt;
      }),
      conflict_count: conflicts.length,
      admissible: conflicts.length === 0,
      authority: false,
      admitted_history: false,
      merge_candidate_receipt: null
    };
    candidate.merge_candidate_receipt = fnv1a(stableString({
      candidate_id: candidate.candidate_id,
      base_identity_receipt: candidate.base_identity_receipt,
      left_identity_receipt: candidate.left_identity_receipt,
      right_identity_receipt: candidate.right_identity_receipt,
      conflict_receipts: candidate.conflict_receipts
    }));
    return candidate;
  }

  function rejectMerge(baseInput, leftInput, rightInput, candidateInput, reason) {
    const base = normalizeSnapshot(baseInput);
    const left = normalizeSnapshot(leftInput);
    const right = normalizeSnapshot(rightInput);
    const candidate = candidateInput && candidateInput.merge_candidate_receipt
      ? candidateInput
      : createMergeCandidate(base, left, right, candidateInput);
    const report = {
      kind: "autonomous-world-merge-reconciliation-report",
      decision: "reject",
      reason: String(reason || "merge-not-admitted"),
      base_identity_receipt: base.admission.identity_receipt,
      left_identity_receipt: left.admission.identity_receipt,
      right_identity_receipt: right.admission.identity_receipt,
      merge_candidate_receipt: candidate.merge_candidate_receipt,
      conflict_receipts: candidate.conflict_receipts.slice(),
      admission_decision_receipt: null,
      new_world_identity_receipt: null,
      merged_world_identity_receipt: null,
      authority: false,
      mutation: false
    };
    report.admission_decision_receipt = fnv1a(stableString({
      decision: report.decision,
      reason: report.reason,
      base_identity_receipt: report.base_identity_receipt,
      left_identity_receipt: report.left_identity_receipt,
      right_identity_receipt: report.right_identity_receipt,
      merge_candidate_receipt: report.merge_candidate_receipt,
      conflict_receipts: report.conflict_receipts
    }));
    return {
      candidate: candidate,
      report: report,
      left_identity_receipt: left.admission.identity_receipt,
      right_identity_receipt: right.admission.identity_receipt,
      admitted: false
    };
  }

  function mergeDeclarationBlock(candidate) {
    return [
      "",
      ";; ============================================================",
      ";; OMI PHASE 105 MERGE RECONCILIATION SNAPSHOT",
      ";; Candidate: " + candidate.candidate_id,
      ";; Authority: admitted declaration + receipts, not merge proposal",
      ";; ============================================================",
      "((GS . admitted-merges)",
      "  ((RS . " + candidate.candidate_id + ")",
      "    ((US . base_identity_receipt) . " + candidate.base_identity_receipt + ")",
      "    ((US . left_identity_receipt) . " + candidate.left_identity_receipt + ")",
      "    ((US . right_identity_receipt) . " + candidate.right_identity_receipt + ")",
      "    ((US . lineage_receipt) . " + candidate.lineage_receipt + ")",
      "    ((US . merge_candidate_receipt) . " + candidate.merge_candidate_receipt + ")",
      "    ((US . conflict_count) . " + candidate.conflict_count + ")",
      "    ((US . conflict_receipts) . " + (candidate.conflict_receipts.join(",") || "none") + ")))"
    ].join("\n");
  }

  function snapshotIdentity(source, document, candidate) {
    return fnv1a(stableString({
      source: source,
      counts: document.counts,
      graph: document.graph,
      base_identity_receipt: candidate.base_identity_receipt,
      left_identity_receipt: candidate.left_identity_receipt,
      right_identity_receipt: candidate.right_identity_receipt,
      merge_candidate_receipt: candidate.merge_candidate_receipt
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
      index_id: document.id + ".phase105.package.raw",
      omi_path: document.id + "/phase105/package",
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

  function admitMerge(baseInput, leftInput, rightInput, candidateInput, options) {
    const base = normalizeSnapshot(baseInput);
    const left = normalizeSnapshot(leftInput);
    const right = normalizeSnapshot(rightInput);
    const candidate = candidateInput && candidateInput.merge_candidate_receipt
      ? candidateInput
      : createMergeCandidate(base, left, right, candidateInput);
    if (!candidate.admissible && !(options && options.allow_conflicts)) {
      throw new Error("merge-conflicts-require-explicit-admission");
    }
    const source = left.admission.source + mergeDeclarationBlock(candidate);
    const document = modelParser.parseDocument(source);
    const identityReceipt = snapshotIdentity(source, document, candidate);
    const artifacts = buildAdmissionArtifacts(source, document, identityReceipt, options);
    const mergeOverlayReceipt = fnv1a(stableString({
      kind: "merge-reconciliation-overlay",
      base_identity_receipt: candidate.base_identity_receipt,
      left_identity_receipt: candidate.left_identity_receipt,
      right_identity_receipt: candidate.right_identity_receipt,
      merge_candidate_receipt: candidate.merge_candidate_receipt
    }));
    const admissionDecisionReceipt = fnv1a(stableString({
      decision: "admit",
      base_identity_receipt: candidate.base_identity_receipt,
      left_identity_receipt: candidate.left_identity_receipt,
      right_identity_receipt: candidate.right_identity_receipt,
      merge_candidate_receipt: candidate.merge_candidate_receipt,
      conflict_receipts: candidate.conflict_receipts,
      new_world_identity_receipt: identityReceipt
    }));
    const report = {
      kind: "autonomous-world-merge-reconciliation-report",
      decision: "admit",
      original_world_identity_receipt: candidate.base_identity_receipt,
      old_world_identity_receipt: candidate.base_identity_receipt,
      base_identity_receipt: candidate.base_identity_receipt,
      left_identity_receipt: candidate.left_identity_receipt,
      right_identity_receipt: candidate.right_identity_receipt,
      merge_overlay_receipt: mergeOverlayReceipt,
      overlay_receipt: mergeOverlayReceipt,
      merge_candidate_receipt: candidate.merge_candidate_receipt,
      candidate_edit_receipt: candidate.merge_candidate_receipt,
      conflict_receipts: candidate.conflict_receipts.slice(),
      admission_decision_receipt: admissionDecisionReceipt,
      new_world_identity_receipt: identityReceipt,
      merged_world_identity_receipt: identityReceipt,
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
        merge_candidate_authority: false,
        conflict_record_authority: false,
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
        base_identity_receipt: candidate.base_identity_receipt,
        left_identity_receipt: candidate.left_identity_receipt,
        right_identity_receipt: candidate.right_identity_receipt,
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

  function openMerged(merged) {
    return autonomousWorldBrowser.openWorld({
      admission: merged.admission,
      triangulation: merged.triangulation,
      report: merged.report
    });
  }

  function renderMerged(merged, options) {
    return autonomousWorldLiveRenderer.createRenderPlan(openMerged(merged), options || {});
  }

  function linkMergedHistory(graph, merged) {
    return autonomousWorldVersionHistory.addAdmission(graph, merged);
  }

  return {
    createMergeCandidate: createMergeCandidate,
    rejectMerge: rejectMerge,
    admitMerge: admitMerge,
    openMerged: openMerged,
    renderMerged: renderMerged,
    linkMergedHistory: linkMergedHistory
  };
}));
