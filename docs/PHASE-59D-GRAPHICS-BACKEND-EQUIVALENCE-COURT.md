# Phase 59D - Graphics Backend Equivalence Court

Phase 58, 59B, and 59C add sibling backend adapters over the same Phase 57 GPU
command stream. Phase 59D proves that those sibling backends preserve the same
OMI intent even when the backend-specific record names differ.

## Root doctrine

```text
WebGL, OpenGL ES, and OpenGL are different draw dialects over the same OMI
projection command stream.
```

## Comparison law

The court compares normalized summaries, not byte-identical backend plans.

It checks:

- OMI path
- coordinate receipt
- closure receipt
- scope
- carrier
- witness
- buffer count
- material count
- draw count
- attachment count

## Rules

- Backend equivalence is a projection comparison, not authority.
- Same GPU command stream must produce equivalent WebGL/GLES/OpenGL summaries.
- Materials, textures, and colors remain overlays.
- Unknown or malformed plans reject deterministically.
- No real GPU, WebGL, GLES, or OpenGL context is required.

## Acceptance

- `make workbench-graphics-equivalence-test` passes.
- Polyform 2D, 2.5D, 3D, scope graph, and barcode template scenes compare
  equivalent across WebGL, GLES, and OpenGL.
- Repeated equivalence checks are identical.
