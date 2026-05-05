(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./export_pipeline.js") : root.OMIExportPipeline,
    typeof require === "function" ? require("./graphics_backend_equivalence.js") : root.OMIGraphicsBackendEquivalence,
    typeof require === "function" ? require("./gpu_command_stream.js") : root.OMIGPUCommandStream,
    typeof require === "function" ? require("./polyform_coordinate.js") : root.OMIPolyformCoordinate,
    typeof require === "function" ? require("./composition_scene.js") : root.OMICompositionScene
  );
  root.OMIVisualArtifactEquivalence = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  exportPipeline,
  graphicsBackendEquivalence,
  gpuCommandStream,
  polyformCoordinate,
  compositionScene
) {
  "use strict";

  function fnv1a(text) {
    return artifactIdentity.fnv1a(text);
  }

  function stableString(value) {
    return artifactIdentity.stableString(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function parseAttrs(text) {
    const attrs = {};
    String(text || "").replace(/([a-zA-Z0-9:-]+)="([^"]*)"/g, function (_, key, value) {
      attrs[key] = value;
      return _;
    });
    return attrs;
  }

  function normalizeNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function normalizeRoot(meta) {
    if (!meta) {
      return null;
    }
    return {
      omi_path: String(meta.omi_path || meta.omi_root || meta.scene_id || ""),
      coordinate_receipt: normalizeNumber(meta.coordinate_receipt || meta.omi_coordinate_receipt),
      closure_receipt: normalizeNumber(meta.closure_receipt || meta.omi_closure_receipt),
      scope: String(meta.scope || meta.omi_scope || ""),
      carrier: normalizeNumber(meta.carrier !== undefined ? meta.carrier : meta.omi_carrier),
      witness: normalizeNumber(meta.witness || meta.omi_witness),
      projection_intent: String(meta.projection_intent || meta.omi_projection_intent || "")
    };
  }

  function rootReceipt(root) {
    return fnv1a(stableString(root));
  }

  function parseSvgSummary(svgText) {
    const text = String(svgText || "");
    const open = text.match(/<svg\b([^>]*)>/);
    if (!open) {
      return null;
    }
    const attrs = parseAttrs(open[1]);
    const root = normalizeRoot({
      omi_path: attrs["data-omi-path"] || attrs["data-omi-root"] || "",
      coordinate_receipt: attrs["data-omi-coordinate-receipt"],
      closure_receipt: attrs["data-omi-closure-receipt"],
      scope: attrs["data-omi-scope"],
      carrier: attrs["data-omi-carrier"],
      witness: attrs["data-omi-witness"],
      projection_intent: attrs["data-omi-projection-intent"]
    });
    if (!root || !root.omi_path) {
      return null;
    }
    return {
      kind: "svg",
      root: root,
      root_receipt: rootReceipt(root),
      raw_length: text.length
    };
  }

  function parseGltfSummary(gltf) {
    const value = typeof gltf === "string" ? JSON.parse(gltf) : gltf;
    if (!value || !value.extras) {
      return null;
    }
    const root = normalizeRoot(value.extras);
    if (!root || !root.omi_path) {
      return null;
    }
    return {
      kind: "gltf",
      root: root,
      root_receipt: rootReceipt(root),
      node_count: Array.isArray(value.nodes) ? value.nodes.length : 0
    };
  }

  function parseObjSummary(bundle) {
    const receipt = JSON.parse(bundle.receipt || "{}");
    const root = normalizeRoot({
      omi_path: receipt.omi_root || receipt.omi_path || "",
      coordinate_receipt: receipt.omi_coordinate_receipt,
      closure_receipt: receipt.omi_closure_receipt,
      scope: receipt.omi_scope,
      carrier: receipt.omi_carrier,
      witness: receipt.omi_witness,
      projection_intent: receipt.omi_projection_intent
    });
    if (!root || !root.omi_path) {
      return null;
    }
    return {
      kind: "obj-mtl",
      root: root,
      root_receipt: rootReceipt(root),
      object_count: receipt.objects ? Object.keys(receipt.objects).length : 0
    };
  }

  function parsePlanSummary(plan) {
    const normalized = plan && plan.counts && plan.root_metadata
      ? plan
      : graphicsBackendEquivalence.normalizePlan(plan);
    if (!normalized) {
      return null;
    }
    const root = normalizeRoot(normalized.root_metadata || normalized.metadata);
    if (!root || !root.omi_path) {
      return null;
    }
    return {
      kind: normalized.backend,
      root: root,
      root_receipt: rootReceipt(root),
      counts: clone(normalized.counts)
    };
  }

  function normalizeArtifact(kind, artifact) {
    const type = String(kind || "").toLowerCase();
    if (type === "svg") {
      return parseSvgSummary(artifact);
    }
    if (type === "gltf") {
      return parseGltfSummary(artifact);
    }
    if (type === "obj" || type === "obj-mtl") {
      return parseObjSummary(artifact);
    }
    if (type === "webgl-plan" || type === "webgl") {
      return parsePlanSummary(artifact);
    }
    if (type === "gles-plan" || type === "gles") {
      return parsePlanSummary(artifact);
    }
    if (type === "opengl-plan" || type === "opengl") {
      return parsePlanSummary(artifact);
    }
    return null;
  }

  function sceneBlocks(document) {
    const paths = [
      document.id + "/form/body",
      document.id + "/motion/wheel.left",
      document.id + "/motion/wheel.right",
      document.id + "/motion/tow-arm"
    ];
    return paths.map(function (path) {
      return polyformCoordinate.fromPath(document, path);
    }).filter(Boolean);
  }

  function sceneTemplates(state) {
    if (state && state.scene && Array.isArray(state.scene.components) && state.scene.components.length > 0) {
      return state.scene.components.map(function (component) {
        return {
          omi_path: component.path,
          carrier: component.carrier,
          scope: component.scope,
          witness: component.witness,
          coordinate_receipt: fnv1a(component.path + "|coordinate|" + (state.scene.id || "")),
          closure_receipt: fnv1a(component.path + "|closure|" + (state.scene.id || ""))
        };
      });
    }
    if (state && state.lastImport && state.lastImport.template) {
      return [{
        omi_path: state.lastImport.template.omi_path,
        carrier: state.lastImport.template.carrier,
        scope: state.lastImport.template.scope,
        witness: state.lastImport.template.witness,
        coordinate_receipt: Number(state.lastImport.template.coordinate_receipt || 0),
        closure_receipt: Number(state.lastImport.template.closure_receipt || 0)
      }];
    }
    return [];
  }

  function buildStream(state, mode) {
    const scene = compositionScene.createScene(state.scene && state.scene.id ? state.scene.id : "composer.scene");
    if (mode === "barcode-template-scene") {
      return gpuCommandStream.project({
        mode: mode,
        scene: scene,
        templates: sceneTemplates(state)
      });
    }
    if (mode === "scope-graph-3d") {
      const blocks = sceneBlocks(state.document);
      if (blocks.length >= 2) {
        const edge = {
          from_coord_receipt: blocks[0].receipt_hash,
          to_coord_receipt: blocks[1].receipt_hash,
          closure_receipt: fnv1a(blocks[0].receipt_hash + "|" + blocks[1].receipt_hash),
          visibility: "public",
          location: "global",
          carrier: 255,
          orientation4: 0,
          sexagesimal_slot: 0,
          public_frame240: 0,
          scope_class: "public.global",
          receipt: fnv1a(blocks[0].receipt_hash + "|" + blocks[1].receipt_hash + "|edge")
        };
        return gpuCommandStream.project({
          mode: mode,
          scene: scene,
          edges: [edge]
        });
      }
    }
    return gpuCommandStream.project({
      mode: mode,
      scene: scene,
      blocks: sceneBlocks(state.document)
    });
  }

  function compareState(state, options) {
    const mode = options && options.mode ? options.mode : (state.document && state.document.kind === "world" ? "barcode-template-scene" : "polyform-3d");
    const canonical = normalizeRoot(artifactIdentity.rootMetadata(state.scene && state.scene.id ? state.scene.id : state.document.id));
    const exports = exportPipeline.exportAll(state);
    const stream = buildStream(state, mode);
    const backendComparison = graphicsBackendEquivalence.compareFromStream(stream, mode);
    if (!backendComparison) {
      return null;
    }

    const summaries = {
      canonical: canonical,
      svg: parseSvgSummary(exports["scene.svg"]),
      gltf: parseGltfSummary(JSON.parse(exports["scene.gltf.json"])),
      obj: parseObjSummary(JSON.parse(JSON.stringify(exports["scene.obj.mtl"]))),
      webgl: parsePlanSummary(backendComparison.summaries[0]),
      gles: parsePlanSummary(backendComparison.summaries[1]),
      opengl: parsePlanSummary(backendComparison.summaries[2])
    };

    if (!summaries.svg || !summaries.gltf || !summaries.obj || !summaries.webgl || !summaries.gles || !summaries.opengl) {
      return null;
    }

    const same = [
      summaries.svg.root,
      summaries.gltf.root,
      summaries.obj.root,
      summaries.webgl.root,
      summaries.gles.root,
      summaries.opengl.root
    ].every(function (root) {
      return stableString(root) === stableString(canonical);
    }) && backendComparison.same === true;

    return {
      same: same,
      canonical: canonical,
      backend: backendComparison,
      summaries: summaries,
      receipt: fnv1a(stableString({
        canonical: canonical,
        svg: summaries.svg.root,
        gltf: summaries.gltf.root,
        obj: summaries.obj.root,
        webgl: summaries.webgl.root,
        gles: summaries.gles.root,
        opengl: summaries.opengl.root
      }))
    };
  }

  function compareArtifacts(options) {
    return compareState(options.state, options);
  }

  return {
    parseSvgSummary: parseSvgSummary,
    parseGltfSummary: parseGltfSummary,
    parseObjSummary: parseObjSummary,
    parsePlanSummary: parsePlanSummary,
    normalizeArtifact: normalizeArtifact,
    buildStream: buildStream,
    compareState: compareState,
    compareArtifacts: compareArtifacts
  };
}));
