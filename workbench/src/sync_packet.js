(function (root, factory) {
  const api = factory();
  root.OMISyncPacket = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const packetKinds = {
    EDIT_LOG_SEGMENT: "EDIT_LOG_SEGMENT",
    MERGE_LOG_SEGMENT: "MERGE_LOG_SEGMENT",
    CONFLICT_RECORD: "CONFLICT_RECORD",
    BASE_RECEIPT: "BASE_RECEIPT",
    ACK_RECEIPT: "ACK_RECEIPT",
    REQUEST_MISSING_SEGMENT: "REQUEST_MISSING_SEGMENT"
  };

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

  function sourceReceipt(source) {
    return fnv1a(String(source || ""));
  }

  function normalizeEvent(event) {
    return {
      seq: Number(event && event.seq ? event.seq : 0),
      receipt: Number(event && event.receipt ? event.receipt : 0),
      type: String(event && event.type ? event.type : ""),
      action: String(event && event.action ? event.action : ""),
      path: String(event && event.path ? event.path : ""),
      proposalText: String(event && event.proposalText ? event.proposalText : ""),
      proposalSeq: Number(event && event.proposalSeq ? event.proposalSeq : 0),
      importedFrom: String(event && event.importedFrom ? event.importedFrom : ""),
      originalSeq: Number(event && event.originalSeq ? event.originalSeq : 0),
      commitSeq: Number(event && event.commitSeq ? event.commitSeq : 0),
      left: event && event.left ? {
        importedFrom: String(event.left.importedFrom || ""),
        proposalText: String(event.left.proposalText || "")
      } : null,
      right: event && event.right ? {
        importedFrom: String(event.right.importedFrom || ""),
        proposalText: String(event.right.proposalText || "")
      } : null,
      reason: String(event && event.reason ? event.reason : "")
    };
  }

  function normalizePacket(packet) {
    return {
      packet_kind: String(packet && packet.packet_kind ? packet.packet_kind : ""),
      base_receipt: Number(packet && packet.base_receipt ? packet.base_receipt : 0),
      source_peer: String(packet && packet.source_peer ? packet.source_peer : ""),
      target_peer: String(packet && packet.target_peer ? packet.target_peer : ""),
      sequence: Number(packet && packet.sequence ? packet.sequence : 0),
      log_events: Array.isArray(packet && packet.log_events) ? packet.log_events.map(normalizeEvent) : [],
      conflict_events: Array.isArray(packet && packet.conflict_events) ? packet.conflict_events.map(normalizeEvent) : [],
      receipt_hash: Number(packet && packet.receipt_hash ? packet.receipt_hash : 0)
    };
  }

  function computeReceipt(packet) {
    const normalized = normalizePacket(packet);
    delete normalized.receipt_hash;
    return fnv1a(stableString(normalized));
  }

  function validatePacket(packet, expectedBaseReceipt) {
    const normalized = normalizePacket(packet);
    if (!Object.prototype.hasOwnProperty.call(packetKinds, normalized.packet_kind)) {
      return { ok: false, error: "unknown-packet-kind" };
    }
    if (!Number.isInteger(normalized.base_receipt) || normalized.base_receipt <= 0) {
      return { ok: false, error: "invalid-base-receipt" };
    }
    if (typeof expectedBaseReceipt === "number" && expectedBaseReceipt !== normalized.base_receipt) {
      return { ok: false, error: "base-receipt-mismatch" };
    }
    if (!Number.isInteger(normalized.sequence) || normalized.sequence <= 0) {
      return { ok: false, error: "invalid-sequence" };
    }
    if (computeReceipt(normalized) !== normalized.receipt_hash) {
      return { ok: false, error: "invalid-receipt-hash" };
    }
    return { ok: true, packet: normalized };
  }

  function createPacket(kind, fields) {
    const packet = normalizePacket(Object.assign({}, fields, {
      packet_kind: kind,
      receipt_hash: 0
    }));
    packet.receipt_hash = computeReceipt(packet);
    return packet;
  }

  function encodePacket(packet, expectedBaseReceipt) {
    const validation = validatePacket(packet, expectedBaseReceipt);
    if (!validation.ok) {
      throw new Error(validation.error);
    }
    return stableString(validation.packet);
  }

  function decodePacket(text, expectedBaseReceipt) {
    const parsed = JSON.parse(String(text || ""));
    const validation = validatePacket(parsed, expectedBaseReceipt);
    if (!validation.ok) {
      throw new Error(validation.error);
    }
    return validation.packet;
  }

  function createSyncState(options, editLogApi) {
    return {
      base_receipt: Number(options && options.base_receipt ? options.base_receipt : 0),
      local_peer: String(options && options.local_peer ? options.local_peer : "local"),
      imported_log: editLogApi.createEditLog(),
      seen_receipts: [],
      seen_lookup: Object.create(null),
      next_sequence: 1
    };
  }

  function cloneImportedCommit(event, packet) {
    return {
      action: event.action,
      path: event.path,
      proposalText: event.proposalText,
      proposalSeq: event.proposalSeq || 0,
      importedFrom: event.importedFrom || packet.source_peer,
      originalSeq: event.originalSeq || event.seq || 0
    };
  }

  function importPacketEvents(log, packet, editLogApi) {
    const sequenceMap = Object.create(null);
    const proposalSeqs = Object.create(null);

    packet.log_events.forEach(function (event) {
      if (event.type === "proposal") {
        const proposal = editLogApi.appendProposal(log, {
          action: event.action,
          path: event.path,
          proposalText: event.proposalText
        });
        sequenceMap[event.seq] = proposal.seq;
        proposalSeqs[event.seq] = true;
        return;
      }
      if (event.type === "commit") {
        let commit = null;
        if (event.proposalSeq && proposalSeqs[event.proposalSeq] && sequenceMap[event.proposalSeq]) {
          commit = editLogApi.commitProposal(log, sequenceMap[event.proposalSeq]);
        } else {
          commit = editLogApi.appendImportedCommit(log, cloneImportedCommit(event, packet));
        }
        if (commit) {
          sequenceMap[event.seq] = commit.seq;
        }
        return;
      }
      if (event.type === "undo" && sequenceMap[event.commitSeq]) {
        const undo = editLogApi.appendUndo(log, sequenceMap[event.commitSeq]);
        sequenceMap[event.seq] = undo.seq;
        return;
      }
      if (event.type === "redo" && sequenceMap[event.commitSeq]) {
        const redo = editLogApi.appendRedo(log, sequenceMap[event.commitSeq]);
        sequenceMap[event.seq] = redo.seq;
      }
    });

    packet.conflict_events.forEach(function (event) {
      const conflict = editLogApi.appendConflict(log, {
        action: event.action,
        path: event.path,
        left: event.left,
        right: event.right,
        reason: event.reason
      });
      sequenceMap[event.seq] = conflict.seq;
    });

    return sequenceMap;
  }

  function requestMissingSegment(state, packet) {
    return createPacket(packetKinds.REQUEST_MISSING_SEGMENT, {
      base_receipt: state.base_receipt,
      source_peer: state.local_peer,
      target_peer: packet.source_peer,
      sequence: state.next_sequence,
      log_events: [],
      conflict_events: []
    });
  }

  function applyPacket(state, packet, editLogApi) {
    const validation = validatePacket(packet, state.base_receipt);
    if (!validation.ok) {
      return {
        status: "rejected",
        error: validation.error,
        emitted_packet: null
      };
    }

    const normalized = validation.packet;
    if (state.seen_lookup[normalized.receipt_hash]) {
      return {
        status: "duplicate",
        error: null,
        emitted_packet: null
      };
    }

    if (normalized.sequence !== state.next_sequence) {
      return {
        status: "missing-sequence",
        error: null,
        emitted_packet: requestMissingSegment(state, normalized)
      };
    }

    importPacketEvents(state.imported_log, normalized, editLogApi);
    state.seen_lookup[normalized.receipt_hash] = true;
    state.seen_receipts.push(normalized.receipt_hash);
    state.next_sequence += 1;

    return {
      status: "applied",
      error: null,
      emitted_packet: null
    };
  }

  return {
    packetKinds: packetKinds,
    sourceReceipt: sourceReceipt,
    createPacket: createPacket,
    validatePacket: validatePacket,
    encodePacket: encodePacket,
    decodePacket: decodePacket,
    createSyncState: createSyncState,
    applyPacket: applyPacket
  };
}));
