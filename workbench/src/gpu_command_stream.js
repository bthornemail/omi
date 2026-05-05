(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./polyform_coordinate.js") : root.OMIPolyformCoordinate,
    typeof require === "function" ? require("./scope_multigraph.js") : root.OMIScopeMultigraph,
    typeof require === "function" ? require("./composition_scene.js") : root.OMICompositionScene
  );
  root.OMIGPUCommandStream = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (polyformCoordinate, scopeMultigraph, compositionScene) {
  "use strict";

  const MODES = [
    "polyform-2d",
    "polyform-2_5d",
    "polyform-3d",
    "scope-graph-3d",
    "barcode-template-scene"
  ];

  function fnv1a(text) {
    let hash = 2166136261;
    const data = String(text || "");
    for (let i = 0; i < data.length; i += 1) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
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

  function beginScene(scene, mode) {
    return {
      kind: "BEGIN_SCENE",
      scene_id: scene.id,
      mode: mode,
      witness: fnv1a(scene.id + "|" + mode)
    };
  }

  function endScene(scene, mode, commands) {
    return {
      kind: "END_SCENE",
      scene_id: scene.id,
      mode: mode,
      witness: fnv1a(scene.id + "|" + mode + "|" + commands.length)
    };
  }

  function attachMetadata(command, payload) {
    return Object.assign({}, command, {
      metadata: {
        omi_path: payload.omi_path || "",
        coordinate_receipt: payload.coordinate_receipt || 0,
        closure_receipt: payload.closure_receipt || 0,
        scope: payload.scope || "",
        carrier: payload.carrier == null ? 255 : payload.carrier,
        witness: payload.witness || 0
      }
    });
  }

  function defineBlock(block, index, mode) {
    return attachMetadata({
      kind: "DEFINE_BLOCK",
      block_id: "block." + index,
      geometry: {
        basis: block.basis,
        degree: block.degree,
        sign: block.sign,
        depth: block.depth,
        x: block.x,
        y: block.y,
        z: block.z,
        w: block.w
      }
    }, {
      omi_path: block.omi_path,
      coordinate_receipt: block.receipt_hash,
      scope: "public.global",
      carrier: 255,
      witness: fnv1a(block.receipt_hash + "|" + mode)
    });
  }

  function vertexBuffer(block, index, mode) {
    return attachMetadata({
      kind: "DEFINE_VERTEX_BUFFER",
      buffer_id: "vbo." + index,
      vertices: [
        block.x,
        block.y,
        block.z,
        block.w
      ]
    }, {
      omi_path: block.omi_path,
      coordinate_receipt: block.receipt_hash,
      scope: "public.global",
      carrier: 255,
      witness: fnv1a(block.receipt_hash + "|vbo|" + mode)
    });
  }

  function indexBuffer(block, index, mode) {
    return attachMetadata({
      kind: "DEFINE_INDEX_BUFFER",
      buffer_id: "ibo." + index,
      indices: [0, 1, 2, 3]
    }, {
      omi_path: block.omi_path,
      coordinate_receipt: block.receipt_hash,
      scope: "public.global",
      carrier: 255,
      witness: fnv1a(block.receipt_hash + "|ibo|" + mode)
    });
  }

  function materialFor(kind, depth, witness) {
    return {
      kind: "DEFINE_MATERIAL",
      material_id: kind + "." + depth,
      overlay: {
        color: kind === "DRAW_CLOSURE_EDGE" ? "amber" : kind === "DRAW_SCOPE_EDGE" ? "blue" : "silver",
        texture: depth,
        shader: "projection"
      },
      witness: witness
    };
  }

  function buildFromBlocks(blocks, mode, scene) {
    const commands = [beginScene(scene, mode)];
    blocks.forEach(function (block, index) {
      commands.push(defineBlock(block, index, mode));
      commands.push(vertexBuffer(block, index, mode));
      commands.push(indexBuffer(block, index, mode));
      commands.push(attachMetadata(materialFor("DRAW_POLYFORM", block.depth, fnv1a(block.receipt_hash + "|mat|" + mode)), {
        omi_path: block.omi_path,
        coordinate_receipt: block.receipt_hash,
        scope: "public.global",
        carrier: 255,
        witness: fnv1a(block.receipt_hash + "|material|" + mode)
      }));
      commands.push(attachMetadata({
        kind: "DRAW_POLYFORM",
        draw_id: "draw." + index,
        mode: mode,
        primitive: block.basis,
        geometry_ref: "block." + index
      }, {
        omi_path: block.omi_path,
        coordinate_receipt: block.receipt_hash,
        scope: "public.global",
        carrier: 255,
        witness: fnv1a(block.receipt_hash + "|draw|" + mode)
      }));
      commands.push(attachMetadata({
        kind: "ATTACH_OMI_METADATA",
        attachment_id: "metadata." + index,
        mode: mode
      }, {
        omi_path: block.omi_path,
        coordinate_receipt: block.receipt_hash,
        scope: "public.global",
        carrier: 255,
        witness: fnv1a(block.receipt_hash + "|attach|" + mode)
      }));
    });
    commands.push(endScene(scene, mode, commands));
    return commands;
  }

  function buildClosureCommands(closures, mode, scene) {
    return closures.map(function (closure, index) {
      return attachMetadata({
        kind: "DRAW_CLOSURE_EDGE",
        draw_id: "closure." + index,
        mode: mode,
        edge: {
          delta_x: closure.delta_x,
          delta_y: closure.delta_y,
          delta_z: closure.delta_z,
          delta_w: closure.delta_w,
          distance_class: closure.distance_class,
          sexagesimal_slot: closure.sexagesimal_slot,
          orientation4: closure.orientation4,
          public_frame240: closure.public_frame240
        }
      }, {
        omi_path: closure.omi_path || "closure." + index,
        coordinate_receipt: closure.coordinate_receipt || 0,
        closure_receipt: closure.receipt_hash,
        scope: "public.global",
        carrier: closure.orientation4,
        witness: fnv1a(closure.receipt_hash + "|closure|" + mode)
      });
    });
  }

  function buildScopeCommands(edges, mode) {
    return edges.map(function (edge, index) {
      return attachMetadata({
        kind: "DRAW_SCOPE_EDGE",
        draw_id: "scope." + index,
        mode: mode,
        edge: {
          from_coord_receipt: edge.from_coord_receipt,
          to_coord_receipt: edge.to_coord_receipt,
          closure_receipt: edge.closure_receipt,
          visibility: edge.visibility,
          location: edge.location,
          carrier: edge.carrier,
          orientation4: edge.orientation4,
          sexagesimal_slot: edge.sexagesimal_slot,
          public_frame240: edge.public_frame240
        }
      }, {
        omi_path: edge.scope_class || "scope.edge." + index,
        coordinate_receipt: edge.from_coord_receipt,
        closure_receipt: edge.closure_receipt,
        scope: edge.scope_class,
        carrier: edge.carrier,
        witness: edge.receipt
      });
    });
  }

  function buildBarcodeCommands(templates, mode) {
    return templates.map(function (template, index) {
      return attachMetadata({
        kind: "ATTACH_OMI_METADATA",
        attachment_id: "template." + index,
        mode: mode,
        template: {
          omi_path: template.omi_path,
          carrier: template.carrier,
          scope: template.scope,
          witness: template.witness
        }
      }, {
        omi_path: template.omi_path,
        coordinate_receipt: template.coordinate_receipt || 0,
        closure_receipt: template.closure_receipt || 0,
        scope: template.scope,
        carrier: template.carrier,
        witness: template.witness
      });
    });
  }

  function project(options) {
    const mode = options && options.mode ? options.mode : "polyform-2d";
    const scene = options && options.scene ? options.scene : compositionScene.createScene("gpu.scene");
    const blocks = Array.isArray(options && options.blocks) ? options.blocks.slice() : [];
    const closures = Array.isArray(options && options.closures) ? options.closures.slice() : [];
    const edges = Array.isArray(options && options.edges) ? options.edges.slice() : [];
    const templates = Array.isArray(options && options.templates) ? options.templates.slice() : [];

    if (MODES.indexOf(mode) === -1) {
      return null;
    }

    let commands = [];
    if (mode === "scope-graph-3d") {
      commands = [beginScene(scene, mode)].concat(buildScopeCommands(edges, mode));
      commands.push(endScene(scene, mode, commands));
    } else if (mode === "barcode-template-scene") {
      commands = [beginScene(scene, mode)].concat(buildBarcodeCommands(templates, mode));
      commands.push(endScene(scene, mode, commands));
    } else if (mode === "polyform-2_5d") {
      commands = buildFromBlocks(blocks.map(function (block) {
        return Object.assign({}, block, { depth: "2.5d" });
      }), mode, scene);
    } else if (mode === "polyform-3d") {
      commands = buildFromBlocks(blocks.map(function (block) {
        return Object.assign({}, block, { depth: "3d" });
      }), mode, scene);
    } else {
      commands = buildFromBlocks(blocks.map(function (block) {
        return Object.assign({}, block, { depth: "2d" });
      }), mode, scene);
    }

    return {
      mode: mode,
      scene_id: scene.id,
      command_receipt: fnv1a(stableString(commands)),
      commands: commands
    };
  }

  return {
    MODES: MODES.slice(),
    project: project
  };
}));
