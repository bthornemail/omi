(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./webgl_runtime_adapter.js") : root.OMIWebGLRuntimeAdapter,
    typeof require === "function" ? require("./pointer_router.js") : root.OMIPointerRouter
  );
  root.OMIWebGLCanvasPreview = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (webglRuntimeAdapter, pointerRouter) {
  "use strict";

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

  function validatePlan(plan) {
    return !!(plan &&
      typeof plan === "object" &&
      plan.mode &&
      Array.isArray(plan.buffers) &&
      Array.isArray(plan.materials) &&
      Array.isArray(plan.draw_calls) &&
      Array.isArray(plan.attachments) &&
      typeof plan.plan_receipt === "number" &&
      webglRuntimeAdapter.MODES.indexOf(plan.mode) !== -1 &&
      (!plan.begin || plan.begin.kind === "BEGIN_PLAN") &&
      (!plan.end || plan.end.kind === "END_PLAN") &&
      plan.buffers.every(function (item) { return item && item.kind === "BUFFER_PLAN"; }) &&
      plan.materials.every(function (item) { return item && item.kind === "MATERIAL_PLAN"; }) &&
      plan.draw_calls.every(function (item) { return item && item.kind === "DRAW_PLAN"; }) &&
      plan.attachments.every(function (item) { return item && item.kind === "ATTACHMENT_PLAN"; }));
  }

  function surfaceKind(record) {
    if (!record) {
      return "unknown";
    }
    if (record.kind === "BEGIN_PLAN" || record.kind === "END_PLAN") {
      return "chrome";
    }
    if (record.kind === "BUFFER_PLAN") {
      return "buffer";
    }
    if (record.kind === "MATERIAL_PLAN") {
      return "material";
    }
    if (record.kind === "DRAW_PLAN") {
      return "draw";
    }
    if (record.kind === "ATTACHMENT_PLAN") {
      return "attachment";
    }
    return "unknown";
  }

  function recordMetadata(record) {
    return record && record.metadata ? clone(record.metadata) : {
      omi_path: "",
      coordinate_receipt: 0,
      closure_receipt: 0,
      scope: "",
      carrier: 255,
      witness: 0
    };
  }

  function createRecord(record, index, lane) {
    const metadata = recordMetadata(record);
    return {
      index: index,
      lane: lane,
      kind: surfaceKind(record),
      source_kind: record.kind,
      id: record.buffer_id || record.material_id || record.draw_id || record.attachment_id || "record." + index,
      label: record.draw_kind || record.target || record.primitive || record.material_id || record.buffer_id || record.attachment_id || "",
      metadata: metadata,
      witness: fnv1a(record.kind + "|" + index + "|" + metadata.omi_path + "|" + metadata.witness)
    };
  }

  function addLookup(lookup, record) {
    if (record && record.metadata && record.metadata.omi_path && !lookup[record.metadata.omi_path]) {
      lookup[record.metadata.omi_path] = record;
    }
  }

  function preparePreview(plan, options) {
    if (!validatePlan(plan)) {
      return null;
    }

    const records = [];
    const lookup = Object.create(null);

    if (plan.begin) {
      const beginRecord = createRecord(plan.begin, records.length, "begin");
      records.push(beginRecord);
      addLookup(lookup, beginRecord);
    }

    plan.buffers.forEach(function (buffer) {
      const bufferRecord = createRecord(buffer, records.length, "buffer");
      bufferRecord.target = buffer.target;
      bufferRecord.data = clone(buffer.data || []);
      records.push(bufferRecord);
      addLookup(lookup, bufferRecord);
    });

    plan.materials.forEach(function (material) {
      const materialRecord = createRecord(material, records.length, "material");
      materialRecord.overlay = clone(material.overlay || {});
      records.push(materialRecord);
      addLookup(lookup, materialRecord);
    });

    plan.draw_calls.forEach(function (draw) {
      const drawRecord = createRecord(draw, records.length, "draw");
      drawRecord.topology = draw.topology;
      drawRecord.draw_kind = draw.draw_kind;
      drawRecord.edge = clone(draw.edge || {});
      drawRecord.template = clone(draw.template || {});
      records.push(drawRecord);
      addLookup(lookup, drawRecord);
    });

    plan.attachments.forEach(function (attachment) {
      const attachmentRecord = createRecord(attachment, records.length, "attachment");
      records.push(attachmentRecord);
      addLookup(lookup, attachmentRecord);
    });

    if (plan.end) {
      const endRecord = createRecord(plan.end, records.length, "end");
      records.push(endRecord);
      addLookup(lookup, endRecord);
    }

    const preview = {
      backend: "webgl-canvas-preview",
      mode: plan.mode,
      scene_id: plan.scene_id,
      plan_receipt: plan.plan_receipt,
      stream_receipt: plan.stream_receipt,
      width: 960,
      height: 540,
      fallback: true,
      records: records,
      lookup: lookup,
      metadata: plan.metadata ? clone(plan.metadata) : {
        omi_path: "",
        coordinate_receipt: 0,
        closure_receipt: 0,
        scope: "",
        carrier: 255,
        witness: 0
      }
    };

    preview.preview_receipt = fnv1a(stableString({
      mode: preview.mode,
      scene_id: preview.scene_id,
      plan_receipt: preview.plan_receipt,
      stream_receipt: preview.stream_receipt,
      records: preview.records
    }));

    return preview;
  }

  function findRecord(preview, omiPath) {
    return preview && preview.lookup ? preview.lookup[omiPath] || null : null;
  }

  function selectByPath(preview, omiPath) {
    const record = findRecord(preview, omiPath);
    if (!record || !record.metadata || !record.metadata.omi_path) {
      return null;
    }
    return pointerRouter.selectPointer({
      path: record.metadata.omi_path,
      depth: record.metadata.scope || "near",
      id: record.metadata.omi_path,
      fs: record.metadata.coordinate_receipt ? String(record.metadata.coordinate_receipt) : "",
      gs: record.metadata.scope || "",
      rs: record.source_kind || "",
      us: record.kind || ""
    });
  }

  function renderToCanvas(canvas, preview) {
    if (!canvas || !canvas.getContext || !preview) {
      return null;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    canvas.width = preview.width;
    canvas.height = preview.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    preview.records.forEach(function (record, index) {
      const y = 24 + (index * 32);
      ctx.strokeStyle = "#0f172a";
      ctx.fillStyle = record.kind === "draw" ? "#dbeafe" : "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.strokeRect(24, y, 180, 20);
      ctx.fillRect(24, y, 180, 20);
      ctx.fillStyle = "#111827";
      ctx.fillText(record.metadata && record.metadata.omi_path ? record.metadata.omi_path : record.id, 32, y + 14);
    });
    return canvas;
  }

  return {
    preparePreview: preparePreview,
    project: preparePreview,
    findRecord: findRecord,
    selectByPath: selectByPath,
    renderToCanvas: renderToCanvas
  };
}));
