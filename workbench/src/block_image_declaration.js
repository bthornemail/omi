(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("fs") : root.fs,
    typeof require === "function" ? require("path") : root.path,
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity
  );
  root.OMIBlockImageDeclaration = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (fs, path, artifactIdentity) {
  "use strict";

  const DEFAULT_BLOCK_IMAGE_ID = "block.image";
  const DEFAULT_BLOCK_SCOPE = "public.global";
  const DEFAULT_PROJECTION_MODE = "lazy";
  const DEFAULT_VIEW_MODE = "lazy";
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

  function requireFs() {
    if (!fs || !path) {
      throw new Error("fs-unavailable");
    }
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function parseMaybeJson(source) {
    const text = String(source || "").trim();
    if (!text) {
      return null;
    }
    if (text[0] !== "{" && text[0] !== "[") {
      return null;
    }
    return JSON.parse(text);
  }

  function toInteger(value, name) {
    if (!Number.isFinite(Number(value)) || Math.floor(Number(value)) !== Number(value)) {
      throw new Error("invalid-" + name);
    }
    return Number(value);
  }

  function normalizeMode(value) {
    const mode = String(value || DEFAULT_PROJECTION_MODE);
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

  function normalizeBinaryBytes(value) {
    if (value === undefined || value === null) {
      return null;
    }
    if (Array.isArray(value)) {
      return value.map(function (item) {
        const byte = Number(item);
        if (!Number.isFinite(byte) || Math.floor(byte) !== byte || byte < 0 || byte > 255) {
          throw new Error("invalid-chunk-bytes");
        }
        return byte & 0xff;
      });
    }
    if (typeof value === "string") {
      const bytes = [];
      for (let i = 0; i < value.length; i += 1) {
        bytes.push(value.charCodeAt(i) & 0xff);
      }
      return bytes;
    }
    throw new Error("invalid-chunk-bytes");
  }

  function chunkContentHash(chunk, bytes) {
    if (chunk.content_hash !== undefined && chunk.content_hash !== null) {
      return toInteger(chunk.content_hash, "content-hash");
    }
    if (chunk.hash !== undefined && chunk.hash !== null) {
      return toInteger(chunk.hash, "content-hash");
    }
    if (chunk.bytes_hash !== undefined && chunk.bytes_hash !== null) {
      return toInteger(chunk.bytes_hash, "content-hash");
    }
    if (bytes) {
      return fnv1a(stableString(bytes));
    }
    return null;
  }

  function normalizeChunk(chunk, index, declaration) {
    if (!isPlainObject(chunk)) {
      throw new Error("invalid-chunk");
    }

    const offset = toInteger(chunk.offset, "chunk-offset");
    const size = toInteger(chunk.size, "chunk-size");
    const sparse = Boolean(chunk.sparse || chunk.present === false);
    const present = !sparse;
    const label = String(chunk.label || chunk.name || ("chunk." + index));
    const anchor = String(chunk.anchor || declaration.identity_anchor || declaration.block_image_id);
    const scope = String(chunk.scope || declaration.block_scope);
    const pathName = String(chunk.path || (declaration.omi_path + "/chunk/" + index));
    const bytes = normalizeBinaryBytes(chunk.bytes !== undefined ? chunk.bytes
      : (chunk.data !== undefined ? chunk.data
      : (chunk.content !== undefined ? chunk.content : chunk.byte_values)));

    if (offset < 0 || size <= 0) {
      throw new Error("invalid-chunk-range");
    }
    if (offset % declaration.block_size !== 0) {
      throw new Error("invalid-chunk-offset");
    }
    if (size % declaration.block_size !== 0) {
      throw new Error("invalid-chunk-size");
    }
    if (sparse && (bytes || (chunk.content_hash !== undefined && chunk.content_hash !== null) ||
        (chunk.hash !== undefined && chunk.hash !== null) ||
        (chunk.bytes_hash !== undefined && chunk.bytes_hash !== null))) {
      throw new Error("invalid-sparse-chunk");
    }
    if (present && !bytes && chunk.content_hash == null && chunk.hash == null && chunk.bytes_hash == null) {
      throw new Error("missing-chunk-content");
    }
    if (bytes && bytes.length !== size) {
      throw new Error("chunk-bytes-size-mismatch");
    }

    const contentHash = chunkContentHash(chunk, bytes);
    if (present && contentHash === null) {
      throw new Error("missing-chunk-content");
    }
    if (bytes && chunk.content_hash != null && toInteger(chunk.content_hash, "content-hash") !== fnv1a(stableString(bytes))) {
      throw new Error("chunk-content-hash-mismatch");
    }

    const summary = {
      index: index,
      offset: offset,
      size: size,
      sparse: sparse,
      present: present,
      scope: scope,
      path: pathName,
      anchor: anchor,
      label: label,
      byte_length: bytes ? bytes.length : 0,
      bytes: bytes,
      content_hash: contentHash
    };

    summary.chunk_receipt = fnv1a(stableString({
      block_image_id: declaration.block_image_id,
      omi_path: declaration.omi_path,
      block_scope: declaration.block_scope,
      identity_anchor: declaration.identity_anchor,
      offset: summary.offset,
      size: summary.size,
      sparse: summary.sparse,
      present: summary.present,
      scope: summary.scope,
      path: summary.path,
      anchor: summary.anchor,
      label: summary.label,
      byte_length: summary.byte_length,
      content_hash: summary.content_hash
    }));

    return summary;
  }

  function normalizeChunks(chunks, declaration) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      throw new Error("invalid-chunk-table");
    }

    const sorted = chunks.map(function (chunk, index) {
      return Object.assign({ declaration_order: index }, normalizeChunk(chunk, index, declaration));
    }).sort(function (a, b) {
      if (a.offset !== b.offset) {
        return a.offset - b.offset;
      }
      if (a.size !== b.size) {
        return a.size - b.size;
      }
      return a.declaration_order - b.declaration_order;
    });

    let expectedOffset = 0;
    sorted.forEach(function (chunk, index) {
      if (chunk.offset !== expectedOffset) {
        throw new Error("non-contiguous-chunk-layout");
      }
      expectedOffset = chunk.offset + chunk.size;
      chunk.index = index;
      delete chunk.declaration_order;
    });

    return {
      chunks: sorted,
      total_size: expectedOffset
    };
  }

  function chunkTableReceipt(chunks) {
    return fnv1a(stableString(chunks.map(function (chunk) {
      return {
        index: chunk.index,
        offset: chunk.offset,
        size: chunk.size,
        sparse: chunk.sparse,
        present: chunk.present,
        scope: chunk.scope,
        path: chunk.path,
        anchor: chunk.anchor,
        label: chunk.label,
        byte_length: chunk.byte_length,
        content_hash: chunk.content_hash,
        chunk_receipt: chunk.chunk_receipt
      };
    })));
  }

  function normalizeDeclaration(input) {
    if (!input) {
      return null;
    }
    if (typeof input.snapshot === "function") {
      return normalizeDeclaration(input.snapshot());
    }
    if (input.files && (input.manifest || input["manifest.json"])) {
      return importBlockImageSnapshot(input).declaration;
    }
    if (typeof input === "string") {
      const parsed = parseMaybeJson(input);
      if (parsed) {
        return normalizeDeclaration(parsed);
      }
      if (fs && path) {
        try {
          if (fs.existsSync(input) && fs.statSync(input).isDirectory()) {
            return importBlockImageSnapshot(input).declaration;
          }
        } catch (error) {
          return null;
        }
      }
      return null;
    }
    if (!isPlainObject(input)) {
      return null;
    }
    if (!Object.prototype.hasOwnProperty.call(input, "block_size") &&
        !Object.prototype.hasOwnProperty.call(input, "blockSize")) {
      return null;
    }

    const blockImageId = String(input.block_image_id || input.omi_path || input.id || DEFAULT_BLOCK_IMAGE_ID);
    const omiPath = String(input.omi_path || input.block_image_id || blockImageId);
    const blockScope = String(input.block_scope || input.scope || DEFAULT_BLOCK_SCOPE);
    const identityAnchor = String(input.identity_anchor || blockImageId);
    const blockSize = toInteger(input.block_size !== undefined ? input.block_size : input.blockSize, "block-size");
    const activeProjection = normalizeMode(input.active_projection_mode || input.projection_mode || input.mode || DEFAULT_PROJECTION_MODE);
    const activeView = normalizeMode(input.active_view_mode || input.view_mode || input.mode || DEFAULT_VIEW_MODE);

    if (blockSize <= 0) {
      throw new Error("invalid-block-size");
    }

    const chunkResult = normalizeChunks(input.chunks, {
      block_image_id: blockImageId,
      omi_path: omiPath,
      block_scope: blockScope,
      identity_anchor: identityAnchor,
      block_size: blockSize
    });
    const totalSize = input.total_size !== undefined ? toInteger(input.total_size, "total-size") : chunkResult.total_size;
    if (totalSize <= 0) {
      throw new Error("invalid-total-size");
    }
    if (totalSize !== chunkResult.total_size) {
      throw new Error("total-size-mismatch");
    }

    const declaration = {
      block_image_id: blockImageId,
      omi_path: omiPath,
      block_scope: blockScope,
      identity_anchor: identityAnchor,
      block_size: blockSize,
      total_size: totalSize,
      chunk_count: chunkResult.chunks.length,
      sparse_chunk_count: chunkResult.chunks.filter(function (chunk) { return chunk.sparse; }).length,
      dense_chunk_count: chunkResult.chunks.filter(function (chunk) { return !chunk.sparse; }).length,
      chunk_table_receipt: chunkTableReceipt(chunkResult.chunks),
      chunks: chunkResult.chunks,
      active: {
        projection_mode: activeProjection,
        view_mode: activeView
      }
    };

    declaration.identity_receipt = fnv1a(stableString({
      block_image_id: declaration.block_image_id,
      omi_path: declaration.omi_path,
      block_scope: declaration.block_scope,
      identity_anchor: declaration.identity_anchor,
      block_size: declaration.block_size,
      total_size: declaration.total_size,
      chunk_count: declaration.chunk_count,
      sparse_chunk_count: declaration.sparse_chunk_count,
      dense_chunk_count: declaration.dense_chunk_count,
      chunk_table_receipt: declaration.chunk_table_receipt,
      chunks: declaration.chunks.map(function (chunk) {
        return {
          offset: chunk.offset,
          size: chunk.size,
          sparse: chunk.sparse,
          present: chunk.present,
          scope: chunk.scope,
          path: chunk.path,
          anchor: chunk.anchor,
          label: chunk.label,
          byte_length: chunk.byte_length,
          content_hash: chunk.content_hash,
          chunk_receipt: chunk.chunk_receipt
        };
      })
    }));
    declaration.projection_receipt = 0;
    declaration.package_receipt = 0;
    declaration.view_receipt = 0;
    declaration.receipts = {
      identity_receipt: declaration.identity_receipt,
      projection_receipt: declaration.projection_receipt,
      package_receipt: declaration.package_receipt,
      view_receipt: declaration.view_receipt,
      chunk_table_receipt: declaration.chunk_table_receipt
    };

    return declaration;
  }

  function decorateDeclaration(declaration) {
    const data = clone(declaration);
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
          return projectBlockImageDeclaration(data, Object.assign({}, options || {}, { mode: mode }));
        }
      },
      exportSnapshot: {
        enumerable: false,
        value: function exportSnapshot(options) {
          return exportBlockImageSnapshot(data, options || {});
        }
      }
    });

    return api;
  }

  function blockLayoutSummary(declaration) {
    return {
      block_image_id: declaration.block_image_id,
      omi_path: declaration.omi_path,
      block_scope: declaration.block_scope,
      identity_anchor: declaration.identity_anchor,
      block_size: declaration.block_size,
      total_size: declaration.total_size,
      chunk_count: declaration.chunk_count,
      sparse_chunk_count: declaration.sparse_chunk_count,
      dense_chunk_count: declaration.dense_chunk_count,
      chunk_table_receipt: declaration.chunk_table_receipt
    };
  }

  function projectBlockImageDeclaration(input, options) {
    const declaration = normalizeDeclaration(input);
    if (!declaration || !declaration.identity_receipt) {
      return null;
    }
    const projectionMode = normalizeMode(options && options.mode !== undefined ? options.mode : declaration.active && declaration.active.projection_mode);
    const viewMode = normalizeMode(options && options.view_mode !== undefined ? options.view_mode : declaration.active && declaration.active.view_mode);
    if (!projectionMode || !viewMode) {
      return null;
    }

    const base = blockLayoutSummary(declaration);
    let projectionSurfaceCore;
    if (projectionMode === "lazy") {
      projectionSurfaceCore = Object.assign({}, base, {
        mode: projectionMode,
        lens: "sealed",
        sealed_chunks: declaration.chunks.map(function (chunk) {
          return {
            index: chunk.index,
            offset: chunk.offset,
            size: chunk.size,
            sparse: chunk.sparse,
            present: chunk.present,
            label: chunk.label,
            chunk_receipt: chunk.chunk_receipt
          };
        })
      });
    } else if (projectionMode === "greedy") {
      projectionSurfaceCore = Object.assign({}, base, {
        mode: projectionMode,
        lens: "expanded",
        chunks: declaration.chunks.map(clone)
      });
    } else if (projectionMode === "static") {
      projectionSurfaceCore = Object.assign({}, base, {
        mode: projectionMode,
        lens: "layout",
        layout: declaration.chunks.map(function (chunk) {
          return {
            index: chunk.index,
            offset: chunk.offset,
            size: chunk.size,
            sparse: chunk.sparse,
            present: chunk.present,
            scope: chunk.scope,
            path: chunk.path,
            label: chunk.label,
            chunk_receipt: chunk.chunk_receipt
          };
        })
      });
    } else if (projectionMode === "animated") {
      projectionSurfaceCore = Object.assign({}, base, {
        mode: projectionMode,
        lens: "timeline",
        frame_count: DEFAULT_FRAME_COUNT,
        timeline: declaration.chunks.map(function (chunk, index) {
          return {
            frame: index,
            chunk_index: chunk.index,
            chunk_receipt: chunk.chunk_receipt,
            sparse: chunk.sparse,
            present: chunk.present
          };
        }),
        cycle_receipt: fnv1a(stableString({
          identity_receipt: declaration.identity_receipt,
          frame_count: DEFAULT_FRAME_COUNT,
          chunk_receipts: declaration.chunks.map(function (chunk) {
            return chunk.chunk_receipt;
          })
        }))
      });
    } else {
      return null;
    }

    const projectionReceipt = fnv1a(stableString({
      identity_receipt: declaration.identity_receipt,
      projection_mode: projectionMode,
      surface: projectionSurfaceCore
    }));

    const projectionSurface = Object.assign({}, projectionSurfaceCore, {
      identity_receipt: declaration.identity_receipt,
      projection_receipt: projectionReceipt
    });

    const viewSurface = Object.assign({}, projectionSurface, {
      presentation: viewMode
    });

    const viewReceipt = fnv1a(stableString({
      identity_receipt: declaration.identity_receipt,
      view_mode: viewMode,
      presentation: viewMode,
      surface: viewSurface
    }));

    return Object.assign({}, viewSurface, {
      projection_surface: projectionSurface,
      view_surface: viewSurface,
      identity_receipt: declaration.identity_receipt,
      projection_receipt: projectionReceipt,
      package_receipt: 0,
      view_receipt: viewReceipt,
      receipts: {
        identity_receipt: declaration.identity_receipt,
        projection_receipt: projectionReceipt,
        package_receipt: 0,
        view_receipt: viewReceipt
      }
    });
  }

  function packageReceiptData(manifest) {
    return {
      package_kind: manifest.package_kind,
      version: manifest.version,
      block_image_id: manifest.block_image_id,
      omi_path: manifest.omi_path,
      block_scope: manifest.block_scope,
      identity_anchor: manifest.identity_anchor,
      block_size: manifest.block_size,
      total_size: manifest.total_size,
      chunk_count: manifest.chunk_count,
      sparse_chunk_count: manifest.sparse_chunk_count,
      dense_chunk_count: manifest.dense_chunk_count,
      projection_mode: manifest.projection_mode,
      view_mode: manifest.view_mode,
      identity_receipt: manifest.identity_receipt,
      projection_receipt: manifest.projection_receipt,
      view_receipt: manifest.view_receipt,
      chunk_table_receipt: manifest.chunk_table_receipt,
      file_receipts: manifest.file_receipts,
      required_files: manifest.required_files
    };
  }

  function exportBlockImageSnapshot(input, options) {
    const declaration = normalizeDeclaration(input);
    if (!declaration) {
      throw new Error("invalid-block-image-declaration");
    }
    const projectionMode = normalizeMode(options && options.projection_mode !== undefined ? options.projection_mode : (options && options.mode !== undefined ? options.mode : declaration.active.projection_mode));
    const viewMode = normalizeMode(options && options.view_mode !== undefined ? options.view_mode : (options && options.mode !== undefined ? options.mode : declaration.active.view_mode));
    if (!projectionMode || !viewMode) {
      throw new Error("invalid-projection-mode");
    }
    const projection = projectBlockImageDeclaration(declaration, {
      mode: projectionMode,
      view_mode: viewMode
    });
    if (!projection) {
      throw new Error("invalid-block-image-projection");
    }

    const declarationFile = {
      block_image_id: declaration.block_image_id,
      omi_path: declaration.omi_path,
      block_scope: declaration.block_scope,
      identity_anchor: declaration.identity_anchor,
      block_size: declaration.block_size,
      total_size: declaration.total_size,
      chunk_count: declaration.chunk_count,
      sparse_chunk_count: declaration.sparse_chunk_count,
      dense_chunk_count: declaration.dense_chunk_count,
      identity_receipt: declaration.identity_receipt,
      chunk_table_receipt: declaration.chunk_table_receipt,
      active: declaration.active,
      chunks: declaration.chunks
    };
    const chunksFile = {
      block_image_id: declaration.block_image_id,
      block_scope: declaration.block_scope,
      block_size: declaration.block_size,
      total_size: declaration.total_size,
      chunk_count: declaration.chunk_count,
      chunks: declaration.chunks
    };
    const receipts = {
      identity_receipt: declaration.identity_receipt,
      projection_receipt: projection.projection_receipt,
      view_receipt: projection.view_receipt,
      chunk_table_receipt: declaration.chunk_table_receipt
    };

    const files = {
      "manifest.json": null,
      "declaration/block-image.json": stableString(declarationFile),
      "chunks/chunks.json": stableString(chunksFile),
      "projection/projection.json": stableString(projection.projection_surface || projection),
      "receipts/receipts.json": stableString(receipts),
      "README.org": [
        "#+TITLE: OMI Block Image Declaration",
        "",
        "This package carries a deterministic block-image declaration,",
        "its chunk table, projection lens, and receipts.",
        "",
        "Identity follows the chunk layout and content.",
        "Projection follows the readout lens.",
        "View follows presentation."
      ].join("\n")
    };

    const manifest = {
      package_kind: "block-image-declaration",
      version: 1,
      block_image_id: declaration.block_image_id,
      omi_path: declaration.omi_path,
      block_scope: declaration.block_scope,
      identity_anchor: declaration.identity_anchor,
      block_size: declaration.block_size,
      total_size: declaration.total_size,
      chunk_count: declaration.chunk_count,
      sparse_chunk_count: declaration.sparse_chunk_count,
      dense_chunk_count: declaration.dense_chunk_count,
      identity_receipt: declaration.identity_receipt,
      projection_receipt: projection.projection_receipt,
      package_receipt: 0,
      view_receipt: projection.view_receipt,
      chunk_table_receipt: declaration.chunk_table_receipt,
      projection_mode: projectionMode,
      view_mode: viewMode,
      file_receipts: {},
      required_files: Object.keys(files).filter(function (name) {
        return name !== "manifest.json";
      }).sort()
    };

    Object.keys(files).forEach(function (name) {
      if (name !== "manifest.json") {
        manifest.file_receipts[name] = fnv1a(String(files[name] || ""));
      }
    });
    manifest.package_receipt = fnv1a(stableString(packageReceiptData(manifest)));
    files["manifest.json"] = stableString(manifest);

    return {
      manifest: manifest,
      files: files,
      declaration: decorateDeclaration(declaration),
      projection: projection,
      receipts: receipts
    };
  }

  function readSnapshot(dirPath) {
    requireFs();
    const files = {};

    function walk(current, rel) {
      fs.readdirSync(current, { withFileTypes: true }).forEach(function (entry) {
        const nextPath = path.join(current, entry.name);
        const nextRel = rel ? path.join(rel, entry.name) : entry.name;
        if (entry.isDirectory()) {
          walk(nextPath, nextRel);
          return;
        }
        files[nextRel.replace(/\\/g, "/")] = fs.readFileSync(nextPath, "utf8");
      });
    }

    walk(dirPath, "");
    return {
      files: files,
      manifest: files["manifest.json"] ? JSON.parse(files["manifest.json"]) : null
    };
  }

  function normalizeBundleInput(input) {
    if (typeof input === "string") {
      const parsed = parseMaybeJson(input);
      if (parsed) {
        return normalizeBundleInput(parsed);
      }
      if (fs && path) {
        try {
          if (fs.existsSync(input) && fs.statSync(input).isDirectory()) {
            return readSnapshot(input);
          }
        } catch (error) {
          return null;
        }
      }
      return null;
    }
    if (!input) {
      return null;
    }
    if (input.files && typeof input.files === "object") {
      return {
        files: input.files,
        manifest: input.manifest || null
      };
    }
    if (input["manifest.json"] || input["README.org"]) {
      return {
        files: input,
        manifest: null
      };
    }
    return null;
  }

  function validateManifest(manifest, files) {
    if (!manifest || manifest.package_kind !== "block-image-declaration") {
      throw new Error("invalid-manifest");
    }
    if (!Number.isInteger(manifest.version) || manifest.version !== 1) {
      throw new Error("invalid-manifest-version");
    }
    if (!manifest.block_image_id || !manifest.omi_path) {
      throw new Error("invalid-block-image-identity");
    }
    if (!manifest.block_scope || !manifest.identity_anchor) {
      throw new Error("invalid-block-image-scope");
    }
    if (!Number.isInteger(manifest.block_size) || manifest.block_size <= 0) {
      throw new Error("invalid-block-size");
    }
    if (!Number.isInteger(manifest.total_size) || manifest.total_size <= 0) {
      throw new Error("invalid-total-size");
    }
    if (!Number.isInteger(manifest.chunk_count) || manifest.chunk_count <= 0) {
      throw new Error("invalid-chunk-count");
    }
    if (!Number.isInteger(manifest.sparse_chunk_count) || manifest.sparse_chunk_count < 0) {
      throw new Error("invalid-sparse-count");
    }
    if (!Number.isInteger(manifest.dense_chunk_count) || manifest.dense_chunk_count < 0) {
      throw new Error("invalid-dense-count");
    }
    if (!manifest.file_receipts || typeof manifest.file_receipts !== "object") {
      throw new Error("invalid-file-receipts");
    }
    if (!Array.isArray(manifest.required_files)) {
      throw new Error("invalid-required-files");
    }
    if (Object.prototype.hasOwnProperty.call(files, "manifest.json") &&
        String(files["manifest.json"]) !== stableString(manifest)) {
      throw new Error("manifest-mismatch");
    }

    const manifestCheck = clone(manifest);
    delete manifestCheck.package_receipt;
    const expectedPackageReceipt = fnv1a(stableString(packageReceiptData(manifestCheck)));
    if (Number(manifest.package_receipt) !== expectedPackageReceipt) {
      throw new Error("invalid-package-receipt");
    }

    manifest.required_files.forEach(function (name) {
      if (!Object.prototype.hasOwnProperty.call(files, name)) {
        throw new Error("missing-package-entry:" + name);
      }
      const expected = manifest.file_receipts[name];
      const actual = fnv1a(String(files[name] || ""));
      if (Number(expected) !== actual) {
        throw new Error("receipt-mismatch:" + name);
      }
    });

    const declaration = JSON.parse(String(files["declaration/block-image.json"] || "{}"));
    const chunksFile = JSON.parse(String(files["chunks/chunks.json"] || "{}"));
    const projection = JSON.parse(String(files["projection/projection.json"] || "{}"));
    const receipts = JSON.parse(String(files["receipts/receipts.json"] || "{}"));

    const normalizedDeclaration = normalizeDeclaration(declaration);
    if (!normalizedDeclaration) {
      throw new Error("invalid-block-image-declaration");
    }

    if (stableString(normalizedDeclaration.chunks) !== stableString(chunksFile.chunks)) {
      throw new Error("chunk-table-mismatch");
    }
    if (Number(normalizedDeclaration.identity_receipt) !== Number(manifest.identity_receipt)) {
      throw new Error("identity-receipt-mismatch");
    }
    if (Number(normalizedDeclaration.chunk_table_receipt) !== Number(manifest.chunk_table_receipt)) {
      throw new Error("chunk-table-receipt-mismatch");
    }
    if (Number(projection.identity_receipt || 0) !== Number(manifest.identity_receipt)) {
      throw new Error("projection-identity-receipt-mismatch");
    }
    if (Number(projection.projection_receipt || 0) !== Number(manifest.projection_receipt)) {
      throw new Error("projection-receipt-mismatch");
    }
    if (Number(receipts.identity_receipt || 0) !== Number(manifest.identity_receipt) ||
        Number(receipts.projection_receipt || 0) !== Number(manifest.projection_receipt) ||
        Number(receipts.view_receipt || 0) !== Number(manifest.view_receipt) ||
        Number(receipts.chunk_table_receipt || 0) !== Number(manifest.chunk_table_receipt)) {
      throw new Error("receipt-mismatch:block-image");
    }

    const expectedProjection = projectBlockImageDeclaration(normalizedDeclaration, {
      mode: manifest.projection_mode,
      view_mode: manifest.view_mode
    });
    if (stableString(expectedProjection.projection_surface || expectedProjection) !== stableString(projection)) {
      throw new Error("projection-mismatch");
    }

    return {
      ok: true,
      manifest: manifest,
      declaration: normalizedDeclaration,
      projection: projection,
      chunks: normalizedDeclaration.chunks,
      receipts: receipts,
      files: files
    };
  }

  function importBlockImageSnapshot(input) {
    const normalized = normalizeBundleInput(input);
    if (!normalized) {
      throw new Error("invalid-package");
    }
    if (!Object.prototype.hasOwnProperty.call(normalized.files, "manifest.json") && !normalized.manifest) {
      throw new Error("missing-manifest");
    }
    const manifest = normalized.manifest || JSON.parse(String(normalized.files["manifest.json"] || ""));
    return validateManifest(manifest, normalized.files);
  }

  function writeSnapshot(dirPath, bundle) {
    requireFs();
    fs.mkdirSync(dirPath, { recursive: true });
    Object.keys(bundle.files).sort().forEach(function (name) {
      const target = path.join(dirPath, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, String(bundle.files[name]), "utf8");
    });
    return dirPath;
  }

  return {
    createBlockImageDeclaration: function createBlockImageDeclaration(input) {
      const declaration = normalizeDeclaration(input);
      if (!declaration) {
        throw new Error("invalid-block-image-declaration");
      }
      return decorateDeclaration(declaration);
    },
    projectBlockImageDeclaration: projectBlockImageDeclaration,
    exportBlockImageSnapshot: exportBlockImageSnapshot,
    importBlockImageSnapshot: importBlockImageSnapshot,
    readSnapshot: readSnapshot,
    writeSnapshot: writeSnapshot,
    validateManifest: validateManifest
  };
}));
