(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./webgl_runtime_adapter.js") : root.OMIWebGLRuntimeAdapter,
    typeof require === "function" ? require("./gles_runtime_adapter.js") : root.OMIGLESRuntimeAdapter,
    typeof require === "function" ? require("./opengl_runtime_adapter.js") : root.OMIOpenGLRuntimeAdapter
  );
  root.OMIGraphicsBackendEquivalence = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (webglRuntimeAdapter, glesRuntimeAdapter, openglRuntimeAdapter) {
  "use strict";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
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

  function normalizedBackendName(plan) {
    if (plan && plan.backend) {
      return String(plan.backend)
        .replace(/-runtime-plan$/i, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase();
    }
    if (plan && plan.begin && plan.begin.kind) {
      const kind = String(plan.begin.kind).toLowerCase();
      if (kind.indexOf("gles") !== -1) {
        return "gles";
      }
      if (kind.indexOf("opengl") !== -1) {
        return "opengl";
      }
      return "webgl";
    }
    return "";
  }

  function normalizedMetadata(plan, dropWitness) {
    const metadata = clone(plan && plan.metadata ? plan.metadata : {
      omi_path: "",
      coordinate_receipt: 0,
      closure_receipt: 0,
      scope: "",
      carrier: 255,
      witness: 0
    });
    if (dropWitness) {
      metadata.witness = 0;
    }
    return metadata;
  }

  function canonicalPrimitive(value) {
    const text = String(value || "").toLowerCase();
    if (text === "triangle-fan" || text === "tri-fan" || text === "triangle_fan" || text === "tri_fan" || text === "gl_triangle_fan") {
      return "triangle-fan";
    }
    if (text === "triangle-strip" || text === "tri-strip" || text === "triangle_strip" || text === "tri_strip" || text === "gl_triangle_strip") {
      return "triangle-strip";
    }
    if (text === "triangles" || text === "gl_triangles") {
      return "triangles";
    }
    if (text === "line-list" || text === "lines" || text === "line_list" || text === "line-strip" || text === "line_strip" || text === "gl_lines" || text === "gl_line_strip") {
      return "lines";
    }
    return text;
  }

  function normalizeRecord(record) {
    const rawKind = record && record.kind ? String(record.kind).toLowerCase() : "";
    let kind = rawKind;
    if (rawKind.indexOf("begin") !== -1) {
      kind = "begin";
    } else if (rawKind.indexOf("end") !== -1) {
      kind = "end";
    } else if (rawKind.indexOf("buffer") !== -1) {
      kind = "buffer";
    } else if (rawKind.indexOf("material") !== -1) {
      kind = "material";
    } else if (rawKind.indexOf("draw") !== -1) {
      kind = "draw";
    } else if (rawKind.indexOf("attach") !== -1) {
      kind = "attachment";
    }
    const metadata = normalizedMetadata(record, true);
    const witness = stableString({
      kind: kind,
      id: record && record.id ? String(record.id) : "",
      metadata: metadata,
      label: record && record.label ? String(record.label) : "",
      target: record && record.target ? String(record.target) : "",
      data_length: Array.isArray(record && record.data) ? record.data.length : 0,
      overlay: record && record.overlay ? clone(record.overlay) : {},
      draw_kind: record && record.draw_kind ? String(record.draw_kind) : "",
      topology: canonicalPrimitive(record && (record.topology || record.primitive_mode)),
      source_kind: record && record.source_kind ? String(record.source_kind) : ""
    });
    return {
      kind: kind,
      id: record && record.id ? String(record.id) : "",
      metadata: metadata,
      label: record && record.label ? String(record.label) : "",
      target: record && record.target ? String(record.target) : "",
      data_length: Array.isArray(record && record.data) ? record.data.length : 0,
      overlay: record && record.overlay ? clone(record.overlay) : {},
      draw_kind: record && record.draw_kind ? String(record.draw_kind) : "",
      topology: canonicalPrimitive(record && (record.topology || record.primitive_mode)),
      source_kind: record && record.source_kind ? String(record.source_kind) : "",
      witness: fnv1a(witness)
    };
  }

  function equivalenceKey(summary) {
    return stableString({
      mode: summary.mode,
      scene_id: summary.scene_id,
      stream_receipt: summary.stream_receipt,
      metadata: summary.metadata,
      root_metadata: summary.root_metadata,
      counts: summary.counts,
      begin: {
        kind: summary.begin.kind,
        id: summary.begin.id,
        metadata: summary.begin.metadata,
        label: summary.begin.label,
        target: summary.begin.target,
        data_length: summary.begin.data_length,
        overlay: summary.begin.overlay,
        draw_kind: summary.begin.draw_kind,
        topology: summary.begin.topology,
        source_kind: summary.begin.source_kind
      },
      end: {
        kind: summary.end.kind,
        id: summary.end.id,
        metadata: summary.end.metadata,
        label: summary.end.label,
        target: summary.end.target,
        data_length: summary.end.data_length,
        overlay: summary.end.overlay,
        draw_kind: summary.end.draw_kind,
        topology: summary.end.topology,
        source_kind: summary.end.source_kind
      },
      buffers: summary.buffers.map(function (record) {
        return {
          kind: record.kind,
          id: record.id,
          metadata: record.metadata,
          label: record.label,
          target: record.target,
          data_length: record.data_length,
          overlay: record.overlay,
          draw_kind: record.draw_kind,
          topology: record.topology,
          source_kind: record.source_kind
        };
      }),
      materials: summary.materials.map(function (record) {
        return {
          kind: record.kind,
          id: record.id,
          metadata: record.metadata,
          label: record.label,
          target: record.target,
          data_length: record.data_length,
          overlay: record.overlay,
          draw_kind: record.draw_kind,
          topology: record.topology,
          source_kind: record.source_kind
        };
      }),
      draw_calls: summary.draw_calls.map(function (record) {
        return {
          kind: record.kind,
          id: record.id,
          metadata: record.metadata,
          label: record.label,
          target: record.target,
          data_length: record.data_length,
          overlay: record.overlay,
          draw_kind: record.draw_kind,
          topology: record.topology,
          source_kind: record.source_kind
        };
      }),
      attachments: summary.attachments.map(function (record) {
        return {
          kind: record.kind,
          id: record.id,
          metadata: record.metadata,
          label: record.label,
          target: record.target,
          data_length: record.data_length,
          overlay: record.overlay,
          draw_kind: record.draw_kind,
          topology: record.topology,
          source_kind: record.source_kind
        };
      })
    });
  }

  function normalizePlan(plan) {
    if (!plan || !Array.isArray(plan.buffers) || !Array.isArray(plan.materials) || !Array.isArray(plan.draw_calls) || !Array.isArray(plan.attachments)) {
      return null;
    }
    return {
      backend: normalizedBackendName(plan),
      mode: String(plan.mode || ""),
      scene_id: String(plan.scene_id || ""),
      stream_receipt: Number(plan.stream_receipt || 0),
      metadata: normalizedMetadata(plan),
      root_metadata: clone(plan.root_metadata || {
        omi_path: "",
        coordinate_receipt: 0,
        closure_receipt: 0,
        scope: "",
        carrier: 255,
        witness: 0,
        projection_intent: ""
      }),
      counts: {
        buffers: plan.buffers.length,
        materials: plan.materials.length,
        draw_calls: plan.draw_calls.length,
        attachments: plan.attachments.length
      },
      begin: normalizeRecord(plan.begin || null),
      end: normalizeRecord(plan.end || null),
      buffers: plan.buffers.map(normalizeRecord),
      materials: plan.materials.map(normalizeRecord),
      draw_calls: plan.draw_calls.map(normalizeRecord),
      attachments: plan.attachments.map(normalizeRecord)
    };
  }

  function comparePlans(webglPlan, glesPlan, openglPlan) {
    const summaries = [webglPlan, glesPlan, openglPlan].map(normalizePlan);
    if (summaries.some(function (summary) { return !summary; })) {
      return null;
    }
    const reference = summaries[0];
    const referenceKey = equivalenceKey(reference);
    const same = summaries.every(function (summary) {
      return equivalenceKey(summary) === referenceKey;
    });
    return {
      same: same,
      summaries: summaries,
      receipt: same ? reference.stream_receipt : 0,
      witness: same ? reference.metadata.witness : 0
    };
  }

  function compareFromStream(stream, mode) {
    const webglPlan = webglRuntimeAdapter.adapt(stream, { mode: mode });
    const glesPlan = glesRuntimeAdapter.adapt(stream, { mode: mode });
    const openglPlan = openglRuntimeAdapter.adapt(stream, { mode: mode });
    return comparePlans(webglPlan, glesPlan, openglPlan);
  }

  return {
    normalizePlan: normalizePlan,
    comparePlans: comparePlans,
    compareFromStream: compareFromStream
  };
}));
