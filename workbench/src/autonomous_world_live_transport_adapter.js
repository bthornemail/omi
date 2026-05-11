(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_peer_exchange.js") : root.OMIAutonomousWorldPeerExchange,
    typeof require === "function" ? require("./autonomous_world_subscription_court.js") : root.OMIAutonomousWorldSubscriptionCourt
  );
  root.OMIAutonomousWorldLiveTransportAdapter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldPeerExchange,
  autonomousWorldSubscriptionCourt
) {
  "use strict";

  const TRANSPORT_ADAPTERS = [
    "file-drop",
    "fifo",
    "unix-socket",
    "tcp",
    "udp",
    "websocket",
    "http-poll",
    "barcode-scan"
  ];

  function fnv1a(text) {
    return artifactIdentity.fnv1a(String(text || ""));
  }

  function stableString(value) {
    return artifactIdentity.stableString(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function listTransportAdapters() {
    return TRANSPORT_ADAPTERS.slice();
  }

  function normalizeAdapter(adapter) {
    const name = String(adapter || "file-drop");
    if (TRANSPORT_ADAPTERS.indexOf(name) < 0) {
      throw new Error("unknown-transport-adapter:" + name);
    }
    return name;
  }

  function declareTransportPlan(input) {
    const adapter = normalizeAdapter(input && input.adapter);
    const plan = {
      kind: "omi.autonomous-world.transport-plan",
      plan_id: String(input && input.plan_id || "transport." + adapter),
      adapter: adapter,
      endpoint: String(input && input.endpoint || "declared.transport-only"),
      mode: String(input && input.mode || "offer-carrier"),
      authority: false,
      opens_live_resource: false,
      transport_plan_receipt: null
    };
    plan.transport_plan_receipt = fnv1a(stableString({
      plan_id: plan.plan_id,
      adapter: plan.adapter,
      endpoint: plan.endpoint,
      mode: plan.mode,
      authority: plan.authority,
      opens_live_resource: plan.opens_live_resource
    }));
    return plan;
  }

  function eventReceipt(event) {
    return fnv1a(stableString({
      event_id: event.event_id,
      transport_plan_receipt: event.transport_plan.transport_plan_receipt,
      adapter: event.adapter,
      endpoint: event.endpoint,
      offer_receipt: event.offer_receipt,
      offered_package_receipt: event.offered_package_receipt,
      peer_id: event.peer_id,
      transport_success: event.transport_success,
      authority: event.authority,
      admission: event.admission
    }));
  }

  function createTransportEvent(planInput, offer, syncPackage, options) {
    const plan = planInput && planInput.transport_plan_receipt
      ? clone(planInput)
      : declareTransportPlan(planInput);
    const event = {
      kind: "omi.autonomous-world.transport-event",
      event_id: String(options && options.event_id || "event." + plan.plan_id + "." + (offer && offer.offer_receipt || "missing-offer")),
      transport_plan: plan,
      adapter: plan.adapter,
      endpoint: plan.endpoint,
      offered_package_receipt: offer && offer.offered_package_receipt || null,
      offer_receipt: offer && offer.offer_receipt || null,
      peer_id: offer && offer.peer_id || null,
      transport_success: !(options && options.transport_success === false),
      authority: false,
      admission: false,
      offer: clone(offer || {}),
      package: clone(syncPackage || null),
      transport_event_receipt: null
    };
    event.transport_event_receipt = eventReceipt(event);
    return event;
  }

  function processTransportEvent(registry, eventInput, subscriptionInput) {
    const event = clone(eventInput || {});
    const exchange = event.transport_success
      ? autonomousWorldPeerExchange.receivePackage(registry, event.offer, event.package)
      : autonomousWorldPeerExchange.receivePackage(registry, event.offer, null);
    const subscription = subscriptionInput && subscriptionInput.subscription_receipt
      ? clone(subscriptionInput)
      : autonomousWorldSubscriptionCourt.declareSubscription(subscriptionInput);
    const evaluation = autonomousWorldSubscriptionCourt.evaluateSubscription(subscription, exchange);
    const processing = {
      kind: "omi.autonomous-world.transport-processing",
      transport_event_receipt: event.transport_event_receipt || null,
      transport_success: !!event.transport_success,
      exchange: exchange,
      subscription_evaluation: evaluation,
      accepted_snapshot_identities: evaluation.admitted_snapshot_identities.slice().sort(),
      authority: false,
      processing_receipt: null
    };
    processing.processing_receipt = fnv1a(stableString({
      transport_event_receipt: processing.transport_event_receipt,
      transport_success: processing.transport_success,
      exchange_receipt: exchange.exchange_receipt,
      evaluation_receipt: evaluation.evaluation_receipt,
      accepted_snapshot_identities: processing.accepted_snapshot_identities,
      authority: processing.authority
    }));
    return processing;
  }

  function openTransportSnapshot(processing, identity) {
    return autonomousWorldSubscriptionCourt.openSubscribedSnapshot(
      processing.subscription_evaluation,
      processing.exchange,
      identity
    );
  }

  function renderTransportSnapshot(processing, identity, options) {
    return autonomousWorldSubscriptionCourt.renderSubscribedSnapshot(
      processing.subscription_evaluation,
      processing.exchange,
      identity,
      options || {}
    );
  }

  return {
    listTransportAdapters: listTransportAdapters,
    declareTransportPlan: declareTransportPlan,
    createTransportEvent: createTransportEvent,
    processTransportEvent: processTransportEvent,
    openTransportSnapshot: openTransportSnapshot,
    renderTransportSnapshot: renderTransportSnapshot
  };
}));
