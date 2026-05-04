(function (root, factory) {
  const api = factory();
  root.OMIEditLog = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

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

  function nextSeq(log) {
    return log.nextSeq++;
  }

  function computeReceipt(event) {
    return fnv1a(stableString(event));
  }

  function createEditLog() {
    return {
      events: [],
      nextSeq: 1
    };
  }

  function appendEvent(log, event) {
    const entry = Object.assign({}, event, { seq: nextSeq(log) });
    entry.receipt = computeReceipt(entry);
    log.events.push(entry);
    return entry;
  }

  function appendProposal(log, proposal) {
    return appendEvent(log, {
      type: "proposal",
      action: proposal.action,
      path: proposal.path,
      proposalText: proposal.proposalText
    });
  }

  function commitProposal(log, proposalSeq) {
    const proposal = log.events.find(function (event) {
      return event.seq === proposalSeq && event.type === "proposal";
    });
    if (!proposal) {
      return null;
    }
    return appendEvent(log, {
      type: "commit",
      action: proposal.action,
      path: proposal.path,
      proposalText: proposal.proposalText,
      proposalSeq: proposal.seq
    });
  }

  function appendUndo(log, commitSeq) {
    return appendEvent(log, {
      type: "undo",
      commitSeq: commitSeq
    });
  }

  function appendRedo(log, commitSeq) {
    return appendEvent(log, {
      type: "redo",
      commitSeq: commitSeq
    });
  }

  function appendImportedCommit(log, commit) {
    return appendEvent(log, {
      type: "commit",
      action: commit.action,
      path: commit.path,
      proposalText: commit.proposalText,
      proposalSeq: commit.proposalSeq || 0,
      importedFrom: commit.importedFrom || "",
      originalSeq: commit.originalSeq || commit.seq || 0
    });
  }

  function appendConflict(log, conflict) {
    return appendEvent(log, {
      type: "conflict",
      action: conflict.action,
      path: conflict.path,
      left: conflict.left,
      right: conflict.right,
      reason: conflict.reason || "merge-conflict"
    });
  }

  function activeCommitEvents(log) {
    const commits = new Map();
    const active = new Map();

    log.events.forEach(function (event) {
      if (event.type === "commit") {
        commits.set(event.seq, event);
        active.set(event.seq, true);
      } else if (event.type === "undo" && commits.has(event.commitSeq)) {
        active.set(event.commitSeq, false);
      } else if (event.type === "redo" && commits.has(event.commitSeq)) {
        active.set(event.commitSeq, true);
      }
    });

    return Array.from(commits.values()).filter(function (event) {
      return active.get(event.seq);
    }).sort(function (a, b) {
      return a.seq - b.seq;
    });
  }

  function receipt(log) {
    return fnv1a(log.events.map(function (event) {
      return stableString(event);
    }).join("|"));
  }

  return {
    createEditLog: createEditLog,
    appendProposal: appendProposal,
    commitProposal: commitProposal,
    appendUndo: appendUndo,
    appendRedo: appendRedo,
    appendImportedCommit: appendImportedCommit,
    appendConflict: appendConflict,
    activeCommitEvents: activeCommitEvents,
    receipt: receipt
  };
}));
