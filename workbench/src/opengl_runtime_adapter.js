(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./gpu_command_stream.js") : root.OMIGPUCommandStream
  );
  root.OMIOpenGLRuntimeAdapter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (artifactIdentity, gpuCommandStream) {
  "use strict";

  const MODES = gpuCommandStream && Array.isArray(gpuCommandStream.MODES)
    ? gpuCommandStream.MODES.slice()
    : [];

  const COMMANDS = {
    BEGIN_SCENE: true,
    END_SCENE: true,
    DEFINE_BLOCK: true,
    DEFINE_VERTEX_BUFFER: true,
    DEFINE_INDEX_BUFFER: true,
    DEFINE_MATERIAL: true,
    DRAW_POLYFORM: true,
    DRAW_CLOSURE_EDGE: true,
    DRAW_SCOPE_EDGE: true,
    ATTACH_OMI_METADATA: true
  };

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

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function preserveMetadata(command) {
    return {
      omi_path: command && command.metadata ? command.metadata.omi_path : "",
      coordinate_receipt: command && command.metadata ? command.metadata.coordinate_receipt : 0,
      closure_receipt: command && command.metadata ? command.metadata.closure_receipt : 0,
      scope: command && command.metadata ? command.metadata.scope : "",
      carrier: command && command.metadata ? command.metadata.carrier : 255,
      witness: command && command.metadata ? command.metadata.witness : 0
    };
  }

  function beginPlan(stream, mode) {
    return {
      kind: "BEGIN_OPENGL_PLAN",
      scene_id: stream.scene_id,
      mode: mode,
      stream_receipt: stream.command_receipt,
      witness: fnv1a(String(stream.scene_id || "") + "|" + mode + "|begin")
    };
  }

  function endPlan(stream, mode, plan) {
    return {
      kind: "END_OPENGL_PLAN",
      scene_id: stream.scene_id,
      mode: mode,
      plan_receipt: fnv1a(stableString(plan)),
      witness: fnv1a(String(stream.scene_id || "") + "|" + mode + "|end")
    };
  }

  function bufferPlan(command, index, target) {
    return {
      kind: "OPENGL_BUFFER_PLAN",
      buffer_id: command.buffer_id,
      target: target,
      usage: target === "ARRAY_BUFFER" ? "STATIC_DRAW" : "ELEMENT_ARRAY_BUFFER",
      data: target === "ARRAY_BUFFER" ? clone(command.vertices || []) : clone(command.indices || []),
      metadata: preserveMetadata(command),
      witness: fnv1a(command.buffer_id + "|" + target + "|" + index)
    };
  }

  function materialPlan(command, index) {
    return {
      kind: "OPENGL_MATERIAL_PLAN",
      material_id: command.material_id,
      overlay: clone(command.overlay || {}),
      metadata: preserveMetadata(command),
      witness: fnv1a(command.material_id + "|" + index)
    };
  }

  function drawPlan(command, index, primitiveMode, drawKind) {
    return {
      kind: "OPENGL_DRAW_PLAN",
      draw_kind: drawKind,
      primitive_mode: primitiveMode,
      draw_id: command.draw_id || command.attachment_id || "draw." + index,
      primitive: command.primitive || null,
      geometry_ref: command.geometry_ref || null,
      edge: clone(command.edge || {}),
      template: clone(command.template || {}),
      metadata: preserveMetadata(command),
      witness: fnv1a((command.draw_id || command.attachment_id || drawKind) + "|" + primitiveMode + "|" + index)
    };
  }

  function attachmentPlan(command, index) {
    return {
      kind: "OPENGL_ATTACHMENT_PLAN",
      attachment_id: command.attachment_id,
      metadata: preserveMetadata(command),
      witness: fnv1a(command.attachment_id + "|" + index)
    };
  }

  function primitiveModeFor(mode, command) {
    if (command.kind === "DRAW_SCOPE_EDGE") {
      return "GL_LINES";
    }
    if (command.kind === "DRAW_CLOSURE_EDGE") {
      return "GL_LINE_STRIP";
    }
    if (mode === "polyform-2d") {
      return "GL_TRIANGLE_FAN";
    }
    if (mode === "polyform-2_5d") {
      return "GL_TRIANGLE_STRIP";
    }
    if (mode === "polyform-3d") {
      return "GL_TRIANGLES";
    }
    if (mode === "scope-graph-3d") {
      return "GL_LINES";
    }
    return "GL_TRIANGLES";
  }

  function validateStream(stream, mode) {
    if (!stream || !Array.isArray(stream.commands) || !stream.commands.length) {
      return false;
    }
    if (MODES.indexOf(mode) === -1) {
      return false;
    }
    if (stream.commands[0].kind !== "BEGIN_SCENE") {
      return false;
    }
    if (stream.commands[stream.commands.length - 1].kind !== "END_SCENE") {
      return false;
    }
    return stream.commands.every(function (command) {
      return command && COMMANDS[command.kind] === true;
    });
  }

  function adapt(stream, options) {
    const mode = options && options.mode ? options.mode : (stream ? stream.mode : "");
    if (!validateStream(stream, mode)) {
      return null;
    }

    const plan = {
      backend: "opengl-runtime-plan",
      mode: mode,
      scene_id: stream.scene_id,
      stream_receipt: stream.command_receipt,
      root_metadata: artifactIdentity.rootMetadata(stream.scene_id),
      begin: null,
      end: null,
      buffers: [],
      materials: [],
      draw_calls: [],
      attachments: [],
      metadata: {
        omi_path: "",
        coordinate_receipt: 0,
        closure_receipt: 0,
        scope: "",
        carrier: 255,
        witness: 0
      }
    };

    stream.commands.forEach(function (command, index) {
      if (command.metadata && plan.metadata && plan.metadata.omi_path === "" && (
        command.metadata.omi_path ||
        command.metadata.coordinate_receipt ||
        command.metadata.closure_receipt ||
        command.metadata.scope ||
        command.metadata.carrier !== undefined ||
        command.metadata.witness
      )) {
        plan.metadata = preserveMetadata(command);
      }
      if (command.kind === "BEGIN_SCENE") {
        plan.begin = beginPlan(stream, mode);
        plan.metadata.witness = command.witness || plan.metadata.witness;
        return;
      }
      if (command.kind === "END_SCENE") {
        plan.end = endPlan(stream, mode, plan);
        return;
      }
      if (command.kind === "DEFINE_VERTEX_BUFFER") {
        plan.buffers.push(bufferPlan(command, index, "ARRAY_BUFFER"));
        return;
      }
      if (command.kind === "DEFINE_INDEX_BUFFER") {
        plan.buffers.push(bufferPlan(command, index, "ELEMENT_ARRAY_BUFFER"));
        return;
      }
      if (command.kind === "DEFINE_MATERIAL") {
        plan.materials.push(materialPlan(command, index));
        return;
      }
      if (command.kind === "DRAW_POLYFORM") {
        plan.draw_calls.push(drawPlan(command, index, primitiveModeFor(mode, command), "polyform"));
        return;
      }
      if (command.kind === "DRAW_CLOSURE_EDGE") {
        plan.draw_calls.push(drawPlan(command, index, primitiveModeFor(mode, command), "closure-edge"));
        return;
      }
      if (command.kind === "DRAW_SCOPE_EDGE") {
        plan.draw_calls.push(drawPlan(command, index, primitiveModeFor(mode, command), "scope-edge"));
        return;
      }
      if (command.kind === "ATTACH_OMI_METADATA") {
        plan.attachments.push(attachmentPlan(command, index));
      }
    });

    plan.plan_receipt = fnv1a(stableString({
      backend: plan.backend,
      mode: plan.mode,
      scene_id: plan.scene_id,
      stream_receipt: plan.stream_receipt,
      begin: plan.begin,
      end: plan.end,
      buffers: plan.buffers,
      materials: plan.materials,
      draw_calls: plan.draw_calls,
      attachments: plan.attachments
    }));

    return plan;
  }

  return {
    MODES: MODES.slice(),
    adapt: adapt,
    project: adapt
  };
}));
