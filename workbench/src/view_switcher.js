(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./geometric_reconciliation.js") : root.OMIGeometricReconciliation
  );
  root.OMIViewSwitcher = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (geometricReconciliation) {
  "use strict";

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(value));
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

  function fnv1a(text) {
    let hash = 2166136261;
    const data = String(text || "");
    for (let i = 0; i < data.length; i += 1) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function normalizeDeclared(declared) {
    if (declared && typeof declared === "object") {
      return {
        id: String(declared.id || declared.path || declared.omi_path || declared.scene_id || "composer.scene"),
        carrier: String(declared.carrier || declared.omi_carrier || "Code16K"),
        witness: String(declared.witness || declared.omi_witness || ""),
        scope: String(declared.scope || declared.omi_scope || ""),
        scene: String(declared.scene || declared.scene_id || "")
      };
    }
    return {
      id: String(declared || "composer.scene"),
      carrier: "Code16K",
      witness: "",
      scope: "",
      scene: ""
    };
  }

  function createViewSwitcher(declared, options) {
    const target = normalizeDeclared(declared);
    const config = options && typeof options === "object" ? options : {};
    let mode = geometricReconciliation.normalizeViewName(config.mode || config.initialMode || "lazy") || "lazy";
    if (!geometricReconciliation.describeView(mode)) {
      throw new Error("unknown-view-mode");
    }
    const identity = geometricReconciliation.reconcileDeclaredObject(target.id, {
      scene: config.scene || target.scene || "",
      context: config.context || ""
    });
    const chart = geometricReconciliation.defaultTwoCubeDifferential();

    function snapshot() {
      const view = geometricReconciliation.describeView(mode);
      if (!view) {
        throw new Error("unknown-view-mode");
      }
      if (mode === "lazy") {
        return {
          mode: mode,
          declared: target.id,
          carrier: target.carrier,
          witness: target.witness || view.witness,
          identity_receipt: identity.identity_receipt,
          view_receipt: identity.lazy_receipt,
          declaration_surface: view.declaration_surface,
          geometry_surface: view.geometry_surface,
          reconciliation_surface: view.reconciliation_surface,
          sealed_address: {
            path: target.id,
            carrier: target.carrier,
            witness: target.witness || view.witness
          }
        };
      }
      if (mode === "greedy") {
        return {
          mode: mode,
          declared: target.id,
          carrier: target.carrier,
          witness: chart.witness,
          identity_receipt: identity.identity_receipt,
          view_receipt: identity.greedy_receipt,
          declaration_surface: view.declaration_surface,
          geometry_surface: view.geometry_surface,
          reconciliation_surface: view.reconciliation_surface,
          chart: clone(chart),
          rays: clone(chart.difference_rays),
          frame_difference: {
            origin: clone(chart.origin),
            classes: clone(chart.difference_classes),
            labels: clone(chart.difference_labels)
          }
        };
      }
      if (mode === "static") {
        return {
          mode: mode,
          declared: target.id,
          carrier: target.carrier,
          witness: identity.views.static.witness,
          identity_receipt: identity.identity_receipt,
          view_receipt: identity.static_receipt,
          declaration_surface: view.declaration_surface,
          geometry_surface: view.geometry_surface,
          reconciliation_surface: view.reconciliation_surface,
          declared_space: stableString({
            id: target.id,
            scene: target.scene,
            scope: target.scope
          }),
          reconciliation: {
            lazy: identity.lazy_receipt,
            greedy: identity.greedy_receipt,
            static: identity.static_receipt,
            animated: identity.animated_receipt
          }
        };
      }
      return {
        mode: mode,
        declared: target.id,
        carrier: target.carrier,
        witness: chart.witness,
        identity_receipt: identity.identity_receipt,
        view_receipt: identity.animated_receipt,
        declaration_surface: view.declaration_surface,
        geometry_surface: view.geometry_surface,
        reconciliation_surface: view.reconciliation_surface,
        timeline: {
          master_reconciliation: chart.master_reconciliation,
          local_sweep: chart.rolling_sweep,
          public_frame: chart.public_frame,
          frame_labels: clone(chart.frame_labels || chart.difference_labels)
        },
        animated: {
          coordination: "sexagesimal rolling difference",
          frames: clone(chart.difference_labels),
          period: geometricReconciliation.TIMING.master_reconciliation
        },
        chart: clone(chart)
      };
    }

    function setMode(nextMode) {
      const normalized = geometricReconciliation.normalizeViewName(nextMode);
      if (!geometricReconciliation.describeView(normalized)) {
        throw new Error("unknown-view-mode");
      }
      mode = normalized;
      return snapshot();
    }

    function toggle() {
      const order = ["lazy", "greedy", "static", "animated"];
      const index = order.indexOf(mode);
      const next = order[(index + 1) % order.length];
      return setMode(next);
    }

    return {
      declared: target.id,
      getMode: function () { return mode; },
      setMode: setMode,
      toggle: toggle,
      snapshot: snapshot,
      viewReceipt: function () {
        if (mode === "lazy") { return identity.lazy_receipt; }
        if (mode === "greedy") { return identity.greedy_receipt; }
        if (mode === "static") { return identity.static_receipt; }
        if (mode === "animated") { return identity.animated_receipt; }
        return 0;
      },
      identityReceipt: function () { return identity.identity_receipt; }
    };
  }

  return {
    createViewSwitcher: createViewSwitcher
  };
}));
