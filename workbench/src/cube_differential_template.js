(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./barcode_template.js") : root.OMIBarcodeTemplate,
    typeof require === "function" ? require("./geometric_reconciliation.js") : root.OMIGeometricReconciliation
  );
  root.OMICubeDifferentialTemplate = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (barcodeTemplate, geometricReconciliation) {
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

  function normalizeMode(value) {
    const text = String(value || "").trim().toLowerCase();
    if (text === "greedy" || text === "chart" || text === "unfolded") {
      return "greedy";
    }
    return "lazy";
  }

  function normalizeTarget(target) {
    if (target && typeof target === "object") {
      return {
        omi_path: String(target.omi_path || target.path || target.id || "diagram.two-cube-differential"),
        carrier: String(target.carrier || "Code16K"),
        scope: String(target.scope || "protected.local"),
        witness: String(target.witness || "")
      };
    }
    return {
      omi_path: String(target || "diagram.two-cube-differential"),
      carrier: "Code16K",
      scope: "protected.local",
      witness: ""
    };
  }

  function chartWitness() {
    return geometricReconciliation.defaultTwoCubeDifferential();
  }

  function baseTemplate(target, mode) {
    const chart = chartWitness();
    const declared = normalizeTarget(target);
    const normalizedMode = normalizeMode(mode);
    const identity = geometricReconciliation.reconcileDeclaredObject(declared.omi_path, {
      scene: declared.omi_path,
      context: "cube-differential"
    });
    const witness = declared.witness || String(chart.witness);
    const template = {
      format: "omi-svg-template",
      kind: "cube-differential-template",
      mode: normalizedMode,
      omi_path: declared.omi_path,
      carrier: declared.carrier,
      scope: declared.scope,
      witness: witness,
      coordinate_receipt: identity.identity_receipt,
      closure_receipt: chart.witness,
      source_receipt: fnv1a(stableString({
        path: declared.omi_path,
        mode: normalizedMode,
        chart: chart.witness
      }))
    };
    return {
      declared: declared,
      mode: normalizedMode,
      identity: identity,
      chart: chart,
      template: template
    };
  }

  function toSvg(target, mode) {
    const state = baseTemplate(target, mode);
    const svg = barcodeTemplate.toSvg({
      omi_path: state.template.omi_path,
      carrier: state.template.carrier,
      scope: state.template.scope,
      witness: state.template.witness
    });
    const attrs = [
      'data-omi-view="' + state.mode + '"',
      'data-omi-difference-count="' + String(state.chart.difference_count) + '"',
      'data-omi-rolling-sweep="' + String(state.chart.rolling_sweep) + '"',
      'data-omi-public-frame="' + String(state.chart.public_frame) + '"',
      'data-omi-master-reconciliation="' + String(state.chart.master_reconciliation) + '"'
    ].join(" ");
    return svg.replace(/^<svg\b([^>]*)>/, function (_, existing) {
      return "<svg" + existing + " " + attrs + ">";
    });
  }

  function fromSvg(svgText) {
    const template = barcodeTemplate.fromSvg(svgText);
    if (!template) {
      return null;
    }
    const text = String(svgText || "");
    const modeMatch = text.match(/data-omi-view="([^"]*)"/);
    const diffMatch = text.match(/data-omi-difference-count="([^"]*)"/);
    const sweepMatch = text.match(/data-omi-rolling-sweep="([^"]*)"/);
    const publicFrameMatch = text.match(/data-omi-public-frame="([^"]*)"/);
    const masterMatch = text.match(/data-omi-master-reconciliation="([^"]*)"/);
    return {
      format: template.format,
      kind: "cube-differential-template",
      mode: normalizeMode(modeMatch && modeMatch[1]),
      template: template,
      difference_count: Number(diffMatch && diffMatch[1] ? diffMatch[1] : 0),
      rolling_sweep: Number(sweepMatch && sweepMatch[1] ? sweepMatch[1] : geometricReconciliation.TIMING.local_sweep),
      public_frame: Number(publicFrameMatch && publicFrameMatch[1] ? publicFrameMatch[1] : geometricReconciliation.TIMING.public_frame),
      master_reconciliation: Number(masterMatch && masterMatch[1] ? masterMatch[1] : geometricReconciliation.TIMING.master_reconciliation),
      chart: clone(chartWitness())
    };
  }

  function createCubeDifferentialComponent(target, options) {
    const initial = baseTemplate(target, options && options.mode ? options.mode : "lazy");
    let mode = initial.mode;

    function snapshot() {
      const state = baseTemplate(initial.declared, mode);
      return {
        mode: mode,
        declared: state.declared.omi_path,
        identity_receipt: state.identity.identity_receipt,
        view_receipt: mode === "lazy" ? state.identity.lazy_receipt : state.identity.greedy_receipt,
        witness: state.chart.witness,
        chart: clone(state.chart),
        template: {
          format: state.template.format,
          kind: state.template.kind,
          mode: state.template.mode,
          omi_path: state.template.omi_path,
          carrier: state.template.carrier,
          scope: state.template.scope,
          witness: state.template.witness,
          coordinate_receipt: state.template.coordinate_receipt,
          closure_receipt: state.template.closure_receipt,
          source_receipt: state.template.source_receipt
        },
        svg: toSvg(state.declared, mode),
        sealed_address: {
          path: state.declared.omi_path,
          carrier: state.declared.carrier,
          scope: state.declared.scope,
          witness: state.template.witness
        }
      };
    }

    function setMode(nextMode) {
      const normalized = normalizeMode(nextMode);
      mode = normalized;
      return snapshot();
    }

    function toggle() {
      mode = mode === "lazy" ? "greedy" : "lazy";
      return snapshot();
    }

    return {
      declared: initial.declared.omi_path,
      getMode: function () { return mode; },
      setMode: setMode,
      toggle: toggle,
      snapshot: snapshot,
      svg: function () { return toSvg(initial.declared, mode); },
      lazySvg: function () { return toSvg(initial.declared, "lazy"); },
      greedySvg: function () { return toSvg(initial.declared, "greedy"); },
      fromSvg: fromSvg,
      identityReceipt: function () { return initial.identity.identity_receipt; },
      chartWitness: function () { return initial.chart.witness; }
    };
  }

  return {
    createCubeDifferentialComponent: createCubeDifferentialComponent,
    toSvg: toSvg,
    fromSvg: fromSvg,
    normalizeMode: normalizeMode
  };
}));
