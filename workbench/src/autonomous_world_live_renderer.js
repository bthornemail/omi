(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_browser.js") : root.OMIAutonomousWorldBrowser
  );
  root.OMIAutonomousWorldLiveRenderer = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldBrowser
) {
  "use strict";

  const DEFAULT_PERIOD = 5040;

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

  function normalizeCamera(camera) {
    const source = camera && typeof camera === "object" ? camera : {};
    return {
      mode: String(source.mode || "orthographic"),
      target: String(source.target || "world.root"),
      zoom: Number.isFinite(source.zoom) ? source.zoom : 1,
      orbit: Number.isFinite(source.orbit) ? source.orbit : 0
    };
  }

  function normalizeTimeline(timeline) {
    const source = timeline && typeof timeline === "object" ? timeline : {};
    const period = Number.isInteger(source.period) && source.period > 0 ? source.period : DEFAULT_PERIOD;
    const frame = Number.isInteger(source.frame) ? source.frame : 0;
    return {
      frame: ((frame % period) + period) % period,
      period: period,
      phase: String(source.phase || "render")
    };
  }

  function renderObject(object, index) {
    return {
      id: object.id,
      path: object.path,
      label: object.label,
      ordinal: index,
      primitive: "world-object-node",
      inspector_path: object.path,
      authority: false
    };
  }

  function renderRelation(relation, index) {
    return {
      id: relation.id,
      path: relation.path,
      source: relation.source,
      target: relation.target,
      relation: relation.relation,
      ordinal: index,
      primitive: "world-relation-edge",
      inspector_path: relation.path,
      authority: false
    };
  }

  function spomPath(triplet, index) {
    return {
      id: "spom." + index,
      path: [
        "spom",
        String(index),
        encodeURIComponent(String(triplet.subject)),
        encodeURIComponent(String(triplet.predicate)),
        encodeURIComponent(String(triplet.object))
      ].join("/"),
      subject: triplet.subject,
      predicate: triplet.predicate,
      object: triplet.object,
      modality: triplet.modality || "projection",
      authority: false
    };
  }

  function createRenderPlan(input, options) {
    const config = options && typeof options === "object" ? options : {};
    const browser = normalizeBrowser(input);
    const viewMode = String(config.view_mode || config.mode || "greedy");
    const view = autonomousWorldBrowser.setViewMode(browser, viewMode);
    const camera = normalizeCamera(config.camera);
    const timeline = normalizeTimeline(config.timeline);
    const objects = autonomousWorldBrowser.listObjects(browser).map(renderObject);
    const relations = autonomousWorldBrowser.listRelations(browser).map(renderRelation);
    const spom = autonomousWorldBrowser.browseSpom(browser);
    const spomPaths = spom.triplets.map(spomPath);
    const receipts = autonomousWorldBrowser.receiptPanel(browser);
    const plan = {
      kind: "autonomous-world-render-plan",
      world_id: browser.document.id,
      identity_receipt: browser.identity_receipt,
      render_receipt: null,
      view_mode: view.mode,
      view_receipt: view.view_receipt,
      camera: camera,
      timeline: timeline,
      objects: objects,
      relations: relations,
      spom_paths: spomPaths,
      receipts: receipts,
      authority: false,
      mutation: false
    };
    plan.render_receipt = fnv1a(stableString({
      kind: plan.kind,
      world_id: plan.world_id,
      identity_receipt: plan.identity_receipt,
      view_mode: plan.view_mode,
      view_receipt: plan.view_receipt,
      camera: plan.camera,
      timeline: plan.timeline,
      objects: plan.objects,
      relations: plan.relations,
      spom_paths: plan.spom_paths,
      receipts: plan.receipts
    }));
    return plan;
  }

  function createAnimationPlan(input, options) {
    const config = options && typeof options === "object" ? options : {};
    const frameCount = Number.isInteger(config.frame_count) && config.frame_count > 0 ? config.frame_count : 4;
    const baseTimeline = normalizeTimeline(config.timeline);
    const frames = [];
    for (let i = 0; i < frameCount; i += 1) {
      frames.push(createRenderPlan(input, {
        view_mode: config.view_mode || "animated",
        camera: config.camera,
        timeline: {
          frame: baseTimeline.frame + i,
          period: baseTimeline.period,
          phase: "animation"
        }
      }));
    }
    const first = frames[0];
    const animation = {
      kind: "autonomous-world-animation-plan",
      world_id: first.world_id,
      identity_receipt: first.identity_receipt,
      animation_receipt: null,
      timeline: {
        frame: baseTimeline.frame,
        period: baseTimeline.period,
        frame_count: frameCount
      },
      frames: frames.map(function (frame) {
        return {
          frame: frame.timeline.frame,
          render_receipt: frame.render_receipt,
          view_receipt: frame.view_receipt,
          identity_receipt: frame.identity_receipt,
          authority: false
        };
      }),
      receipts: clone(first.receipts),
      authority: false,
      mutation: false
    };
    animation.animation_receipt = fnv1a(stableString({
      kind: animation.kind,
      world_id: animation.world_id,
      identity_receipt: animation.identity_receipt,
      timeline: animation.timeline,
      frames: animation.frames,
      receipts: animation.receipts
    }));
    return animation;
  }

  function renderSummary(input, options) {
    const renderPlan = createRenderPlan(input, options);
    const animationPlan = createAnimationPlan(input, options);
    return {
      kind: "autonomous-world-live-renderer-summary",
      world_id: renderPlan.world_id,
      identity_receipt: renderPlan.identity_receipt,
      render_receipt: renderPlan.render_receipt,
      animation_receipt: animationPlan.animation_receipt,
      object_path_count: renderPlan.objects.length,
      relation_path_count: renderPlan.relations.length,
      spom_path_count: renderPlan.spom_paths.length,
      authority: false,
      mutation: false
    };
  }

  return {
    createRenderPlan: createRenderPlan,
    createAnimationPlan: createAnimationPlan,
    renderSummary: renderSummary
  };
}));
