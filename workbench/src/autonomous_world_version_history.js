(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_overlay_admission.js") : root.OMIAutonomousWorldOverlayAdmission
  );
  root.OMIAutonomousWorldVersionHistory = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldOverlayAdmission
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

  function requireReceipt(value, name) {
    if (value === undefined || value === null || value === "") {
      throw new Error("missing-history-receipt:" + name);
    }
    return value;
  }

  function createHistoryEdge(admitted) {
    const report = admitted && admitted.report ? admitted.report : admitted;
    if (!report || report.decision !== "admit") {
      throw new Error("invalid-admission-report");
    }
    const edge = {
      from_identity_receipt: requireReceipt(report.original_world_identity_receipt || report.old_world_identity_receipt, "from_identity_receipt"),
      overlay_receipt: requireReceipt(report.overlay_receipt, "overlay_receipt"),
      candidate_edit_receipt: requireReceipt(report.candidate_edit_receipt, "candidate_edit_receipt"),
      admission_decision_receipt: requireReceipt(report.admission_decision_receipt, "admission_decision_receipt"),
      to_identity_receipt: requireReceipt(report.new_world_identity_receipt, "to_identity_receipt"),
      history_edge_receipt: null,
      authority: false
    };
    edge.history_edge_receipt = fnv1a(stableString({
      from_identity_receipt: edge.from_identity_receipt,
      overlay_receipt: edge.overlay_receipt,
      candidate_edit_receipt: edge.candidate_edit_receipt,
      admission_decision_receipt: edge.admission_decision_receipt,
      to_identity_receipt: edge.to_identity_receipt
    }));
    return edge;
  }

  function createHistoryGraph(rootSnapshot) {
    const snapshots = {};
    let rootIdentity = null;
    if (rootSnapshot && rootSnapshot.admission && rootSnapshot.admission.identity_receipt !== undefined) {
      rootIdentity = rootSnapshot.admission.identity_receipt;
      snapshots[String(rootIdentity)] = rootSnapshot;
    }
    const graph = {
      kind: "autonomous-world-version-history",
      root_identity_receipt: rootIdentity,
      edges: [],
      snapshots: snapshots,
      authority: false,
      history_receipt: null
    };
    graph.history_receipt = historyReceipt(graph);
    return graph;
  }

  function historyReceipt(graph) {
    return fnv1a(stableString({
      root_identity_receipt: graph.root_identity_receipt,
      edges: graph.edges.map(function (edge) {
        return edge.history_edge_receipt;
      }).sort(),
      snapshots: Object.keys(graph.snapshots).sort()
    }));
  }

  function addAdmission(graph, admitted) {
    const edge = createHistoryEdge(admitted);
    const next = {
      kind: graph.kind || "autonomous-world-version-history",
      root_identity_receipt: graph.root_identity_receipt || edge.from_identity_receipt,
      edges: graph.edges.map(clone).concat([edge]),
      snapshots: Object.assign({}, graph.snapshots || {}),
      authority: false,
      history_receipt: null
    };
    if (admitted && admitted.admission && admitted.admission.identity_receipt !== undefined) {
      next.snapshots[String(admitted.admission.identity_receipt)] = admitted;
    }
    next.history_receipt = historyReceipt(next);
    return {
      graph: next,
      edge: edge
    };
  }

  function outgoingEdges(graph, identity) {
    const key = String(identity);
    return graph.edges.filter(function (edge) {
      return String(edge.from_identity_receipt) === key;
    }).map(clone);
  }

  function replayLatest(graph, startIdentity) {
    let current = startIdentity !== undefined && startIdentity !== null
      ? String(startIdentity)
      : String(graph.root_identity_receipt);
    const visited = {};
    const path = [];
    while (current && !visited[current]) {
      visited[current] = true;
      const nextEdges = outgoingEdges(graph, current).sort(function (a, b) {
        return String(a.history_edge_receipt).localeCompare(String(b.history_edge_receipt));
      });
      if (nextEdges.length === 0) {
        break;
      }
      const edge = nextEdges[nextEdges.length - 1];
      path.push(edge);
      current = String(edge.to_identity_receipt);
    }
    return {
      latest_identity_receipt: Number.isNaN(Number(current)) ? current : Number(current),
      path: path,
      replay_receipt: fnv1a(stableString({
        start_identity: startIdentity || graph.root_identity_receipt,
        latest_identity: current,
        edges: path.map(function (edge) {
          return edge.history_edge_receipt;
        })
      })),
      authority: false
    };
  }

  function openSnapshot(graph, identity) {
    const snapshot = graph.snapshots[String(identity)];
    if (!snapshot) {
      throw new Error("unknown-world-snapshot:" + identity);
    }
    if (snapshot.admission && snapshot.report) {
      return autonomousWorldOverlayAdmission.openAdmitted(snapshot);
    }
    throw new Error("invalid-world-snapshot:" + identity);
  }

  function renderSnapshot(graph, identity, options) {
    const snapshot = graph.snapshots[String(identity)];
    if (!snapshot) {
      throw new Error("unknown-world-snapshot:" + identity);
    }
    if (snapshot.admission && snapshot.report) {
      return autonomousWorldOverlayAdmission.renderAdmitted(snapshot, options || {});
    }
    throw new Error("invalid-world-snapshot:" + identity);
  }

  function receiptPanel(graph, identity) {
    const snapshot = graph.snapshots[String(identity)];
    if (!snapshot || !snapshot.report) {
      throw new Error("unknown-world-snapshot:" + identity);
    }
    return {
      identity_receipt: snapshot.admission.identity_receipt,
      package: clone(snapshot.report.package || {}),
      raw_binary: clone(snapshot.report.raw_binary || {}),
      closure: clone(snapshot.report.closure || {}),
      history: {
        graph_receipt: graph.history_receipt,
        edge_receipts: graph.edges.filter(function (edge) {
          return String(edge.to_identity_receipt) === String(identity);
        }).map(function (edge) {
          return edge.history_edge_receipt;
        })
      },
      authority: false
    };
  }

  return {
    createHistoryEdge: createHistoryEdge,
    createHistoryGraph: createHistoryGraph,
    addAdmission: addAdmission,
    outgoingEdges: outgoingEdges,
    replayLatest: replayLatest,
    openSnapshot: openSnapshot,
    renderSnapshot: renderSnapshot,
    receiptPanel: receiptPanel
  };
}));
