(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_peer_exchange.js") : root.OMIAutonomousWorldPeerExchange
  );
  root.OMIAutonomousWorldSubscriptionCourt = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldPeerExchange
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

  function normalizeFilters(filters) {
    return {
      peer_id: String(filters && filters.peer_id || "*"),
      world_id: String(filters && filters.world_id || "*"),
      history_mode: String(filters && filters.history_mode || "admitted-only")
    };
  }

  function declareSubscription(input) {
    const subscription = {
      kind: "omi.autonomous-world.subscription",
      subscription_id: String(input && input.subscription_id || "sub.fixture.world-history"),
      authority: false,
      filters: normalizeFilters(input && input.filters),
      matched_exchange_receipts: [],
      admitted_snapshot_identities: [],
      subscription_receipt: null
    };
    subscription.subscription_receipt = fnv1a(stableString({
      subscription_id: subscription.subscription_id,
      filters: subscription.filters,
      authority: subscription.authority
    }));
    return subscription;
  }

  function importedWorldIds(exchange) {
    if (!exchange || !exchange.imported || !exchange.imported.graph) {
      return [];
    }
    return Object.keys(exchange.imported.graph.snapshots).sort().map(function (identity) {
      const snapshot = exchange.imported.graph.snapshots[identity];
      return snapshot && snapshot.admission && snapshot.admission.document
        ? snapshot.admission.document.id
        : "";
    }).filter(Boolean);
  }

  function peerMatches(subscription, exchange) {
    return subscription.filters.peer_id === "*" || subscription.filters.peer_id === exchange.peer_id;
  }

  function worldMatches(subscription, exchange) {
    const worldId = subscription.filters.world_id;
    return worldId === "*" || importedWorldIds(exchange).indexOf(worldId) >= 0;
  }

  function historyMatches(subscription, exchange) {
    const mode = subscription.filters.history_mode;
    if (mode === "*" || mode === "any") {
      return true;
    }
    if (mode === "admitted-only") {
      return exchange.verification_status === "accepted";
    }
    if (mode === "merged-only") {
      return !!(exchange.imported && exchange.imported.graph && Object.keys(exchange.imported.graph.snapshots).some(function (identity) {
        const snapshot = exchange.imported.graph.snapshots[identity];
        return snapshot && snapshot.report && snapshot.report.kind === "autonomous-world-merge-reconciliation-report";
      }));
    }
    return false;
  }

  function evaluateSubscription(subscriptionInput, exchange) {
    const subscription = subscriptionInput && subscriptionInput.subscription_receipt
      ? clone(subscriptionInput)
      : declareSubscription(subscriptionInput);
    const matched = !!exchange &&
      exchange.verification_status === "accepted" &&
      peerMatches(subscription, exchange) &&
      worldMatches(subscription, exchange) &&
      historyMatches(subscription, exchange);
    const admitted = matched ? exchange.accepted_snapshot_identities.slice().sort() : [];
    const evaluation = {
      kind: "omi.autonomous-world.subscription-evaluation",
      subscription_id: subscription.subscription_id,
      subscription_receipt: subscription.subscription_receipt,
      exchange_receipt: exchange ? exchange.exchange_receipt : null,
      peer_id: exchange ? exchange.peer_id : null,
      match: matched,
      action: matched ? "request-package-evidence" : "ignore",
      verification_status: exchange ? exchange.verification_status : "missing-exchange",
      matched_exchange_receipts: matched ? [exchange.exchange_receipt] : [],
      admitted_snapshot_identities: admitted,
      authority: false,
      evaluation_receipt: null
    };
    evaluation.evaluation_receipt = fnv1a(stableString({
      subscription_receipt: evaluation.subscription_receipt,
      exchange_receipt: evaluation.exchange_receipt,
      peer_id: evaluation.peer_id,
      match: evaluation.match,
      action: evaluation.action,
      verification_status: evaluation.verification_status,
      admitted_snapshot_identities: evaluation.admitted_snapshot_identities
    }));
    return evaluation;
  }

  function openSubscribedSnapshot(evaluation, exchange, identity) {
    if (!evaluation || !evaluation.match) {
      throw new Error("subscription-not-matched");
    }
    if (evaluation.admitted_snapshot_identities.indexOf(String(identity)) < 0) {
      throw new Error("snapshot-not-admitted-by-subscription:" + identity);
    }
    return autonomousWorldPeerExchange.openAcceptedSnapshot(exchange, identity);
  }

  function renderSubscribedSnapshot(evaluation, exchange, identity, options) {
    if (!evaluation || !evaluation.match) {
      throw new Error("subscription-not-matched");
    }
    if (evaluation.admitted_snapshot_identities.indexOf(String(identity)) < 0) {
      throw new Error("snapshot-not-admitted-by-subscription:" + identity);
    }
    return autonomousWorldPeerExchange.renderAcceptedSnapshot(exchange, identity, options || {});
  }

  return {
    declareSubscription: declareSubscription,
    evaluateSubscription: evaluateSubscription,
    openSubscribedSnapshot: openSubscribedSnapshot,
    renderSubscribedSnapshot: renderSubscribedSnapshot
  };
}));
