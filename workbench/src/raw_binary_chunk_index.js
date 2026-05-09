(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity
  );
  root.OMIRawBinaryChunkIndex = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (artifactIdentity) {
  "use strict";

  const DEFAULT_INDEX_ID = "raw.binary.index";
  const DEFAULT_SCOPE = "public.global";
  const DEFAULT_BLOCK_SIZE = 4096;
  const DEFAULT_FRAME_COUNT = 5040;

  function fnv1a(text) {
    return artifactIdentity.fnv1a(String(text || ""));
  }

  function stableString(value) {
    return artifactIdentity.stableString(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function toInteger(value, name) {
    if (!Number.isFinite(Number(value)) || Math.floor(Number(value)) !== Number(value)) {
      throw new Error("invalid-" + name);
    }
    return Number(value);
  }

  function normalizeMode(value) {
    const mode = String(value || "lazy");
    if (mode === "barcode" || mode === "lazy") {
      return "lazy";
    }
    if (mode === "chart" || mode === "greedy") {
      return "greedy";
    }
    if (mode === "static" || mode === "animated") {
      return mode;
    }
    return null;
  }

  function isArrayBuffer(value) {
    return value && Object.prototype.toString.call(value) === "[object ArrayBuffer]";
  }

  function normalizeByteArray(value) {
    if (value === undefined || value === null) {
      throw new Error("missing-raw-bytes");
    }
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
      return Array.from(value);
    }
    if (ArrayBuffer.isView && ArrayBuffer.isView(value)) {
      return Array.from(value).map(validateByte);
    }
    if (isArrayBuffer(value)) {
      return Array.from(new Uint8Array(value));
    }
    if (Array.isArray(value)) {
      return value.map(validateByte);
    }
    if (typeof value === "string") {
      const bytes = [];
      for (let i = 0; i < value.length; i += 1) {
        bytes.push(value.charCodeAt(i) & 0xff);
      }
      return bytes;
    }
    throw new Error("invalid-raw-bytes");
  }

  function validateByte(value) {
    const byte = Number(value);
    if (!Number.isFinite(byte) || Math.floor(byte) !== byte || byte < 0 || byte > 255) {
      throw new Error("invalid-raw-byte");
    }
    return byte & 0xff;
  }

  function normalizeInput(input, options) {
    const opts = options || {};
    const raw = input && typeof input === "object" && !Array.isArray(input) &&
      !(typeof Buffer !== "undefined" && Buffer.isBuffer(input)) &&
      !(ArrayBuffer.isView && ArrayBuffer.isView(input)) &&
      !isArrayBuffer(input)
      ? input
      : { bytes: input };

    const bytes = normalizeByteArray(
      raw.bytes !== undefined ? raw.bytes
        : (raw.payload !== undefined ? raw.payload
        : (raw.data !== undefined ? raw.data : raw.content))
    );
    const blockSize = toInteger(
      raw.block_size !== undefined ? raw.block_size
        : (raw.blockSize !== undefined ? raw.blockSize
        : (opts.block_size !== undefined ? opts.block_size
        : (opts.blockSize !== undefined ? opts.blockSize : DEFAULT_BLOCK_SIZE))),
      "block-size"
    );
    if (blockSize <= 0) {
      throw new Error("invalid-block-size");
    }

    const indexId = String(raw.index_id || raw.raw_binary_id || raw.id || opts.index_id || opts.id || DEFAULT_INDEX_ID);
    const omiPath = String(raw.omi_path || raw.path || opts.omi_path || indexId);
    const scope = String(raw.scope || raw.block_scope || opts.scope || DEFAULT_SCOPE);
    const identityAnchor = String(raw.identity_anchor || opts.identity_anchor || indexId);
    const projectionMode = normalizeMode(raw.projection_mode || raw.active_projection_mode || opts.projection_mode || opts.mode || "lazy");
    const viewMode = normalizeMode(raw.view_mode || raw.active_view_mode || opts.view_mode || opts.mode || "lazy");
    if (!projectionMode || !viewMode) {
      throw new Error("invalid-projection-mode");
    }

    return {
      bytes: bytes,
      block_size: blockSize,
      index_id: indexId,
      omi_path: omiPath,
      scope: scope,
      identity_anchor: identityAnchor,
      projection_mode: projectionMode,
      view_mode: viewMode
    };
  }

  function byteHash(bytes) {
    let hash = 2166136261;
    bytes.forEach(function (byte) {
      hash ^= byte & 0xff;
      hash = Math.imul(hash, 16777619) >>> 0;
    });
    return hash >>> 0;
  }

  function isSparse(bytes) {
    return bytes.every(function (byte) {
      return byte === 0;
    });
  }

  function normalizeChunk(chunkBytes, index, offset, size, input) {
    const sparse = isSparse(chunkBytes);
    const contentHash = sparse ? null : byteHash(chunkBytes);
    const chunk = {
      index: index,
      offset: offset,
      size: size,
      sparse: sparse,
      present: !sparse,
      sparse_marker: sparse ? "declarative-hole" : "present-bytes",
      byte_length: size,
      content_hash: contentHash
    };

    chunk.chunk_receipt = fnv1a(stableString({
      index_id: input.index_id,
      omi_path: input.omi_path,
      scope: input.scope,
      identity_anchor: input.identity_anchor,
      block_size: input.block_size,
      index: chunk.index,
      offset: chunk.offset,
      size: chunk.size,
      sparse: chunk.sparse,
      present: chunk.present,
      sparse_marker: chunk.sparse_marker,
      byte_length: chunk.byte_length,
      content_hash: chunk.content_hash
    }));

    return chunk;
  }

  function createChunks(input) {
    const chunks = [];
    for (let offset = 0; offset < input.bytes.length; offset += input.block_size) {
      const chunkBytes = input.bytes.slice(offset, offset + input.block_size);
      chunks.push(normalizeChunk(chunkBytes, chunks.length, offset, chunkBytes.length, input));
    }
    return chunks;
  }

  function chunkReceiptIndex(chunks) {
    return chunks.map(function (chunk) {
      return {
        index: chunk.index,
        offset: chunk.offset,
        size: chunk.size,
        sparse: chunk.sparse,
        present: chunk.present,
        sparse_marker: chunk.sparse_marker,
        byte_length: chunk.byte_length,
        content_hash: chunk.content_hash,
        chunk_receipt: chunk.chunk_receipt
      };
    });
  }

  function decorateIndex(index) {
    const data = clone(index);
    const api = clone(data);
    Object.defineProperties(api, {
      snapshot: {
        enumerable: false,
        value: function snapshot() {
          return clone(data);
        }
      },
      project: {
        enumerable: false,
        value: function project(mode, options) {
          return projectRawBinaryChunkIndex(data, Object.assign({}, options || {}, { mode: mode }));
        }
      }
    });
    return api;
  }

  function createRawBinaryChunkIndex(input, options) {
    const normalized = normalizeInput(input, options || {});
    const chunks = createChunks(normalized);
    const chunkIndex = chunkReceiptIndex(chunks);
    const indexReceipt = fnv1a(stableString({
      index_id: normalized.index_id,
      omi_path: normalized.omi_path,
      scope: normalized.scope,
      identity_anchor: normalized.identity_anchor,
      block_size: normalized.block_size,
      total_size: normalized.bytes.length,
      chunk_index: chunkIndex
    }));
    const index = {
      index_id: normalized.index_id,
      omi_path: normalized.omi_path,
      scope: normalized.scope,
      identity_anchor: normalized.identity_anchor,
      block_size: normalized.block_size,
      total_size: normalized.bytes.length,
      chunk_count: chunks.length,
      sparse_chunk_count: chunks.filter(function (chunk) { return chunk.sparse; }).length,
      dense_chunk_count: chunks.filter(function (chunk) { return !chunk.sparse; }).length,
      chunks: chunks,
      index_receipt: indexReceipt,
      identity_receipt: indexReceipt,
      projection_receipt: 0,
      package_receipt: 0,
      view_receipt: 0,
      active: {
        projection_mode: normalized.projection_mode,
        view_mode: normalized.view_mode
      }
    };
    index.receipts = {
      identity_receipt: index.identity_receipt,
      projection_receipt: index.projection_receipt,
      package_receipt: index.package_receipt,
      view_receipt: index.view_receipt,
      index_receipt: index.index_receipt
    };
    return decorateIndex(index);
  }

  function normalizeIndex(input) {
    if (!input) {
      return null;
    }
    if (typeof input.snapshot === "function") {
      return input.snapshot();
    }
    if (input && typeof input === "object" && Array.isArray(input.chunks) && input.identity_receipt !== undefined) {
      return clone(input);
    }
    return createRawBinaryChunkIndex(input).snapshot();
  }

  function indexSummary(index) {
    return {
      index_id: index.index_id,
      omi_path: index.omi_path,
      scope: index.scope,
      identity_anchor: index.identity_anchor,
      block_size: index.block_size,
      total_size: index.total_size,
      chunk_count: index.chunk_count,
      sparse_chunk_count: index.sparse_chunk_count,
      dense_chunk_count: index.dense_chunk_count,
      index_receipt: index.index_receipt
    };
  }

  function projectRawBinaryChunkIndex(input, options) {
    const index = normalizeIndex(input);
    if (!index) {
      return null;
    }
    const projectionMode = normalizeMode(options && options.mode !== undefined ? options.mode : index.active && index.active.projection_mode);
    const viewMode = normalizeMode(options && options.view_mode !== undefined ? options.view_mode : index.active && index.active.view_mode);
    if (!projectionMode || !viewMode) {
      return null;
    }

    const base = indexSummary(index);
    let surface;
    if (projectionMode === "lazy") {
      surface = Object.assign({}, base, {
        mode: "lazy",
        lens: "sealed-chunk-manifest",
        sealed_chunks: index.chunks.map(function (chunk) {
          return {
            index: chunk.index,
            offset: chunk.offset,
            size: chunk.size,
            sparse: chunk.sparse,
            chunk_receipt: chunk.chunk_receipt
          };
        })
      });
    } else if (projectionMode === "greedy") {
      surface = Object.assign({}, base, {
        mode: "greedy",
        lens: "expanded-chunk-chart",
        chunks: index.chunks.map(clone)
      });
    } else if (projectionMode === "static") {
      surface = Object.assign({}, base, {
        mode: "static",
        lens: "receipt-reconciliation",
        layout: index.chunks.map(function (chunk) {
          return {
            index: chunk.index,
            offset: chunk.offset,
            size: chunk.size,
            sparse: chunk.sparse,
            sparse_marker: chunk.sparse_marker,
            content_hash: chunk.content_hash,
            chunk_receipt: chunk.chunk_receipt
          };
        })
      });
    } else if (projectionMode === "animated") {
      surface = Object.assign({}, base, {
        mode: "animated",
        lens: "offset-sweep",
        frame_count: DEFAULT_FRAME_COUNT,
        timeline: index.chunks.map(function (chunk, frame) {
          return {
            frame: frame,
            chunk_index: chunk.index,
            offset: chunk.offset,
            size: chunk.size,
            sparse: chunk.sparse,
            chunk_receipt: chunk.chunk_receipt
          };
        }),
        cycle_receipt: fnv1a(stableString({
          identity_receipt: index.identity_receipt,
          frame_count: DEFAULT_FRAME_COUNT,
          chunk_receipts: index.chunks.map(function (chunk) {
            return chunk.chunk_receipt;
          })
        }))
      });
    } else {
      return null;
    }

    const projectionReceipt = fnv1a(stableString({
      identity_receipt: index.identity_receipt,
      projection_mode: projectionMode,
      surface: surface
    }));
    const projectionSurface = Object.assign({}, surface, {
      identity_receipt: index.identity_receipt,
      projection_receipt: projectionReceipt
    });
    const viewSurface = Object.assign({}, projectionSurface, {
      presentation: viewMode
    });
    const viewReceipt = fnv1a(stableString({
      identity_receipt: index.identity_receipt,
      view_mode: viewMode,
      surface: viewSurface
    }));

    return Object.assign({}, viewSurface, {
      projection_surface: projectionSurface,
      view_surface: viewSurface,
      identity_receipt: index.identity_receipt,
      projection_receipt: projectionReceipt,
      package_receipt: 0,
      view_receipt: viewReceipt,
      receipts: {
        identity_receipt: index.identity_receipt,
        projection_receipt: projectionReceipt,
        package_receipt: 0,
        view_receipt: viewReceipt
      }
    });
  }

  return {
    createRawBinaryChunkIndex: createRawBinaryChunkIndex,
    projectRawBinaryChunkIndex: projectRawBinaryChunkIndex,
    byteHash: byteHash
  };
}));
