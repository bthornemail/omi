(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./geometric_reconciliation.js") : root.OMIGeometricReconciliation,
    typeof require === "function" ? require("./view_switcher.js") : root.OMIViewSwitcher
  );
  root.OMIAnimationTimeline = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (geometricReconciliation, viewSwitcher) {
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

  function normalizeFrame(frame, frameCount) {
    const count = Number(frameCount || geometricReconciliation.TIMING.master_reconciliation);
    const value = Number(frame || 0);
    if (!Number.isFinite(value)) {
      return 0;
    }
    return ((value % count) + count) % count;
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

  function createAnimationTimeline(target, options) {
    const declared = normalizeTarget(target);
    const config = options && typeof options === "object" ? options : {};
    const frameCount = Number(config.frameCount || geometricReconciliation.TIMING.master_reconciliation);
    const sweep = Number(config.localSweep || geometricReconciliation.TIMING.local_sweep);
    const publicFrame = Number(config.publicFrame || geometricReconciliation.TIMING.public_frame);
    const period = Number(config.period || geometricReconciliation.TIMING.master_reconciliation);
    const switcher = config.viewSwitcher || viewSwitcher.createViewSwitcher(declared.id, {
      scene: declared.scene,
      mode: "animated"
    });
    let frame = normalizeFrame(config.frame || 0, frameCount);

    function frameState(requestedFrame) {
      const normalized = normalizeFrame(requestedFrame, frameCount);
      const animatedView = switcher.setMode("animated");
      const differenceClass = (normalized % geometricReconciliation.TIMING.difference_classes) + 1;
      const differenceLabel = animatedView.chart && Array.isArray(animatedView.chart.difference_labels)
        ? animatedView.chart.difference_labels[(differenceClass - 1) % animatedView.chart.difference_labels.length]
        : String(differenceClass);
      const publicFrameSlot = normalized % publicFrame;
      const sexagesimalSlot = normalized % sweep;
      const courtBoundary = normalized === 0 ? "court-boundary" : "interior";
      const frameReceipt = fnv1a(stableString({
        declared: declared.id,
        frame: normalized,
        boundary: courtBoundary,
        identity: animatedView.identity_receipt,
        view_receipt: animatedView.view_receipt
      }));
      return {
        mode: "animated",
        declared: declared.id,
        carrier: declared.carrier,
        witness: animatedView.witness,
        identity_receipt: animatedView.identity_receipt,
        view_receipt: animatedView.view_receipt,
        frame: normalized,
        requested_frame: Number(requestedFrame || 0),
        frame_count: frameCount,
        court_boundary: courtBoundary,
        boundary_frame: 0,
        reconciled_frame: normalized === 0 ? 0 : normalized,
        frame_receipt: frameReceipt,
        timeline: {
          master_reconciliation: period,
          local_sweep: sweep,
          public_frame: publicFrame,
          sexagesimal_slot: sexagesimalSlot,
          public_frame_slot: publicFrameSlot,
          difference_class: differenceClass,
          difference_label: differenceLabel
        },
        animation: {
          coordination: "sexagesimal rolling difference",
          frame: normalized,
          period: period,
          difference_class: differenceClass,
          difference_label: differenceLabel,
          public_frame: publicFrameSlot,
          sexagesimal_slot: sexagesimalSlot
        },
        view: clone(animatedView)
      };
    }

    function seek(nextFrame) {
      frame = normalizeFrame(nextFrame, frameCount);
      return frameState(frame);
    }

    function next() {
      return seek(frame + 1);
    }

    function previous() {
      return seek(frame - 1);
    }

    function snapshot() {
      return frameState(frame);
    }

    return {
      declared: declared.id,
      frameCount: frameCount,
      getFrame: function () { return frame; },
      seek: seek,
      next: next,
      previous: previous,
      snapshot: snapshot,
      identityReceipt: function () { return switcher.identityReceipt(); }
    };
  }

  return {
    createAnimationTimeline: createAnimationTimeline,
    normalizeFrame: normalizeFrame
  };
}));
