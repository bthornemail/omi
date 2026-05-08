(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./geometric_reconciliation.js") : root.OMIGeometricReconciliation
  );
  root.OMIFractalSubchartUnfolder = api;
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

  function normalizeTarget(target) {
    if (target && typeof target === "object") {
      return {
        id: String(target.id || target.path || target.omi_path || target.scene_id || "composer.scene"),
        carrier: String(target.carrier || target.omi_carrier || "Code16K"),
        witness: String(target.witness || target.omi_witness || ""),
        scope: String(target.scope || target.omi_scope || ""),
        scene: String(target.scene || target.scene_id || "")
      };
    }
    return {
      id: String(target || "composer.scene"),
      carrier: "Code16K",
      witness: "",
      scope: "",
      scene: ""
    };
  }

  function createFractalSubchartUnfolder(target, options) {
    const declared = normalizeTarget(target);
    const config = options && typeof options === "object" ? options : {};
    const identity = geometricReconciliation.reconcileDeclaredObject(declared.id, {
      scene: config.scene || declared.scene || "",
      context: config.context || ""
    });
    const vertex = geometricReconciliation.describeResolution("vertex");
    const subchart = geometricReconciliation.describeResolution("subchart");
    const chart = geometricReconciliation.defaultTwoCubeDifferential();
    let mode = String(config.mode || "lazy").toLowerCase() === "greedy" ? "greedy" : "lazy";

    function sealedAddress() {
      return {
        path: declared.id,
        carrier: declared.carrier,
        witness: declared.witness || identity.views.lazy.witness,
        scope: declared.scope,
        scene: declared.scene
      };
    }

    function baseSnapshot(currentMode) {
      const open = currentMode === "greedy";
      const viewReceipt = open ? identity.greedy_receipt : identity.lazy_receipt;
      const modeReceipt = fnv1a(stableString({
        declared: declared.id,
        mode: currentMode,
        identity: identity.identity_receipt,
        view: viewReceipt
      }));
      return {
        mode: currentMode,
        declared: declared.id,
        carrier: declared.carrier,
        identity_receipt: identity.identity_receipt,
        view_receipt: viewReceipt,
        witness: open ? chart.witness : vertex.witness,
        sealed_address: sealedAddress(),
        vertex: clone(vertex),
        subchart: clone(subchart),
        chart: open ? clone(chart) : null,
        open_receipt: open ? modeReceipt : 0,
        refold_receipt: open ? 0 : modeReceipt,
        resolution: open ? clone(subchart) : clone(vertex),
        frame_difference: open ? {
          origin: clone(chart.origin),
          classes: clone(chart.difference_classes),
          labels: clone(chart.difference_labels)
        } : null
      };
    }

    function openSubchart() {
      mode = "greedy";
      return baseSnapshot(mode);
    }

    function refoldSubchart() {
      mode = "lazy";
      return baseSnapshot(mode);
    }

    function toggle() {
      return mode === "lazy" ? openSubchart() : refoldSubchart();
    }

    function snapshot() {
      return baseSnapshot(mode);
    }

    return {
      declared: declared.id,
      getMode: function () { return mode; },
      openSubchart: openSubchart,
      refoldSubchart: refoldSubchart,
      toggle: toggle,
      snapshot: snapshot,
      identityReceipt: function () { return identity.identity_receipt; },
      lazyReceipt: function () { return identity.lazy_receipt; },
      greedyReceipt: function () { return identity.greedy_receipt; },
      vertexReceipt: function () { return vertex.witness; },
      subchartReceipt: function () { return subchart.witness; }
    };
  }

  return {
    createFractalSubchartUnfolder: createFractalSubchartUnfolder
  };
}));
