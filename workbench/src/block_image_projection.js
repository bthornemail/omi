(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./block_image_declaration.js") : root.OMIBlockImageDeclaration
  );
  root.OMIBlockImageProjection = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (artifactIdentity, blockImageDeclaration) {
  "use strict";

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

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeProjectionMode(value) {
    const mode = String(value || "");
    if (mode === "lazy" || mode === "barcode") {
      return "lazy";
    }
    if (mode === "greedy" || mode === "chart") {
      return "greedy";
    }
    if (mode === "static" || mode === "summary") {
      return "static";
    }
    if (mode === "animated" || mode === "sweep") {
      return "animated";
    }
    return null;
  }

  function normalizeViewMode(value, projectionMode) {
    const mode = String(value || "");
    if (mode.trim()) {
      return mode;
    }
    if (projectionMode === "lazy") {
      return "barcode";
    }
    if (projectionMode === "greedy") {
      return "chart";
    }
    if (projectionMode === "static") {
      return "summary";
    }
    if (projectionMode === "animated") {
      return "sweep";
    }
    return "presentation";
  }

  function normalizeDeclaration(input) {
    if (!input) {
      return null;
    }
    if (typeof input.snapshot === "function") {
      return normalizeDeclaration(input.snapshot());
    }
    if (typeof input === "string" || Array.isArray(input) || isPlainObject(input)) {
      try {
        const declaration = blockImageDeclaration.createBlockImageDeclaration(input);
        return declaration && typeof declaration.snapshot === "function" ? declaration.snapshot() : declaration;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function blockSummary(declaration) {
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

  function lazyManifest(declaration) {
    return declaration.chunks.map(function (chunk) {
      return {
        index: chunk.index,
        offset: chunk.offset,
        size: chunk.size,
        sparse: chunk.sparse,
        present: chunk.present,
        label: chunk.label,
        chunk_receipt: chunk.chunk_receipt
      };
    });
  }

  function greedyChart(declaration) {
    return declaration.chunks.map(function (chunk) {
      return {
        index: chunk.index,
        offset: chunk.offset,
        end: chunk.offset + chunk.size,
        size: chunk.size,
        sparse: chunk.sparse,
        present: chunk.present,
        occupancy: chunk.sparse ? "hole" : "block",
        path: chunk.path,
        label: chunk.label,
        byte_length: chunk.byte_length,
        content_hash: chunk.content_hash,
        chunk_receipt: chunk.chunk_receipt
      };
    });
  }

  function staticSummary(declaration) {
    return Object.assign({}, blockSummary(declaration), {
      summary_kind: "reconciliation",
      resolution: "static",
      layout_receipt: fnv1a(stableString({
        identity_receipt: declaration.identity_receipt,
        chunk_table_receipt: declaration.chunk_table_receipt,
        chunks: declaration.chunks.map(function (chunk) {
          return {
            offset: chunk.offset,
            size: chunk.size,
            sparse: chunk.sparse,
            present: chunk.present,
            chunk_receipt: chunk.chunk_receipt
          };
        })
      })),
      overlay_count: declaration.chunk_count
    });
  }

  function animatedSweep(declaration) {
    return {
      frame_count: DEFAULT_FRAME_COUNT,
      chunk_sweep: declaration.chunks.map(function (chunk, index) {
        return {
          frame: index,
          chunk_index: chunk.index,
          offset: chunk.offset,
          size: chunk.size,
          sparse: chunk.sparse,
          present: chunk.present,
          chunk_receipt: chunk.chunk_receipt
        };
      }),
      cycle_receipt: fnv1a(stableString({
        identity_receipt: declaration.identity_receipt,
        frame_count: DEFAULT_FRAME_COUNT,
        offsets: declaration.chunks.map(function (chunk) {
          return chunk.offset;
        }),
        chunk_receipts: declaration.chunks.map(function (chunk) {
          return chunk.chunk_receipt;
        })
      }))
    };
  }

  function projectionCoreForMode(declaration, mode) {
    const base = blockSummary(declaration);
    if (mode === "lazy") {
      return Object.assign({}, base, {
        mode: mode,
        lens: "barcode",
        barcode_manifest: lazyManifest(declaration)
      });
    }
    if (mode === "greedy") {
      return Object.assign({}, base, {
        mode: mode,
        lens: "chart",
        chunk_chart: greedyChart(declaration)
      });
    }
    if (mode === "static") {
      return Object.assign({}, base, {
        mode: mode,
        lens: "reconciliation",
        reconciliation_summary: staticSummary(declaration)
      });
    }
    if (mode === "animated") {
      return Object.assign({}, base, {
        mode: mode,
        lens: "sweep",
        chunk_sweep: animatedSweep(declaration)
      });
    }
    return null;
  }

  function projectBlockImageProjection(input, options) {
    const declaration = normalizeDeclaration(input);
    if (!declaration || !declaration.identity_receipt) {
      return null;
    }

    const projectionMode = normalizeProjectionMode(options && options.mode !== undefined ? options.mode : (declaration.active && declaration.active.projection_mode));
    if (!projectionMode) {
      return null;
    }
    const viewMode = normalizeViewMode(
      options && options.view_mode !== undefined ? options.view_mode : (declaration.active && declaration.active.view_mode),
      projectionMode
    );

    const projectionSurfaceCore = projectionCoreForMode(declaration, projectionMode);
    if (!projectionSurfaceCore) {
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
      view_mode: viewMode,
      presentation: viewMode
    });

    const viewReceipt = fnv1a(stableString({
      identity_receipt: declaration.identity_receipt,
      projection_mode: projectionMode,
      view_mode: viewMode,
      surface: viewSurface
    }));

    return Object.assign({}, viewSurface, {
      projection_mode: projectionMode,
      view_mode: viewMode,
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

  function decorateProjection(projection) {
    const data = clone(projection);
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
        value: function project(mode, viewMode) {
          return projectBlockImageProjection(data, {
            mode: mode,
            view_mode: viewMode
          });
        }
      }
    });

    return api;
  }

  return {
    projectBlockImageProjection: function projectBlockImageProjectionApi(input, options) {
      const projection = projectBlockImageProjection(input, options || {});
      if (!projection) {
        throw new Error("invalid-block-image-projection");
      }
      return projection;
    },
    createBlockImageProjection: function createBlockImageProjection(input, options) {
      const projection = projectBlockImageProjection(input, options || {});
      if (!projection) {
        throw new Error("invalid-block-image-projection");
      }
      return decorateProjection(projection);
    }
  };
}));
