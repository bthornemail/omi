# Phase 59C - OpenGL Desktop Adapter Court

Phase 57 emits deterministic GPU command streams. Phase 58 and Phase 59B add
WebGL and OpenGL ES plan adapters. Phase 59C adds the desktop OpenGL sibling
adapter without requiring a real OpenGL context.

## Root doctrine

```text
WebGL, OpenGL ES, and OpenGL are sibling projection backends.
The OMI coordinate/closure/scope receipts remain the shared truth.
```

## Inputs

The adapter consumes Phase 57 GPU command streams and preserves:

- OMI path
- coordinate receipt
- closure receipt
- scope
- carrier
- witness

## Outputs

The adapter emits deterministic OpenGL-style plans:

- `BEGIN_OPENGL_PLAN`
- `OPENGL_BUFFER_PLAN`
- `OPENGL_MATERIAL_PLAN`
- `OPENGL_DRAW_PLAN`
- `OPENGL_ATTACHMENT_PLAN`
- `END_OPENGL_PLAN`

These plans are projection-only and do not require a real OpenGL runtime.

## Rules

- OpenGL plan is projection, not authority.
- No real OpenGL context is required in tests.
- Same GPU command stream always yields the same OpenGL plan.
- Materials, textures, and colors remain overlays.
- Unknown command kinds reject deterministically.
- The adapter does not mutate source, edit logs, sync packets, coordinates,
  closures, scope graphs, composer scenes, or command streams.

## Acceptance

- `make workbench-opengl-runtime-test` passes.
- Polyform 2D, 2.5D, 3D, scope graph, and barcode template streams all adapt
  deterministically.
- OMI metadata is preserved.
- Repeated adaptation is identical.
