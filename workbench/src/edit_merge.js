(function (root, factory) {
  const api = factory();
  root.OMIEditMerge = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function mergeKey(commit) {
    return [commit.action || "", commit.path || ""].join("|");
  }

  function sortKey(commit) {
    return [
      commit.path || "",
      commit.action || "",
      commit.proposalText || "",
      commit.importedFrom || "",
      String(commit.originalSeq || 0).padStart(8, "0")
    ].join("|");
  }

  function cloneCommit(commit, sourceLogId) {
    return {
      type: "commit",
      action: commit.action,
      path: commit.path,
      proposalText: commit.proposalText,
      proposalSeq: commit.proposalSeq || 0,
      importedFrom: sourceLogId,
      originalSeq: commit.seq || commit.originalSeq || 0
    };
  }

  function sameCommit(left, right) {
    return left.action === right.action &&
           left.path === right.path &&
           left.proposalText === right.proposalText;
  }

  function mergeLogs(baseSource, leftLog, rightLog, editLogApi, editReplayApi, options) {
    const mergedLog = editLogApi.createEditLog();
    const leftId = options && options.leftId ? options.leftId : "left";
    const rightId = options && options.rightId ? options.rightId : "right";
    const leftActive = editLogApi.activeCommitEvents(leftLog).map(function (commit) {
      return cloneCommit(commit, leftId);
    });
    const rightActive = editLogApi.activeCommitEvents(rightLog).map(function (commit) {
      return cloneCommit(commit, rightId);
    });
    const grouped = new Map();

    leftActive.concat(rightActive).forEach(function (commit) {
      const key = mergeKey(commit);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(commit);
    });

    Array.from(grouped.keys()).sort().forEach(function (key) {
      const commits = grouped.get(key).sort(function (a, b) {
        return sortKey(a).localeCompare(sortKey(b));
      });
      const first = commits[0];
      const conflicting = commits.some(function (commit) {
        return !sameCommit(first, commit);
      });

      if (!conflicting) {
        editLogApi.appendImportedCommit(mergedLog, first);
        return;
      }

      for (let i = 0; i < commits.length - 1; i += 1) {
        editLogApi.appendConflict(mergedLog, {
          action: first.action,
          path: first.path,
          left: {
            importedFrom: commits[i].importedFrom,
            proposalText: commits[i].proposalText
          },
          right: {
            importedFrom: commits[i + 1].importedFrom,
            proposalText: commits[i + 1].proposalText
          },
          reason: "divergent-edit"
        });
      }
    });

    return {
      mergedLog: mergedLog,
      replay: editReplayApi.replay(baseSource, mergedLog, editLogApi),
      conflicts: mergedLog.events.filter(function (event) { return event.type === "conflict"; }),
      receipt: editLogApi.receipt(mergedLog)
    };
  }

  return {
    mergeLogs: mergeLogs
  };
}));
