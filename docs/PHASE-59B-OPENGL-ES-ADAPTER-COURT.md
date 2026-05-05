# Phase 59B - OpenGL ES Adapter Court

Phase 57 emits deterministic GPU command streams. Phase 58 lowers them into
WebGL runtime plans. Phase 59B adds an OpenGL ES-style plan adapter for
embedded/mobile portability without requiring a real GLES context.

## Root doctrine

```text
The draw backend changes.
The OMI geometry and receipts do not.
```

## Inputs

The adapter consumes Phase 57 GPU command streams, which already preserve:

- OMI path
- coordinate receipt
- closure receipt
- scope
- carrier
- witness

## Outputs

The adapter emits deterministic GLES-style plans:

- `BEGIN_GLES_PLAN`
- `GLES_BUFFER_PLAN`
- `GLES_MATERIAL_PLAN`
- `GLES_DRAW_PLAN`
- `GLES_ATTACHMENT_PLAN`
- `END_GLES_PLAN`

These plans remain projection-only and do not require a real OpenGL ES
runtime.

## Rules

- GLES plan is projection, not authority.
- No real GLES context is required in tests.
- Same GPU command stream always yields the same GLES plan.
- Materials, textures, and colors remain overlays.
- Unknown command kinds reject deterministically.
- The adapter does not mutate source, edit logs, sync packets, coordinates,
  closures, scope graphs, composer scenes, or command streams.

## Acceptance

- `make workbench-gles-runtime-test` passes.
- Polyform 2D, 2.5D, 3D, scope graph, and barcode template streams all adapt
  deterministically.
- OMI metadata is preserved.
- Repeated adaptation is identical.
