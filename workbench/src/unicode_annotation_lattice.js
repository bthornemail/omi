(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity
  );
  root.OMIUnicodeAnnotationLattice = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (artifactIdentity) {
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

  function parseCodepoint(value) {
    if (Number.isInteger(value)) {
      return value;
    }
    const text = String(value || "").trim();
    const match = text.match(/^U\+([0-9A-Fa-f]+)$/);
    if (!match) {
      throw new Error("invalid-codepoint");
    }
    return parseInt(match[1], 16);
  }

  function formatCodepoint(value) {
    const number = parseCodepoint(value);
    return "U+" + number.toString(16).toUpperCase().padStart(4, "0");
  }

  function unsignedHex(value) {
    return "0x" + (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }

  function createBlock(options) {
    const block = {
      sid: String(options && options.sid || "unicode.annotation.block"),
      unicode_version: String(options && options.unicode_version || "pinned-demo"),
      start: formatCodepoint(options && options.start || "U+0000"),
      end: formatCodepoint(options && options.end || "U+000F"),
      row_width: Number(options && options.row_width || 16),
      role: String(options && options.role || "annotation-feature-space"),
      projection: String(options && options.projection || "bitmask-feature"),
      authority: false
    };
    const start = parseCodepoint(block.start);
    const end = parseCodepoint(block.end);
    if (end < start) {
      throw new Error("invalid-block-range");
    }
    if (!Number.isInteger(block.row_width) || block.row_width <= 0 || block.row_width > 31) {
      throw new Error("invalid-row-width");
    }
    block.codepoint_count = end - start + 1;
    block.identity_receipt = fnv1a(stableString({
      sid: block.sid,
      unicode_version: block.unicode_version,
      start: block.start,
      end: block.end,
      row_width: block.row_width,
      role: block.role,
      authority: false
    }));
    return block;
  }

  function codepointFeature(blockInput, codepointInput) {
    const block = createBlock(blockInput || {});
    const codepoint = parseCodepoint(codepointInput);
    const start = parseCodepoint(block.start);
    const end = parseCodepoint(block.end);
    if (codepoint < start || codepoint > end) {
      throw new Error("codepoint-out-of-block");
    }
    const offset = codepoint - start;
    const row = Math.floor(offset / block.row_width);
    const column = offset % block.row_width;
    const bitmask = (1 << column) >>> 0;
    const feature = {
      block_sid: block.sid,
      unicode_version: block.unicode_version,
      codepoint: formatCodepoint(codepoint),
      offset: offset,
      row: row,
      column: column,
      bit_index: column,
      bitmask: bitmask,
      bitmask_hex: unsignedHex(bitmask),
      authority: false
    };
    feature.feature_receipt = fnv1a(stableString(feature));
    return feature;
  }

  function annotateLexeme(input) {
    const block = createBlock(input && input.block ? input.block : {});
    const feature = codepointFeature(block, input && input.codepoint);
    const lexeme = String(input && input.lexeme || "");
    const synset = String(input && input.synset || "");
    const relation = String(input && input.relation || "annotation");
    if (!lexeme || !synset) {
      throw new Error("missing-lexeme-or-synset");
    }
    const identityPayload = {
      kind: "unicode-lexeme-annotation",
      lexeme: lexeme,
      synset: synset,
      relation: relation
    };
    const projectionPayload = {
      identity: identityPayload,
      feature: feature,
      adapter_authority: false
    };
    const identityReceipt = fnv1a(stableString(identityPayload));
    const projectionReceipt = fnv1a(stableString(projectionPayload));
    return {
      kind: "unicode-lexeme-annotation",
      lexeme: lexeme,
      synset: synset,
      relation: relation,
      feature: feature,
      spom: {
        subject: "lexeme." + lexeme,
        predicate: relation,
        object: synset,
        modality: "unicode.annotation.projection"
      },
      identity_receipt: identityReceipt,
      projection_receipt: projectionReceipt,
      adapter_authority: false,
      authority: false
    };
  }

  function projectAnnotation(annotationInput, mode) {
    const annotation = clone(annotationInput);
    const viewMode = String(mode || "static");
    const payload = {
      mode: viewMode,
      lexeme: annotation.lexeme,
      synset: annotation.synset,
      codepoint: annotation.feature && annotation.feature.codepoint,
      bitmask_hex: annotation.feature && annotation.feature.bitmask_hex,
      adapter_authority: false
    };
    return {
      mode: viewMode,
      identity_receipt: annotation.identity_receipt,
      projection_receipt: annotation.projection_receipt,
      view_receipt: fnv1a(stableString({
        mode: viewMode,
        identity_receipt: annotation.identity_receipt,
        payload: payload
      })),
      payload: payload,
      adapter_authority: false
    };
  }

  return {
    createBlock: createBlock,
    codepointFeature: codepointFeature,
    annotateLexeme: annotateLexeme,
    projectAnnotation: projectAnnotation,
    parseCodepoint: parseCodepoint,
    formatCodepoint: formatCodepoint
  };
}));
