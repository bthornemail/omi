(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_transport_replay.js") : root.OMIAutonomousWorldTransportReplay,
    typeof require === "function" ? require("./autonomous_world_transport_checkpoint.js") : root.OMIAutonomousWorldTransportCheckpoint
  );
  root.OMIAutonomousWorldTransportCompaction = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldTransportReplay,
  autonomousWorldTransportCheckpoint
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

  function uniqueSorted(values) {
    const out = [];
    (values || []).forEach(function (value) {
      const id = String(value);
      if (out.indexOf(id) < 0) {
        out.push(id);
      }
    });
    return out.sort();
  }

  function compactionReceipt(bundle) {
    return fnv1a(stableString({
      compaction_id: bundle.compaction_id,
      compacted_range: bundle.compacted_range,
      transport_log_receipt: bundle.transport_log_receipt,
      log_from_receipt: bundle.log_from_receipt,
      log_to_receipt: bundle.log_to_receipt,
      checkpoint_receipt: bundle.checkpoint_receipt,
      replay_entry_receipts: bundle.replay_entry_receipts,
      transport_event_receipts: bundle.transport_event_receipts,
      accepted_snapshot_identities: bundle.accepted_snapshot_identities,
      rejected_event_receipts: bundle.rejected_event_receipts,
      retained_evidence_receipts: bundle.retained_evidence_receipts,
      authority: bundle.authority,
      admission: bundle.admission
    }));
  }

  function createTransportCompaction(logInput, replayInput, checkpointInput, options) {
    const log = autonomousWorldTransportReplay.verifyTransportReplayLog(logInput);
    const checkpoint = autonomousWorldTransportCheckpoint.verifyTransportCheckpoint(checkpointInput, log);
    const replay = clone(replayInput || {});
    const toOrder = Math.min(
      Math.max(0, Number(options && options.to_order !== undefined ? options.to_order : checkpoint.boundary_order)),
      checkpoint.boundary_order
    );
    const entries = log.entries.slice(0, toOrder + 1);
    const processing = (replay.processing || []).slice(0, toOrder + 1);
    const retained = processing.map(function (record) {
      return record.processing_receipt;
    }).filter(Boolean);
    const bundle = {
      kind: "omi.autonomous-world.transport-compaction-bundle",
      compaction_id: String(options && options.compaction_id || "compaction.transport." + toOrder),
      authority: false,
      admission: false,
      compacted_range: {
        from_order: 0,
        to_order: toOrder,
        event_count: entries.length
      },
      transport_log_receipt: log.transport_log_receipt,
      log_from_receipt: entries.length ? entries[0].replay_entry_receipt : null,
      log_to_receipt: entries.length ? entries[entries.length - 1].replay_entry_receipt : null,
      checkpoint_receipt: checkpoint.checkpoint_receipt,
      replay_entry_receipts: entries.map(function (entry) {
        return entry.replay_entry_receipt;
      }),
      transport_event_receipts: entries.map(function (entry) {
        return entry.transport_event_receipt;
      }),
      accepted_snapshot_identities: uniqueSorted(checkpoint.accepted_snapshot_identities),
      rejected_event_receipts: checkpoint.rejected_event_receipts.slice().sort(),
      retained_evidence_receipts: retained,
      compaction_receipt: null
    };
    bundle.compaction_receipt = compactionReceipt(bundle);
    return bundle;
  }

  function verifyTransportCompaction(bundleInput, logInput) {
    const bundle = clone(bundleInput || {});
    if (bundle.compaction_receipt !== compactionReceipt(bundle)) {
      throw new Error("compaction-receipt-mismatch");
    }
    if (logInput) {
      const log = autonomousWorldTransportReplay.verifyTransportReplayLog(logInput);
      const toOrder = Number(bundle.compacted_range && bundle.compacted_range.to_order);
      if (!Number.isInteger(toOrder) || toOrder < 0 || toOrder >= log.entries.length) {
        throw new Error("compaction-range-out-of-log");
      }
      const entries = log.entries.slice(0, toOrder + 1);
      const entryReceipts = entries.map(function (entry) {
        return entry.replay_entry_receipt;
      });
      const eventReceipts = entries.map(function (entry) {
        return entry.transport_event_receipt;
      });
      if (bundle.transport_log_receipt !== log.transport_log_receipt) {
        throw new Error("compaction-log-receipt-mismatch");
      }
      if (bundle.log_from_receipt !== entries[0].replay_entry_receipt) {
        throw new Error("compaction-log-head-mismatch");
      }
      if (bundle.log_to_receipt !== entries[entries.length - 1].replay_entry_receipt) {
        throw new Error("compaction-log-tail-mismatch");
      }
      if (stableString(bundle.replay_entry_receipts) !== stableString(entryReceipts)) {
        throw new Error("compaction-entry-receipts-mismatch");
      }
      if (stableString(bundle.transport_event_receipts) !== stableString(eventReceipts)) {
        throw new Error("compaction-event-receipts-mismatch");
      }
    }
    return bundle;
  }

  function resumeAfterCompaction(registry, logInput, bundleInput, checkpointInput, subscriptionInput) {
    const log = autonomousWorldTransportReplay.verifyTransportReplayLog(logInput);
    const bundle = verifyTransportCompaction(bundleInput, log);
    const checkpoint = autonomousWorldTransportCheckpoint.verifyTransportCheckpoint(checkpointInput, log);
    if (bundle.checkpoint_receipt !== checkpoint.checkpoint_receipt) {
      throw new Error("compaction-checkpoint-mismatch");
    }
    if (bundle.log_to_receipt !== checkpoint.log_to_receipt) {
      throw new Error("compaction-boundary-mismatch");
    }
    const resume = autonomousWorldTransportCheckpoint.resumeTransportReplay(
      registry,
      log,
      checkpoint,
      subscriptionInput
    );
    const result = {
      kind: "omi.autonomous-world.transport-compaction-resume",
      compaction_receipt: bundle.compaction_receipt,
      checkpoint_receipt: checkpoint.checkpoint_receipt,
      resume_receipt: resume.resume_receipt,
      verification_recomputed: true,
      compaction_used: true,
      accepted_snapshot_identities: resume.accepted_snapshot_identities.slice().sort(),
      rejected_event_receipts: resume.rejected_event_receipts.slice().sort(),
      processing: resume.processing,
      authority: false,
      admission: false,
      compaction_resume_receipt: null
    };
    result.compaction_resume_receipt = fnv1a(stableString({
      compaction_receipt: result.compaction_receipt,
      checkpoint_receipt: result.checkpoint_receipt,
      resume_receipt: result.resume_receipt,
      verification_recomputed: result.verification_recomputed,
      accepted_snapshot_identities: result.accepted_snapshot_identities,
      rejected_event_receipts: result.rejected_event_receipts,
      authority: result.authority,
      admission: result.admission
    }));
    return result;
  }

  function openCompactionSnapshot() {
    throw new Error("compaction-not-admission");
  }

  function openCompactionResumeSnapshot(resume, identity) {
    return autonomousWorldTransportCheckpoint.openResumedSnapshot(resume, identity);
  }

  function renderCompactionResumeSnapshot(resume, identity, options) {
    return autonomousWorldTransportCheckpoint.renderResumedSnapshot(resume, identity, options || {});
  }

  return {
    createTransportCompaction: createTransportCompaction,
    verifyTransportCompaction: verifyTransportCompaction,
    resumeAfterCompaction: resumeAfterCompaction,
    openCompactionSnapshot: openCompactionSnapshot,
    openCompactionResumeSnapshot: openCompactionResumeSnapshot,
    renderCompactionResumeSnapshot: renderCompactionResumeSnapshot
  };
}));
