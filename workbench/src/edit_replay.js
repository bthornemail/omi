(function (root, factory) {
  const api = factory();
  root.OMIEditReplay = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function replay(baseSource, log, editLogApi) {
    const active = editLogApi.activeCommitEvents(log);
    const edits = active.map(function (event) { return event.proposalText; }).filter(Boolean);
    const source = edits.length === 0
      ? String(baseSource || "")
      : String(baseSource || "") + "\n\n;; OMI WORKBENCH EDIT LOG REPLAY\n" + edits.join("\n\n");
    return {
      source: source,
      activeCommitSeqs: active.map(function (event) { return event.seq; }),
      receipt: editLogApi.receipt(log)
    };
  }

  return {
    replay: replay
  };
}));
