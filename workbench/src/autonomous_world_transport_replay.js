(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_live_transport_adapter.js") : root.OMIAutonomousWorldLiveTransportAdapter
  );
  root.OMIAutonomousWorldTransportReplay = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldLiveTransportAdapter
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

  function entryReceipt(entry) {
    return fnv1a(stableString({
      entry_id: entry.entry_id,
      order: entry.order,
      transport_event_receipt: entry.transport_event_receipt,
      previous_entry_receipt: entry.previous_entry_receipt,
      authority: entry.authority,
      admission: entry.admission
    }));
  }

  function logReceipt(entries) {
    return fnv1a(stableString({
      entries: entries.map(function (entry) {
        return entry.replay_entry_receipt;
      }),
      authority: false,
      admission: false
    }));
  }

  function createTransportReplayLog(input) {
    const events = (input && input.events || []).map(clone);
    let previous = null;
    const entries = events.map(function (event, index) {
      const entry = {
        kind: "omi.autonomous-world.transport-replay-entry",
        entry_id: String(input && input.log_id || "transport.replay") + ".entry." + index,
        order: index,
        transport_event_receipt: event.transport_event_receipt || null,
        previous_entry_receipt: previous,
        transport_event: event,
        authority: false,
        admission: false,
        replay_entry_receipt: null
      };
      entry.replay_entry_receipt = entryReceipt(entry);
      previous = entry.replay_entry_receipt;
      return entry;
    });
    const log = {
      kind: "omi.autonomous-world.transport-replay-log",
      log_id: String(input && input.log_id || "transport.replay.fixture"),
      authority: false,
      admission: false,
      entries: entries,
      transport_log_receipt: null
    };
    log.transport_log_receipt = logReceipt(entries);
    return log;
  }

  function verifyTransportReplayLog(logInput) {
    const log = clone(logInput || {});
    let previous = null;
    (log.entries || []).forEach(function (entry, index) {
      if (entry.order !== index) {
        throw new Error("transport-log-order-mismatch:" + index);
      }
      if (entry.previous_entry_receipt !== previous) {
        throw new Error("transport-log-chain-mismatch:" + index);
      }
      if (entry.transport_event_receipt !== (entry.transport_event && entry.transport_event.transport_event_receipt || null)) {
        throw new Error("transport-event-receipt-mismatch:" + index);
      }
      const expected = entryReceipt(entry);
      if (entry.replay_entry_receipt !== expected) {
        throw new Error("transport-log-entry-receipt-mismatch:" + index);
      }
      previous = entry.replay_entry_receipt;
    });
    if (log.transport_log_receipt !== logReceipt(log.entries || [])) {
      throw new Error("transport-log-receipt-mismatch");
    }
    return log;
  }

  function replayTransportLog(registry, logInput, subscriptionInput) {
    const log = verifyTransportReplayLog(logInput);
    const processing = log.entries.map(function (entry) {
      return autonomousWorldLiveTransportAdapter.processTransportEvent(
        registry,
        entry.transport_event,
        subscriptionInput
      );
    });
    const accepted = [];
    processing.forEach(function (result) {
      result.accepted_snapshot_identities.forEach(function (identity) {
        if (accepted.indexOf(identity) < 0) {
          accepted.push(identity);
        }
      });
    });
    accepted.sort();
    const replay = {
      kind: "omi.autonomous-world.transport-replay",
      transport_log_receipt: log.transport_log_receipt,
      replayed_event_receipts: log.entries.map(function (entry) {
        return entry.transport_event_receipt;
      }),
      processing: processing,
      accepted_snapshot_identities: accepted,
      authority: false,
      admission: false,
      replay_receipt: null
    };
    replay.replay_receipt = fnv1a(stableString({
      transport_log_receipt: replay.transport_log_receipt,
      processing_receipts: processing.map(function (result) {
        return result.processing_receipt;
      }),
      accepted_snapshot_identities: replay.accepted_snapshot_identities,
      authority: replay.authority,
      admission: replay.admission
    }));
    return replay;
  }

  function openReplayedSnapshot(replay, identity) {
    const id = String(identity);
    const result = (replay.processing || []).find(function (processing) {
      return processing.accepted_snapshot_identities.indexOf(id) >= 0;
    });
    if (!result) {
      throw new Error("snapshot-not-admitted-by-replay:" + id);
    }
    return autonomousWorldLiveTransportAdapter.openTransportSnapshot(result, id);
  }

  function renderReplayedSnapshot(replay, identity, options) {
    const id = String(identity);
    const result = (replay.processing || []).find(function (processing) {
      return processing.accepted_snapshot_identities.indexOf(id) >= 0;
    });
    if (!result) {
      throw new Error("snapshot-not-admitted-by-replay:" + id);
    }
    return autonomousWorldLiveTransportAdapter.renderTransportSnapshot(result, id, options || {});
  }

  return {
    createTransportReplayLog: createTransportReplayLog,
    verifyTransportReplayLog: verifyTransportReplayLog,
    replayTransportLog: replayTransportLog,
    openReplayedSnapshot: openReplayedSnapshot,
    renderReplayedSnapshot: renderReplayedSnapshot
  };
}));
