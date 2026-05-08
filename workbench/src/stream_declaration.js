(function (root, factory) {
  const api = factory();
  root.OMIStreamDeclaration = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const BANDS = {
    control: { start: 0x00, end: 0x1f },
    operator: { start: 0x20, end: 0x2f },
    measurement: { start: 0x30, end: 0x3f },
    projection: { start: 0x40, end: 0x7f },
    extended: { start: 0x80, end: 0xff }
  };

  const PRESENTATION = {
    barcode: "barcode",
    chart: "chart"
  };

  const REGION_DEFAULTS = {
    binary_mode: "raw-binary",
    endian: "little",
    text_direction: "ltr",
    traversal: "car/cdr",
    presentation: PRESENTATION.barcode
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

  function toBytes(source) {
    const text = String(source || "");
    const bytes = [];
    for (let i = 0; i < text.length; i += 1) {
      bytes.push(text.charCodeAt(i) & 0xff);
    }
    return bytes;
  }

  function classifyCodepoint(codepoint) {
    const value = Number(codepoint) >>> 0;
    if (value <= BANDS.control.end) {
      return { band: "control", range: "0x00..0x1F", start: BANDS.control.start, end: BANDS.control.end };
    }
    if (value <= BANDS.operator.end) {
      return { band: "operator", range: "0x20..0x2F", start: BANDS.operator.start, end: BANDS.operator.end };
    }
    if (value <= BANDS.measurement.end) {
      return { band: "measurement", range: "0x30..0x3F", start: BANDS.measurement.start, end: BANDS.measurement.end };
    }
    if (value <= BANDS.projection.end) {
      return { band: "projection", range: "0x40..0x7F", start: BANDS.projection.start, end: BANDS.projection.end };
    }
    return { band: "extended", range: "0x80..0xFF", start: BANDS.extended.start, end: BANDS.extended.end };
  }

  function normalizeBinaryMode(value) {
    const mode = String(value || REGION_DEFAULTS.binary_mode);
    if (mode === "raw-binary" || mode === "character-encoded") {
      return mode;
    }
    return null;
  }

  function normalizeEndian(value) {
    const endian = String(value || REGION_DEFAULTS.endian);
    if (endian === "little" || endian === "big") {
      return endian;
    }
    return null;
  }

  function normalizeTextDirection(value) {
    const direction = String(value || REGION_DEFAULTS.text_direction);
    if (direction === "ltr" || direction === "rtl") {
      return direction;
    }
    return null;
  }

  function normalizeTraversal(value) {
    const traversal = String(value || REGION_DEFAULTS.traversal);
    if (traversal === "car/cdr" || traversal === "cdr/car") {
      return traversal;
    }
    return null;
  }

  function normalizePresentation(value) {
    const presentation = String(value || REGION_DEFAULTS.presentation);
    if (presentation === "lazy") {
      return PRESENTATION.barcode;
    }
    if (presentation === "greedy") {
      return PRESENTATION.chart;
    }
    if (presentation === "barcode" || presentation === "chart") {
      return presentation;
    }
    return null;
  }

  function normalizeRegion(region, index, sourceLength) {
    if (!region || typeof region !== "object") {
      return null;
    }
    const start = Math.max(0, Math.floor(Number(region.start) || 0));
    const end = region.end === undefined ? start : Math.max(start, Math.floor(Number(region.end) || 0));
    const binaryMode = normalizeBinaryMode(region.binary_mode || region.binaryMode);
    const endian = normalizeEndian(region.endian);
    const textDirection = normalizeTextDirection(region.text_direction || region.textDirection);
    const traversal = normalizeTraversal(region.traversal);
    const presentation = normalizePresentation(region.presentation || region.view || region.mode);
    const label = String(region.label || region.name || "region." + index);
    const encoding = region.encoding ? String(region.encoding) : (binaryMode === "character-encoded" ? "utf-8" : "raw");

    if (binaryMode === null || endian === null || textDirection === null || traversal === null || presentation === null) {
      return null;
    }
    if (start > end) {
      return null;
    }
    if (sourceLength > 0 && start >= sourceLength) {
      return null;
    }
    if (sourceLength > 0 && end >= sourceLength) {
      return null;
    }

    return {
      start: start,
      end: end,
      binary_mode: binaryMode,
      endian: endian,
      text_direction: textDirection,
      traversal: traversal,
      presentation: presentation,
      encoding: encoding,
      label: label,
      region_class: [
        binaryMode,
        endian,
        textDirection,
        traversal,
        presentation
      ].join(".")
    };
  }

  function regionReceipt(region) {
    return fnv1a(stableString({
      start: region.start,
      end: region.end,
      binary_mode: region.binary_mode,
      endian: region.endian,
      text_direction: region.text_direction,
      traversal: region.traversal,
      presentation: region.presentation,
      encoding: region.encoding,
      label: region.label,
      region_class: region.region_class
    }));
  }

  function countBands(bytes) {
    const summary = {
      control: 0,
      operator: 0,
      measurement: 0,
      projection: 0,
      extended: 0
    };
    bytes.forEach(function (byte) {
      summary[classifyCodepoint(byte).band] += 1;
    });
    return summary;
  }

  function createStreamDeclaration(source, options) {
    const state = {
      stream_id: String(options && options.stream_id ? options.stream_id : "stream.declaration"),
      stream_scope: String(options && options.stream_scope ? options.stream_scope : "pre-os.declaration"),
      source: String(source || ""),
      bytes: toBytes(source),
      regions: [],
      active: {
        presentation: normalizePresentation(options && options.active_presentation ? options.active_presentation : REGION_DEFAULTS.presentation)
      },
      identity_receipt: 0,
      view_receipt: 0
    };

    function recomputeReceipts() {
      const regionSummaries = state.regions.map(function (region) {
        return {
          start: region.start,
          end: region.end,
          binary_mode: region.binary_mode,
          endian: region.endian,
          text_direction: region.text_direction,
          traversal: region.traversal,
          presentation: region.presentation,
          encoding: region.encoding,
          label: region.label,
          region_class: region.region_class,
          region_receipt: regionReceipt(region)
        };
      });
      state.identity_receipt = fnv1a(stableString({
        stream_id: state.stream_id,
        stream_scope: state.stream_scope,
        source: state.source,
        regions: regionSummaries
      }));
      state.view_receipt = fnv1a(stableString({
        identity_receipt: state.identity_receipt,
        active: state.active
      }));
      return snapshot();
    }

    function declareInitialRegion() {
      if (state.bytes.length === 0) {
        return;
      }
      state.regions.push({
        start: 0,
        end: state.bytes.length - 1,
        binary_mode: REGION_DEFAULTS.binary_mode,
        endian: REGION_DEFAULTS.endian,
        text_direction: REGION_DEFAULTS.text_direction,
        traversal: REGION_DEFAULTS.traversal,
        presentation: REGION_DEFAULTS.presentation,
        encoding: "raw",
        label: "stream.0",
        region_class: [
          REGION_DEFAULTS.binary_mode,
          REGION_DEFAULTS.endian,
          REGION_DEFAULTS.text_direction,
          REGION_DEFAULTS.traversal,
          REGION_DEFAULTS.presentation
        ].join(".")
      });
    }

    function snapshot() {
      const regionSummaries = state.regions.map(function (region) {
        return {
          start: region.start,
          end: region.end,
          binary_mode: region.binary_mode,
          endian: region.endian,
          text_direction: region.text_direction,
          traversal: region.traversal,
          presentation: region.presentation,
          encoding: region.encoding,
          label: region.label,
          region_class: region.region_class,
          region_receipt: regionReceipt(region)
        };
      });
      return {
        stream_id: state.stream_id,
        stream_scope: state.stream_scope,
        source: state.source,
        source_length: state.bytes.length,
        counts: countBands(state.bytes),
        active: {
          presentation: state.active.presentation
        },
        identity_receipt: state.identity_receipt,
        view_receipt: state.view_receipt,
        regions: regionSummaries
      };
    }

    function findRegion(index) {
      for (let i = state.regions.length - 1; i >= 0; i -= 1) {
        const region = state.regions[i];
        if (index >= region.start && index <= region.end) {
          return region;
        }
      }
      return null;
    }

    function validate() {
      const fresh = snapshot();
      const regionOk = fresh.regions.every(function (region) {
        return !!normalizeRegion(region, 0, state.bytes.length) && region.region_receipt === regionReceipt(normalizeRegion(region, 0, state.bytes.length));
      });
      return {
        ok: regionOk && fresh.identity_receipt === state.identity_receipt && fresh.view_receipt === state.view_receipt,
        identity_receipt: fresh.identity_receipt,
        view_receipt: fresh.view_receipt,
        error: regionOk ? "" : "invalid-region"
      };
    }

    function setSource(nextSource) {
      state.source = String(nextSource || "");
      state.bytes = toBytes(state.source);
      return recomputeReceipts();
    }

    function declareRegion(region) {
      const normalized = normalizeRegion(region, state.regions.length, state.bytes.length);
      if (!normalized) {
        return null;
      }
      state.regions.push(normalized);
      return recomputeReceipts();
    }

    function setPresentation(presentation) {
      const normalized = normalizePresentation(presentation);
      if (!normalized) {
        return null;
      }
      state.active.presentation = normalized;
      state.view_receipt = fnv1a(stableString({
        identity_receipt: state.identity_receipt,
        active: state.active
      }));
      return snapshot();
    }

    function togglePresentation() {
      return setPresentation(state.active.presentation === PRESENTATION.barcode ? PRESENTATION.chart : PRESENTATION.barcode);
    }

    function resolveIndex(index) {
      const resolvedIndex = Math.max(0, Math.floor(Number(index) || 0));
      const codepoint = state.bytes[resolvedIndex] === undefined ? 0 : state.bytes[resolvedIndex];
      const band = classifyCodepoint(codepoint);
      const region = findRegion(resolvedIndex);
      return {
        stream_id: state.stream_id,
        stream_scope: state.stream_scope,
        index: resolvedIndex,
        codepoint: codepoint,
        band: band.band,
        band_range: band.range,
        region: region ? Object.assign({}, region, { region_receipt: regionReceipt(region) }) : null,
        active: {
          presentation: state.active.presentation
        },
        identity_receipt: state.identity_receipt,
        view_receipt: state.view_receipt
      };
    }

    const api = {
      setSource: setSource,
      declareRegion: declareRegion,
      setPresentation: setPresentation,
      togglePresentation: togglePresentation,
      resolveIndex: resolveIndex,
      snapshot: snapshot,
      validate: validate
    };

    if (Array.isArray(options && options.regions)) {
      options.regions.forEach(function (region, index) {
        const normalized = normalizeRegion(region, index, state.bytes.length);
        if (normalized) {
          state.regions.push(normalized);
        }
      });
    } else {
      declareInitialRegion();
    }

    recomputeReceipts();
    return api;
  }

  return {
    BANDS: BANDS,
    PRESENTATION: PRESENTATION,
    classifyCodepoint: classifyCodepoint,
    normalizeRegion: normalizeRegion,
    createStreamDeclaration: createStreamDeclaration
  };
}));
