(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_transport_replay.js") : root.OMIAutonomousWorldTransportReplay
  );
  root.OMIAutonomousWorldTransportCheckpoint = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldTransportReplay
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

  function checkpointReceipt(checkpoint) {
    return fnv1a(stableString({
      checkpoint_id: checkpoint.checkpoint_id,
      boundary_order: checkpoint.boundary_order,
      log_from_receipt: checkpoint.log_from_receipt,
      log_to_receipt: checkpoint.log_to_receipt,
      accepted_snapshot_identities: checkpoint.accepted_snapshot_identities,
      rejected_event_receipts: checkpoint.rejected_event_receipts,
      replay_processing_receipts: checkpoint.replay_processing_receipts,
      authority: checkpoint.authority,
      admission: checkpoint.admission
    }));
  }

  function createTransportCheckpoint(logInput, replayInput, options) {
    const log = autonomousWorldTransportReplay.verifyTransportReplayLog(logInput);
    const replay = clone(replayInput || {});
    const boundaryOrder = Math.min(
      Math.max(0, Number(options && options.boundary_order !== undefined ? options.boundary_order : log.entries.length - 1)),
      Math.max(0, log.entries.length - 1)
    );
    const coveredEntries = log.entries.slice(0, boundaryOrder + 1);
    const coveredProcessing = (replay.processing || []).slice(0, boundaryOrder + 1);
    const accepted = [];
    const rejected = [];
    coveredProcessing.forEach(function (processing, index) {
      (processing.accepted_snapshot_identities || []).forEach(function (identity) {
        accepted.push(identity);
      });
      if (!processing.exchange || processing.exchange.verification_status !== "accepted") {
        rejected.push(coveredEntries[index] && coveredEntries[index].transport_event_receipt);
      }
    });
    const checkpoint = {
      kind: "omi.autonomous-world.transport-checkpoint",
      checkpoint_id: String(options && options.checkpoint_id || "checkpoint.transport." + boundaryOrder),
      authority: false,
      admission: false,
      boundary_order: boundaryOrder,
      log_from_receipt: coveredEntries.length ? coveredEntries[0].replay_entry_receipt : null,
      log_to_receipt: coveredEntries.length ? coveredEntries[coveredEntries.length - 1].replay_entry_receipt : null,
      accepted_snapshot_identities: uniqueSorted(accepted),
      rejected_event_receipts: rejected.filter(Boolean).sort(),
      replay_processing_receipts: coveredProcessing.map(function (processing) {
        return processing.processing_receipt;
      }),
      checkpoint_receipt: null
    };
    checkpoint.checkpoint_receipt = checkpointReceipt(checkpoint);
    return checkpoint;
  }

  function verifyTransportCheckpoint(checkpointInput, logInput) {
    const checkpoint = clone(checkpointInput || {});
    const log = autonomousWorldTransportReplay.verifyTransportReplayLog(logInput);
    const boundaryOrder = Number(checkpoint.boundary_order);
    if (!Number.isInteger(boundaryOrder) || boundaryOrder < 0 || boundaryOrder >= log.entries.length) {
      throw new Error("checkpoint-boundary-out-of-range");
    }
    const fromReceipt = log.entries[0].replay_entry_receipt;
    const toReceipt = log.entries[boundaryOrder].replay_entry_receipt;
    if (checkpoint.log_from_receipt !== fromReceipt) {
      throw new Error("checkpoint-log-head-mismatch");
    }
    if (checkpoint.log_to_receipt !== toReceipt) {
      throw new Error("checkpoint-log-tail-mismatch");
    }
    if (checkpoint.checkpoint_receipt !== checkpointReceipt(checkpoint)) {
      throw new Error("checkpoint-receipt-mismatch");
    }
    return checkpoint;
  }

  function logFromEvents(logId, events) {
    return autonomousWorldTransportReplay.createTransportReplayLog({
      log_id: logId,
      events: events
    });
  }

  function summarizeRejected(entries, processing) {
    return processing.map(function (result, index) {
      return !result.exchange || result.exchange.verification_status !== "accepted"
        ? entries[index] && entries[index].transport_event_receipt
        : null;
    }).filter(Boolean).sort();
  }

  function resumeTransportReplay(registry, logInput, checkpointInput, subscriptionInput) {
    const log = autonomousWorldTransportReplay.verifyTransportReplayLog(logInput);
    const checkpoint = verifyTransportCheckpoint(checkpointInput, log);
    const prefixEvents = log.entries.slice(0, checkpoint.boundary_order + 1).map(function (entry) {
      return entry.transport_event;
    });
    const laterEvents = log.entries.slice(checkpoint.boundary_order + 1).map(function (entry) {
      return entry.transport_event;
    });
    const prefixLog = logFromEvents(log.log_id, prefixEvents);
    const prefixReplay = autonomousWorldTransportReplay.replayTransportLog(registry, prefixLog, subscriptionInput);
    const recomputedCheckpoint = createTransportCheckpoint(prefixLog, prefixReplay, {
      checkpoint_id: checkpoint.checkpoint_id,
      boundary_order: checkpoint.boundary_order
    });
    if (recomputedCheckpoint.checkpoint_receipt !== checkpoint.checkpoint_receipt) {
      throw new Error("checkpoint-recomputed-summary-mismatch");
    }
    const laterLog = logFromEvents(checkpoint.checkpoint_id + ".tail", laterEvents);
    const laterReplay = autonomousWorldTransportReplay.replayTransportLog(registry, laterLog, subscriptionInput);
    const accepted = uniqueSorted(
      prefixReplay.accepted_snapshot_identities.concat(laterReplay.accepted_snapshot_identities)
    );
    const result = {
      kind: "omi.autonomous-world.transport-resume",
      checkpoint_receipt: checkpoint.checkpoint_receipt,
      transport_log_receipt: log.transport_log_receipt,
      verification_recomputed: true,
      checkpoint_used: true,
      prefix_replay_receipt: prefixReplay.replay_receipt,
      later_replay_receipt: laterReplay.replay_receipt,
      accepted_snapshot_identities: accepted,
      rejected_event_receipts: checkpoint.rejected_event_receipts.concat(
        summarizeRejected(laterLog.entries, laterReplay.processing)
      ).sort(),
      processing: prefixReplay.processing.concat(laterReplay.processing),
      authority: false,
      admission: false,
      resume_receipt: null
    };
    result.resume_receipt = fnv1a(stableString({
      checkpoint_receipt: result.checkpoint_receipt,
      transport_log_receipt: result.transport_log_receipt,
      verification_recomputed: result.verification_recomputed,
      prefix_replay_receipt: result.prefix_replay_receipt,
      later_replay_receipt: result.later_replay_receipt,
      accepted_snapshot_identities: result.accepted_snapshot_identities,
      rejected_event_receipts: result.rejected_event_receipts,
      authority: result.authority,
      admission: result.admission
    }));
    return result;
  }

  function openCheckpointSnapshot() {
    throw new Error("checkpoint-not-admission");
  }

  function openResumedSnapshot(resume, identity) {
    return autonomousWorldTransportReplay.openReplayedSnapshot(resume, identity);
  }

  function renderResumedSnapshot(resume, identity, options) {
    return autonomousWorldTransportReplay.renderReplayedSnapshot(resume, identity, options || {});
  }

  return {
    createTransportCheckpoint: createTransportCheckpoint,
    verifyTransportCheckpoint: verifyTransportCheckpoint,
    resumeTransportReplay: resumeTransportReplay,
    openCheckpointSnapshot: openCheckpointSnapshot,
    openResumedSnapshot: openResumedSnapshot,
    renderResumedSnapshot: renderResumedSnapshot
  };
}));
