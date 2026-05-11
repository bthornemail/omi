(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_transport_replay.js") : root.OMIAutonomousWorldTransportReplay,
    typeof require === "function" ? require("./autonomous_world_transport_compaction.js") : root.OMIAutonomousWorldTransportCompaction
  );
  root.OMIAutonomousWorldTransportRepair = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldTransportReplay,
  autonomousWorldTransportCompaction
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

  function issueReceipt(issue) {
    return fnv1a(stableString({
      target_receipt: issue.target_receipt,
      target_kind: issue.target_kind,
      reason: issue.reason,
      order: issue.order,
      authority: issue.authority
    }));
  }

  function makeIssue(targetReceipt, targetKind, reason, order) {
    const issue = {
      kind: "omi.autonomous-world.transport-repair-issue",
      target_receipt: targetReceipt === undefined ? null : targetReceipt,
      target_kind: String(targetKind || "unknown"),
      reason: String(reason || "missing-or-corrupt"),
      order: order === undefined ? null : order,
      authority: false,
      repair_issue_receipt: null
    };
    issue.repair_issue_receipt = issueReceipt(issue);
    return issue;
  }

  function detectTransportEvidenceIssues(input) {
    const log = clone(input && input.log || {});
    const compaction = input && input.compaction ? clone(input.compaction) : null;
    const issues = [];
    (log.entries || []).forEach(function (entry, index) {
      if (!entry.transport_event) {
        issues.push(makeIssue(entry.transport_event_receipt, "transport-event", "missing-event", index));
      } else if (entry.transport_event.transport_event_receipt !== entry.transport_event_receipt) {
        issues.push(makeIssue(entry.transport_event_receipt, "transport-event", "corrupt-event", index));
      }
    });
    try {
      autonomousWorldTransportReplay.verifyTransportReplayLog(log);
    } catch (err) {
      issues.push(makeIssue(log.transport_log_receipt || null, "transport-log-chain", err.message, null));
    }
    if (compaction) {
      try {
        autonomousWorldTransportCompaction.verifyTransportCompaction(compaction, log);
      } catch (err) {
        issues.push(makeIssue(compaction.compaction_receipt || null, "compaction-bundle", err.message, null));
      }
    }
    const report = {
      kind: "omi.autonomous-world.transport-repair-detection",
      issue_count: issues.length,
      issues: issues,
      authority: false,
      detection_receipt: null
    };
    report.detection_receipt = fnv1a(stableString({
      issues: issues.map(function (issue) {
        return issue.repair_issue_receipt;
      }),
      authority: report.authority
    }));
    return report;
  }

  function createRepairRequest(issueInput) {
    const issue = clone(issueInput || {});
    const request = {
      kind: "omi.autonomous-world.transport-repair-request",
      authority: false,
      target_receipt: issue.target_receipt === undefined ? null : issue.target_receipt,
      target_kind: String(issue.target_kind || "unknown"),
      reason: String(issue.reason || "missing-or-corrupt"),
      repair_issue_receipt: issue.repair_issue_receipt || null,
      repair_request_receipt: null
    };
    request.repair_request_receipt = fnv1a(stableString({
      target_receipt: request.target_receipt,
      target_kind: request.target_kind,
      reason: request.reason,
      repair_issue_receipt: request.repair_issue_receipt,
      authority: request.authority
    }));
    return request;
  }

  function evidenceReceipt(evidence) {
    if (!evidence) return null;
    return evidence.transport_event_receipt ||
      evidence.transport_log_receipt ||
      evidence.compaction_receipt ||
      fnv1a(stableString(evidence));
  }

  function createRepairPayload(requestInput, evidence, options) {
    const request = clone(requestInput || {});
    const payload = {
      kind: "omi.autonomous-world.transport-repair-payload",
      authority: false,
      admission: false,
      supplier: String(options && options.supplier || "peer.fixture.repair"),
      supplier_authority: false,
      target_receipt: request.target_receipt === undefined ? null : request.target_receipt,
      target_kind: String(request.target_kind || "unknown"),
      repair_request_receipt: request.repair_request_receipt || null,
      evidence: clone(evidence || null),
      evidence_receipt: evidenceReceipt(evidence),
      repair_payload_receipt: null
    };
    payload.repair_payload_receipt = fnv1a(stableString({
      target_receipt: payload.target_receipt,
      target_kind: payload.target_kind,
      repair_request_receipt: payload.repair_request_receipt,
      evidence_receipt: payload.evidence_receipt,
      supplier: payload.supplier,
      supplier_authority: payload.supplier_authority,
      authority: payload.authority,
      admission: payload.admission
    }));
    return payload;
  }

  function verifyRepairPayload(payloadInput) {
    const payload = clone(payloadInput || {});
    if (payload.repair_payload_receipt !== fnv1a(stableString({
      target_receipt: payload.target_receipt,
      target_kind: payload.target_kind,
      repair_request_receipt: payload.repair_request_receipt,
      evidence_receipt: payload.evidence_receipt,
      supplier: payload.supplier,
      supplier_authority: payload.supplier_authority,
      authority: payload.authority,
      admission: payload.admission
    }))) {
      throw new Error("repair-payload-receipt-mismatch");
    }
    if (payload.target_kind === "transport-event" && payload.evidence_receipt !== payload.target_receipt) {
      throw new Error("repair-payload-target-mismatch");
    }
    if (payload.target_kind === "transport-log-chain") {
      autonomousWorldTransportReplay.verifyTransportReplayLog(payload.evidence);
      if (payload.evidence_receipt !== payload.target_receipt) {
        throw new Error("repair-payload-target-mismatch");
      }
    }
    if (payload.target_kind === "compaction-bundle" && payload.evidence_receipt !== payload.target_receipt) {
      throw new Error("repair-payload-target-mismatch");
    }
    return payload;
  }

  function applyRepairPayload(targetInput, payloadInput) {
    const payload = verifyRepairPayload(payloadInput);
    const repaired = clone(targetInput || {});
    if (payload.target_kind === "transport-event") {
      const entries = repaired.entries || [];
      const index = entries.findIndex(function (entry) {
        return entry.transport_event_receipt === payload.target_receipt;
      });
      if (index < 0) {
        throw new Error("repair-target-not-found:" + payload.target_receipt);
      }
      entries[index].transport_event = clone(payload.evidence);
      autonomousWorldTransportReplay.verifyTransportReplayLog(repaired);
      return repaired;
    }
    if (payload.target_kind === "transport-log-chain") {
      return clone(payload.evidence);
    }
    if (payload.target_kind === "compaction-bundle") {
      return clone(payload.evidence);
    }
    throw new Error("unsupported-repair-target:" + payload.target_kind);
  }

  function repairAndReplay(registry, evidenceInput, payloadsInput, subscriptionInput) {
    let log = clone(evidenceInput && evidenceInput.log || {});
    let checkpoint = clone(evidenceInput && evidenceInput.checkpoint || {});
    let compaction = clone(evidenceInput && evidenceInput.compaction || {});
    const payloads = (payloadsInput || []).map(verifyRepairPayload);
    payloads.forEach(function (payload) {
      if (payload.target_kind === "transport-event" || payload.target_kind === "transport-log-chain") {
        log = applyRepairPayload(log, payload);
      } else if (payload.target_kind === "compaction-bundle") {
        compaction = applyRepairPayload(compaction, payload);
      }
    });
    const remaining = detectTransportEvidenceIssues({ log: log, compaction: compaction });
    if (remaining.issue_count) {
      throw new Error("unrepaired-evidence:" + remaining.issues.map(function (issue) {
        return issue.reason;
      }).join(","));
    }
    const replay = autonomousWorldTransportCompaction.resumeAfterCompaction(
      registry,
      log,
      compaction,
      checkpoint,
      subscriptionInput
    );
    const result = {
      kind: "omi.autonomous-world.transport-repair-result",
      repaired: true,
      verification_recomputed: true,
      repair_payload_receipts: payloads.map(function (payload) {
        return payload.repair_payload_receipt;
      }),
      accepted_snapshot_identities: replay.accepted_snapshot_identities.slice().sort(),
      replay: replay,
      authority: false,
      admission: false,
      repair_result_receipt: null
    };
    result.repair_result_receipt = fnv1a(stableString({
      repaired: result.repaired,
      verification_recomputed: result.verification_recomputed,
      repair_payload_receipts: result.repair_payload_receipts,
      accepted_snapshot_identities: result.accepted_snapshot_identities,
      replay_receipt: replay.compaction_resume_receipt,
      authority: result.authority,
      admission: result.admission
    }));
    return result;
  }

  function openRepairSnapshot(result, identity) {
    return autonomousWorldTransportCompaction.openCompactionResumeSnapshot(result.replay, identity);
  }

  function renderRepairSnapshot(result, identity, options) {
    return autonomousWorldTransportCompaction.renderCompactionResumeSnapshot(result.replay, identity, options || {});
  }

  function openRepairStatusSnapshot() {
    throw new Error("repair-status-not-admission");
  }

  return {
    detectTransportEvidenceIssues: detectTransportEvidenceIssues,
    createRepairRequest: createRepairRequest,
    createRepairPayload: createRepairPayload,
    verifyRepairPayload: verifyRepairPayload,
    applyRepairPayload: applyRepairPayload,
    repairAndReplay: repairAndReplay,
    openRepairSnapshot: openRepairSnapshot,
    renderRepairSnapshot: renderRepairSnapshot,
    openRepairStatusSnapshot: openRepairStatusSnapshot
  };
}));
