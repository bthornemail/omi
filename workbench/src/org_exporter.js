(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./org_property_drawer.js") : root.OMIOrgPropertyDrawer
  );
  root.OMIOrgExporter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (propertyDrawer) {
  "use strict";

  const fs = typeof require === "function" ? require("fs") : null;
  const path = typeof require === "function" ? require("path") : null;

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

  function syncBundleReceipt(syncPackets, syncPacketApi, expectedBaseReceipt) {
    if (!syncPackets || syncPackets.length === 0) {
      return 0;
    }
    return fnv1a(syncPackets.map(function (packet) {
      return syncPacketApi.encodePacket(packet, expectedBaseReceipt);
    }).join("\n"));
  }

  function countConflicts(editLog) {
    return (editLog && Array.isArray(editLog.events) ? editLog.events : []).filter(function (event) {
      return event.type === "conflict";
    }).length;
  }

  function graphDot(document) {
    if (!document || document.kind !== "world") {
      return "digraph omi_model {\n  \"" + String(document.id || "model") + "\";\n}";
    }
    const lines = ["digraph omi_world {"];
    document.graph.edges.forEach(function (edge) {
      lines.push("  \"" + edge.source + "\" -> \"" + edge.target + "\" [label=\"" + edge.id + "\"];");
    });
    lines.push("}");
    return lines.join("\n");
  }

  function buildReadmeOrg(options) {
    const source = String(options.source || "");
    const document = options.document;
    const editLog = options.editLog;
    const syncPackets = options.syncPackets || [];
    const syncPacketApi = options.syncPacketApi;
    const baseReceipt = sourceReceipt(source);
    const editReceipt = options.editLogApi.receipt(editLog);
    const syncReceipt = syncBundleReceipt(syncPackets, syncPacketApi, baseReceipt);
    const drawer = propertyDrawer.serialize({
      OMI_MODEL_ID: document.id,
      OMI_BASE_RECEIPT: baseReceipt,
      OMI_EDIT_RECEIPT: editReceipt,
      OMI_SYNC_RECEIPT: syncReceipt,
      OMI_AUTHORITY: "canonical-source"
    });
    const editsJson = stableString(editLog);
    const syncJson = stableString({
      format: "omi-synclog",
      packet_count: syncPackets.length,
      packets: syncPackets,
      bundle_receipt: syncReceipt
    });
    const receiptsJson = stableString({
      base_source_receipt: baseReceipt,
      edit_log_receipt: editReceipt,
      sync_bundle_receipt: syncReceipt
    });

    return [
      "#+TITLE: OMI World Model Bundle",
      "#+OMI_MODEL_ID: " + document.id,
      "#+OMI_BASE_RECEIPT: " + baseReceipt,
      "",
      "* Bundle",
      drawer,
      "",
      "- FS count :: " + document.counts.fs,
      "- GS count :: " + document.counts.gs,
      "- RS count :: " + document.counts.rs,
      "- US count :: " + document.counts.us,
      "- Edit count :: " + editLog.events.length,
      "- Conflict count :: " + countConflicts(editLog),
      "- Sync packet count :: " + syncPackets.length,
      "- Carrier receipts :: base=" + baseReceipt + " edit=" + editReceipt + " sync=" + syncReceipt,
      "",
      "* Model",
      propertyDrawer.serialize({
        OMI_PATH: document.id,
        OMI_FS: document.id,
        OMI_AUTHORITY: "canonical-source",
        OMI_TANGLE_TARGET: "model.omilisp"
      }),
      "#+begin_src omilisp :tangle model.omilisp",
      source,
      "#+end_src",
      "",
      "* Edit Log",
      propertyDrawer.serialize({
        OMI_KIND: "append-only-edit-log",
        OMI_RECEIPT: editReceipt,
        OMI_TANGLE_TARGET: "edits.omi-log.json"
      }),
      "#+begin_src json :tangle edits.omi-log.json",
      editsJson,
      "#+end_src",
      "",
      "* Sync Packets",
      propertyDrawer.serialize({
        OMI_KIND: "sync-packet-bundle",
        OMI_RECEIPT: syncReceipt,
        OMI_TANGLE_TARGET: "sync.omi-synclog.json"
      }),
      "#+begin_src json :tangle sync.omi-synclog.json",
      syncJson,
      "#+end_src",
      "",
      "* Receipts",
      "#+begin_src json :tangle receipts.json",
      receiptsJson,
      "#+end_src",
      "",
      "* Graph Template",
      "#+begin_src dot :tangle graph.dot",
      graphDot(document),
      "#+end_src"
    ].filter(Boolean).join("\n");
  }

  function exportBundle(options) {
    const source = String(options.source || "");
    const document = options.document;
    const editLog = options.editLog;
    const syncPackets = options.syncPackets || [];
    const syncPacketApi = options.syncPacketApi;
    const baseReceipt = sourceReceipt(source);
    const editReceipt = options.editLogApi.receipt(editLog);
    const syncReceipt = syncBundleReceipt(syncPackets, syncPacketApi, baseReceipt);
    const syncBundle = {
      format: "omi-synclog",
      packet_count: syncPackets.length,
      packets: syncPackets,
      bundle_receipt: syncReceipt
    };
    return {
      "model.omilisp": source,
      "edits.omi-log.json": stableString(editLog),
      "sync.omi-synclog.json": stableString(syncBundle),
      "receipts.json": stableString({
        base_source_receipt: baseReceipt,
        edit_log_receipt: editReceipt,
        sync_bundle_receipt: syncReceipt
      }),
      "README.org": buildReadmeOrg({
        source: source,
        document: document,
        editLog: editLog,
        editLogApi: options.editLogApi,
        syncPackets: syncPackets,
        syncPacketApi: syncPacketApi
      })
    };
  }

  function writeBundle(dirPath, bundle) {
    if (!fs || !path) {
      throw new Error("fs-unavailable");
    }
    fs.mkdirSync(dirPath, { recursive: true });
    Object.keys(bundle).sort().forEach(function (name) {
      fs.writeFileSync(path.join(dirPath, name), String(bundle[name]) + "\n", "utf8");
    });
  }

  return {
    sourceReceipt: sourceReceipt,
    exportBundle: exportBundle,
    writeBundle: writeBundle
  };
}));
