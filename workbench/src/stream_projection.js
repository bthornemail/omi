(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./stream_declaration.js") : root.OMIStreamDeclaration
  );
  root.OMIStreamProjection = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (streamDeclaration) {
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

  function hexByte(code) {
    return (Number(code) >>> 0).toString(16).padStart(2, "0");
  }

  function charFromByte(code) {
    return String.fromCharCode(Number(code) & 0xff);
  }

  function normalizeMode(mode) {
    const value = String(mode || "barcode");
    if (value === "lazy") {
      return "barcode";
    }
    if (value === "greedy") {
      return "chart";
    }
    if (value === "barcode" || value === "chart") {
      return value;
    }
    return null;
  }

  function bytesFromSource(source, start, end) {
    const text = String(source || "");
    const bytes = [];
    const safeStart = Math.max(0, Math.floor(Number(start) || 0));
    const safeEnd = Math.max(safeStart, Math.floor(Number(end) || safeStart));
    for (let i = safeStart; i <= safeEnd && i < text.length; i += 1) {
      bytes.push(text.charCodeAt(i) & 0xff);
    }
    return bytes;
  }

  function reverseCopy(array) {
    return array.slice().reverse();
  }

  function orderBytes(bytes, region) {
    let ordered = bytes.slice();
    if (String(region.traversal || "car/cdr") === "cdr/car") {
      ordered = reverseCopy(ordered);
    }
    return ordered;
  }

  function renderText(bytes, region) {
    let chars = bytes.map(charFromByte);
    if (String(region.text_direction || "ltr") === "rtl") {
      chars = reverseCopy(chars);
    }
    return chars.join("");
  }

  function interpretWord(bytes, endian) {
    const ordered = String(endian || "little") === "big" ? bytes.slice() : reverseCopy(bytes);
    return "0x" + ordered.map(hexByte).join("");
  }

  function regionSpan(region) {
    return Math.max(0, Math.floor(Number(region.end) || 0) - Math.max(0, Math.floor(Number(region.start) || 0)) + 1);
  }

  function projectRegion(snapshot, region, mode, declarationOrder) {
    const source = String(snapshot && snapshot.source ? snapshot.source : "");
    const bytes = bytesFromSource(source, region.start, region.end);
    const orderedBytes = orderBytes(bytes, region);
    const presentation = normalizeMode(mode || region.presentation);
    const displayText = renderText(orderedBytes, region);
    const storageHex = orderedBytes.map(hexByte).join(" ");
    const bandCounts = { control: 0, operator: 0, measurement: 0, projection: 0, extended: 0 };
    const rendering = {
      presentation: presentation,
      binary_mode: region.binary_mode,
      endian: region.endian,
      text_direction: region.text_direction,
      traversal: region.traversal,
      storage_hex: storageHex,
      display_text: displayText,
      word_hex: interpretWord(orderedBytes, region.endian),
      declaration_order: declarationOrder,
      span: regionSpan(region)
    };
    const summary = {
      start: region.start,
      end: region.end,
      label: region.label,
      region_receipt: region.region_receipt,
      presentation: presentation,
      storage_hex: storageHex,
      display_text: displayText,
      word_hex: rendering.word_hex
    };

    orderedBytes.forEach(function (byte) {
      const band = streamDeclaration.classifyCodepoint(byte).band;
      bandCounts[band] += 1;
    });

    return Object.assign({}, summary, {
      band_counts: bandCounts,
      rendering: rendering,
      projection_receipt: fnv1a(stableString(summary))
    });
  }

  function compareOverlayOrder(a, b) {
    const spanA = regionSpan(a);
    const spanB = regionSpan(b);
    if (spanA !== spanB) {
      return spanB - spanA;
    }
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    return a.declaration_order - b.declaration_order;
  }

  function resolveOverlayStack(snapshot, index, mode) {
    const state = snapshot || {};
    const matched = [];
    (state.regions || []).forEach(function (region, declarationOrder) {
      if (index >= region.start && index <= region.end) {
        matched.push(projectRegion(state, region, mode, declarationOrder));
      }
    });
    matched.sort(compareOverlayOrder);
    const resolved = matched.reduce(function (acc, overlay) {
      return Object.assign(acc || {}, overlay);
    }, null);
    return {
      overlays: matched,
      resolved: resolved
    };
  }

  function projectStreamDeclaration(snapshot, options) {
    const state = snapshot || {};
    const mode = normalizeMode(options && options.mode ? options.mode : state.active && state.active.presentation);
    if (!state.identity_receipt || !mode) {
      return null;
    }
    const regions = (state.regions || []).map(function (region, index) {
      return projectRegion(state, region, mode, index);
    });
    const viewReceipt = fnv1a(stableString({
      identity_receipt: state.identity_receipt,
      mode: mode,
      regions: regions.map(function (region) {
        return region.projection_receipt;
      })
    }));
    return {
      stream_id: state.stream_id || "stream.declaration",
      stream_scope: state.stream_scope || "pre-os.declaration",
      identity_receipt: state.identity_receipt,
      view_receipt: viewReceipt,
      projection_receipt: fnv1a(stableString({
        identity_receipt: state.identity_receipt,
        view_receipt: viewReceipt,
        mode: mode,
        regions: regions.map(function (region) {
          return region.projection_receipt;
        })
      })),
      mode: mode,
      region_count: regions.length,
      band_counts: regions.reduce(function (acc, region) {
        Object.keys(acc).forEach(function (band) {
          acc[band] += region.band_counts[band] || 0;
        });
        return acc;
      }, { control: 0, operator: 0, measurement: 0, projection: 0, extended: 0 }),
      regions: regions
    };
  }

  function projectStreamIndex(snapshot, index, options) {
    const state = snapshot || {};
    const resolvedIndex = Math.max(0, Math.floor(Number(index) || 0));
    const mode = normalizeMode(options && options.mode ? options.mode : state.active && state.active.presentation);
    if (!state.identity_receipt || !mode) {
      return null;
    }
    const bytes = String(state.source || "");
    const codepoint = bytes.charCodeAt(resolvedIndex) & 0xff;
    let region = null;
    for (let i = (state.regions || []).length - 1; i >= 0; i -= 1) {
      const candidate = state.regions[i];
      if (resolvedIndex >= candidate.start && resolvedIndex <= candidate.end) {
        region = candidate;
        break;
      }
    }
    const overlay = resolveOverlayStack(state, resolvedIndex, mode);
    const projectedRegion = overlay.resolved || (region ? projectRegion(state, region, mode, (state.regions || []).indexOf(region)) : null);
    const overlayReceipt = fnv1a(stableString({
      identity_receipt: state.identity_receipt,
      mode: mode,
      index: resolvedIndex,
      overlays: overlay.overlays.map(function (item) {
        return item.projection_receipt;
      }),
      resolved: projectedRegion ? projectedRegion.projection_receipt : null,
      codepoint: codepoint
    }));
    const resolvedRegion = projectedRegion ? Object.assign({}, projectedRegion, {
      projection_receipt: overlayReceipt,
      overlay_receipt: overlayReceipt
    }) : null;
    const band = streamDeclaration.classifyCodepoint(codepoint);
    return {
      stream_id: state.stream_id || "stream.declaration",
      stream_scope: state.stream_scope || "pre-os.declaration",
      index: resolvedIndex,
      codepoint: codepoint,
      band: band.band,
      band_range: band.range,
      mode: mode,
      identity_receipt: state.identity_receipt,
      view_receipt: fnv1a(stableString({
        identity_receipt: state.identity_receipt,
        mode: mode,
        index: resolvedIndex,
        region: overlayReceipt,
        codepoint: codepoint
      })),
      projection_receipt: overlayReceipt,
      overlay_count: overlay.overlays.length,
      overlay_stack: overlay.overlays,
      region: resolvedRegion,
      resolved_region: resolvedRegion,
      overlay_receipt: overlayReceipt
    };
  }

  return {
    projectStreamDeclaration: projectStreamDeclaration,
    projectStreamIndex: projectStreamIndex
  };
}));
