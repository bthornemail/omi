(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_version_history.js") : root.OMIAutonomousWorldVersionHistory,
    typeof require === "function" ? require("./autonomous_world_browser.js") : root.OMIAutonomousWorldBrowser,
    typeof require === "function" ? require("./autonomous_world_live_renderer.js") : root.OMIAutonomousWorldLiveRenderer,
    typeof require === "function" ? require("./model_parser.js") : root.OMIModelParser
  );
  root.OMIAutonomousWorldPackageSync = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldVersionHistory,
  autonomousWorldBrowser,
  autonomousWorldLiveRenderer,
  modelParser
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

  function sortedKeys(value) {
    return Object.keys(value || {}).sort();
  }

  function historyEdgeReceipt(edge) {
    return fnv1a(stableString({
      from_identity_receipt: edge.from_identity_receipt,
      overlay_receipt: edge.overlay_receipt,
      candidate_edit_receipt: edge.candidate_edit_receipt,
      admission_decision_receipt: edge.admission_decision_receipt,
      to_identity_receipt: edge.to_identity_receipt
    }));
  }

  function requireValue(value, name) {
    if (value === undefined || value === null || value === "") {
      throw new Error("missing-sync-field:" + name);
    }
    return value;
  }

  function snapshotWitnesses(snapshot) {
    const report = snapshot.report || {};
    return {
      package: clone(report.package || {}),
      closure: clone(report.closure || {}),
      raw_binary: clone(report.raw_binary || {})
    };
  }

  function requireSnapshotWitnesses(snapshot) {
    const witnesses = snapshot.witnesses || snapshotWitnesses(snapshot);
    requireValue(witnesses.package.manifest_receipt, "package.manifest_receipt");
    requireValue(witnesses.package.imported_manifest_receipt, "package.imported_manifest_receipt");
    requireValue(witnesses.closure.character_identity_receipt, "closure.character_identity_receipt");
    requireValue(witnesses.closure.binary64_identity_receipt, "closure.binary64_identity_receipt");
    requireValue(witnesses.raw_binary.identity_receipt, "raw_binary.identity_receipt");
    requireValue(witnesses.raw_binary.index_receipt, "raw_binary.index_receipt");
  }

  function normalizeSnapshot(identity, snapshot) {
    if (!snapshot || !snapshot.admission || !snapshot.report) {
      throw new Error("invalid-sync-snapshot:" + identity);
    }
    const document = snapshot.admission.document || modelParser.parseDocument(snapshot.admission.source || "");
    return {
      identity_receipt: snapshot.admission.identity_receipt,
      admission: {
        authority: snapshot.admission.authority,
        source: snapshot.admission.source,
        identity_receipt: snapshot.admission.identity_receipt,
        admitted: snapshot.admission.admitted,
        original_world_identity_receipt: snapshot.admission.original_world_identity_receipt || null,
        base_identity_receipt: snapshot.admission.base_identity_receipt || null,
        left_identity_receipt: snapshot.admission.left_identity_receipt || null,
        right_identity_receipt: snapshot.admission.right_identity_receipt || null,
        admission_decision_receipt: snapshot.admission.admission_decision_receipt || snapshot.admission.admission_receipt || null
      },
      document: {
        id: document.id,
        kind: document.kind,
        counts: clone(document.counts)
      },
      report: clone(snapshot.report),
      witnesses: snapshotWitnesses(snapshot),
      authority: false
    };
  }

  function deriveBranches(edges) {
    const byFrom = {};
    edges.forEach(function (edge) {
      const key = String(edge.from_identity_receipt);
      if (!byFrom[key]) {
        byFrom[key] = [];
      }
      byFrom[key].push(edge.to_identity_receipt);
    });
    return Object.keys(byFrom).sort().filter(function (key) {
      return byFrom[key].length > 1;
    }).map(function (key) {
      return {
        base_identity_receipt: key,
        branch_identity_receipts: byFrom[key].slice().sort(),
        authority: false,
        branch_receipt: fnv1a(stableString({
          base_identity_receipt: key,
          branch_identity_receipts: byFrom[key].slice().sort()
        }))
      };
    });
  }

  function packageWitnesses(snapshots) {
    const values = snapshots.map(function (snapshot) {
      return snapshot.witnesses;
    });
    return {
      package: values.map(function (witness) { return witness.package; }),
      closure: values.map(function (witness) { return witness.closure; }),
      raw_binary: values.map(function (witness) { return witness.raw_binary; })
    };
  }

  function canonicalPackage(pkg) {
    const next = clone(pkg);
    next.package_receipt = null;
    if (next.admission) {
      next.admission.verified = false;
    }
    return next;
  }

  function packageReceipt(pkg) {
    return fnv1a(stableString(canonicalPackage(pkg)));
  }

  function exportSyncPackage(graph, options) {
    const snapshots = sortedKeys(graph.snapshots).map(function (identity) {
      return normalizeSnapshot(identity, graph.snapshots[identity]);
    });
    const historyEdges = (graph.edges || []).map(clone).sort(function (a, b) {
      return String(a.history_edge_receipt).localeCompare(String(b.history_edge_receipt));
    });
    const syncPackage = {
      kind: "omi.autonomous-world.sync-package",
      version: 1,
      package_receipt: null,
      source: {
        authority: false,
        sender: String(options && options.sender || "local.fixture"),
        transport: String(options && options.transport || "package.fixture")
      },
      root_identity_receipt: graph.root_identity_receipt,
      snapshots: snapshots,
      history_edges: historyEdges,
      branches: deriveBranches(historyEdges),
      merge_reports: snapshots.filter(function (snapshot) {
        return snapshot.report.kind === "autonomous-world-merge-reconciliation-report";
      }).map(function (snapshot) {
        return clone(snapshot.report);
      }),
      witnesses: packageWitnesses(snapshots),
      admission: {
        verified: false,
        local_authority: "receipts-only"
      }
    };
    syncPackage.package_receipt = packageReceipt(syncPackage);
    return syncPackage;
  }

  function verifyHistoryEdges(pkg) {
    const snapshotIds = {};
    pkg.snapshots.forEach(function (snapshot) {
      snapshotIds[String(snapshot.identity_receipt)] = true;
    });
    pkg.history_edges.forEach(function (edge) {
      requireValue(edge.from_identity_receipt, "history.from_identity_receipt");
      requireValue(edge.overlay_receipt, "history.overlay_receipt");
      requireValue(edge.candidate_edit_receipt, "history.candidate_edit_receipt");
      requireValue(edge.admission_decision_receipt, "history.admission_decision_receipt");
      requireValue(edge.to_identity_receipt, "history.to_identity_receipt");
      requireValue(edge.history_edge_receipt, "history.history_edge_receipt");
      if (historyEdgeReceipt(edge) !== edge.history_edge_receipt) {
        throw new Error("invalid-history-edge-receipt");
      }
      if (!snapshotIds[String(edge.to_identity_receipt)]) {
        throw new Error("history-edge-missing-snapshot:" + edge.to_identity_receipt);
      }
    });
  }

  function verifySnapshots(pkg) {
    pkg.snapshots.forEach(function (snapshot) {
      requireValue(snapshot.identity_receipt, "snapshot.identity_receipt");
      requireValue(snapshot.admission.source, "snapshot.admission.source");
      requireValue(snapshot.report, "snapshot.report");
      requireSnapshotWitnesses(snapshot);
      if (snapshot.identity_receipt !== snapshot.admission.identity_receipt) {
        throw new Error("snapshot-identity-mismatch");
      }
      if (snapshot.authority !== false) {
        throw new Error("sync-snapshot-authority");
      }
    });
  }

  function verifySyncPackage(pkg) {
    if (!pkg || pkg.kind !== "omi.autonomous-world.sync-package") {
      throw new Error("invalid-sync-package");
    }
    if (pkg.package_receipt !== packageReceipt(pkg)) {
      throw new Error("invalid-sync-package-receipt");
    }
    if (!pkg.source || pkg.source.authority !== false) {
      throw new Error("sync-source-authority");
    }
    if (!Array.isArray(pkg.snapshots) || pkg.snapshots.length === 0) {
      throw new Error("missing-sync-snapshots");
    }
    if (!Array.isArray(pkg.history_edges)) {
      throw new Error("missing-sync-history-edges");
    }
    verifySnapshots(pkg);
    verifyHistoryEdges(pkg);
    return true;
  }

  function importSyncPackage(pkg) {
    verifySyncPackage(pkg);
    const graph = autonomousWorldVersionHistory.createHistoryGraph(null);
    graph.kind = "autonomous-world-version-history";
    graph.root_identity_receipt = pkg.root_identity_receipt;
    graph.edges = pkg.history_edges.map(clone);
    graph.snapshots = {};
    pkg.snapshots.forEach(function (snapshot) {
      const source = snapshot.admission.source;
      const document = modelParser.parseDocument(source);
      graph.snapshots[String(snapshot.identity_receipt)] = {
        admission: Object.assign({}, snapshot.admission, {
          source: source,
          document: document,
          identity_receipt: snapshot.identity_receipt,
          admitted: true
        }),
        report: clone(snapshot.report),
        package: snapshot.report.package ? { manifest: { manifest_receipt: snapshot.report.package.manifest_receipt } } : null,
        raw_binary: clone(snapshot.report.raw_binary || {}),
        closure: clone(snapshot.report.closure || {}),
        triangulation: null
      };
    });
    graph.history_receipt = fnv1a(stableString({
      root_identity_receipt: graph.root_identity_receipt,
      edges: graph.edges.map(function (edge) { return edge.history_edge_receipt; }).sort(),
      snapshots: sortedKeys(graph.snapshots)
    }));
    return {
      kind: "omi.autonomous-world.imported-sync-package",
      package_receipt: pkg.package_receipt,
      admission: {
        verified: true,
        local_authority: "receipts-only",
        sync_package_authority: false,
        sender_authority: false,
        transport_authority: false
      },
      graph: graph,
      snapshots: graph.snapshots
    };
  }

  function openImportedSnapshot(imported, identity) {
    const snapshot = imported.graph.snapshots[String(identity)];
    if (!snapshot) {
      throw new Error("unknown-imported-snapshot:" + identity);
    }
    return autonomousWorldBrowser.openWorld(snapshot);
  }

  function renderImportedSnapshot(imported, identity, options) {
    return autonomousWorldLiveRenderer.createRenderPlan(openImportedSnapshot(imported, identity), options || {});
  }

  return {
    exportSyncPackage: exportSyncPackage,
    verifySyncPackage: verifySyncPackage,
    importSyncPackage: importSyncPackage,
    openImportedSnapshot: openImportedSnapshot,
    renderImportedSnapshot: renderImportedSnapshot
  };
}));
