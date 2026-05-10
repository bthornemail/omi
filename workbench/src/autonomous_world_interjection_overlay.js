(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_browser.js") : root.OMIAutonomousWorldBrowser,
    typeof require === "function" ? require("./autonomous_world_live_renderer.js") : root.OMIAutonomousWorldLiveRenderer
  );
  root.OMIAutonomousWorldInterjectionOverlay = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldBrowser,
  autonomousWorldLiveRenderer
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

  function normalizeBrowser(input) {
    if (input && input.kind === "autonomous-world-browser") {
      return input;
    }
    return autonomousWorldBrowser.openWorld(input);
  }

  function normalizeInterjection(interjection) {
    const source = interjection && typeof interjection === "object" ? interjection : {};
    return {
      overlay_id: String(source.overlay_id || "overlay.interjection.001"),
      target_path: String(source.target_path || "world.autonomous-fixture/objects/trailer.001"),
      kind: String(source.kind || "annotation"),
      body: String(source.body || "observer note"),
      modality: String(source.modality || "projection.interjection"),
      observer: String(source.observer || "observer.local"),
      branch: String(source.branch || "branch.local")
    };
  }

  function createOverlay(input, interjection) {
    const browser = normalizeBrowser(input);
    const normalized = normalizeInterjection(interjection);
    const target = autonomousWorldBrowser.inspectPath(browser, normalized.target_path);
    const targetKind = normalized.target_path.indexOf("/interactions/") >= 0 ? "relation" :
      normalized.target_path.indexOf("spom/") === 0 ? "spom" : "object";
    const overlay = {
      kind: normalized.kind,
      overlay_id: normalized.overlay_id,
      target_path: normalized.target_path,
      target_kind: targetKind,
      target_found: Boolean(target) || targetKind === "spom",
      body: normalized.body,
      modality: normalized.modality,
      observer: normalized.observer,
      branch: normalized.branch,
      authority: false,
      world_identity_receipt: browser.identity_receipt,
      overlay_receipt: null,
      view_receipt: null
    };
    overlay.overlay_receipt = fnv1a(stableString({
      overlay_id: overlay.overlay_id,
      target_path: overlay.target_path,
      target_kind: overlay.target_kind,
      body: overlay.body,
      modality: overlay.modality,
      observer: overlay.observer,
      branch: overlay.branch,
      world_identity_receipt: overlay.world_identity_receipt
    }));
    overlay.view_receipt = fnv1a(stableString({
      overlay_receipt: overlay.overlay_receipt,
      target_path: overlay.target_path,
      modality: overlay.modality,
      projection: "interjection-overlay"
    }));
    return overlay;
  }

  function createBranchSnapshot(input, overlays, options) {
    const browser = normalizeBrowser(input);
    const list = Array.isArray(overlays) ? overlays : [overlays];
    const normalized = list.map(function (overlay) {
      return overlay && overlay.overlay_receipt ? overlay : createOverlay(browser, overlay);
    });
    const snapshot = {
      kind: "autonomous-world-interjection-branch-snapshot",
      world_id: browser.document.id,
      world_identity_receipt: browser.identity_receipt,
      branch_id: String(options && options.branch_id || "branch.interjection.001"),
      overlays: normalized.map(clone),
      authority: false,
      canonical_history: false,
      branch_receipt: null
    };
    snapshot.branch_receipt = fnv1a(stableString({
      world_id: snapshot.world_id,
      world_identity_receipt: snapshot.world_identity_receipt,
      branch_id: snapshot.branch_id,
      overlays: snapshot.overlays.map(function (overlay) {
        return overlay.overlay_receipt;
      })
    }));
    return snapshot;
  }

  function overlayBrowser(input, overlays) {
    const browser = normalizeBrowser(input);
    const list = Array.isArray(overlays) ? overlays : [overlays];
    const normalized = list.map(function (overlay) {
      return overlay && overlay.overlay_receipt ? overlay : createOverlay(browser, overlay);
    });
    return {
      kind: "autonomous-world-browser-overlay-projection",
      world_id: browser.document.id,
      identity_receipt: browser.identity_receipt,
      overlays: normalized.map(clone),
      overlay_count: normalized.length,
      authority: false,
      mutation: false,
      projection_receipt: fnv1a(stableString({
        world_id: browser.document.id,
        identity_receipt: browser.identity_receipt,
        overlays: normalized.map(function (overlay) {
          return overlay.overlay_receipt;
        })
      }))
    };
  }

  function overlayRenderPlan(input, overlays, options) {
    const browser = normalizeBrowser(input);
    const renderPlan = autonomousWorldLiveRenderer.createRenderPlan(browser, options);
    const list = Array.isArray(overlays) ? overlays : [overlays];
    const normalized = list.map(function (overlay) {
      return overlay && overlay.overlay_receipt ? overlay : createOverlay(browser, overlay);
    });
    const projected = Object.assign({}, renderPlan, {
      overlays: normalized.map(clone),
      overlay_count: normalized.length,
      overlay_projection_receipt: null,
      authority: false,
      mutation: false
    });
    projected.overlay_projection_receipt = fnv1a(stableString({
      render_receipt: renderPlan.render_receipt,
      identity_receipt: renderPlan.identity_receipt,
      overlays: normalized.map(function (overlay) {
        return overlay.overlay_receipt;
      })
    }));
    return projected;
  }

  function overlayReceiptPanel(input, overlays) {
    const browser = normalizeBrowser(input);
    const receipts = autonomousWorldBrowser.receiptPanel(browser);
    const list = Array.isArray(overlays) ? overlays : [overlays];
    const normalized = list.map(function (overlay) {
      return overlay && overlay.overlay_receipt ? overlay : createOverlay(browser, overlay);
    });
    return {
      identity_receipt: browser.identity_receipt,
      package: clone(receipts.package),
      raw_binary: clone(receipts.raw_binary),
      closure: clone(receipts.closure),
      overlays: normalized.map(function (overlay) {
        return {
          overlay_id: overlay.overlay_id,
          overlay_receipt: overlay.overlay_receipt,
          view_receipt: overlay.view_receipt,
          authority: false
        };
      }),
      authority: false
    };
  }

  return {
    createOverlay: createOverlay,
    createBranchSnapshot: createBranchSnapshot,
    overlayBrowser: overlayBrowser,
    overlayRenderPlan: overlayRenderPlan,
    overlayReceiptPanel: overlayReceiptPanel
  };
}));
