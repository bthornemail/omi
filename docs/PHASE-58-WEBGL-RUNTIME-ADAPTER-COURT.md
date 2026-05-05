# Phase 58 - WebGL Runtime Adapter Court

Phase 57 produced deterministic GPU command streams. Phase 58 translates those
command streams into deterministic WebGL-style buffer, material, and draw-call
plans without requiring a browser WebGL context.

## Root doctrine

```text
The GPU command stream is projection.
The WebGL runtime adapter is projection.
Neither is authority.
```

## Inputs

The adapter consumes:

- Phase 57 command streams
- Phase 54 coordinate blocks
- Phase 54 closure receipts
- Phase 54C scope multi-graph edges
- Phase 56 composer scenes

## Outputs

The adapter emits a deterministic plan with:

- `BEGIN_PLAN`
- `BUFFER_PLAN`
- `MATERIAL_PLAN`
- `DRAW_PLAN`
- `ATTACHMENT_PLAN`
- `END_PLAN`

The plan preserves:

- OMI path
- coordinate receipt
- closure receipt
- scope
- carrier
- witness

## Supported modes

- `polyform-2d`
- `polyform-2_5d`
- `polyform-3d`
- `scope-graph-3d`
- `barcode-template-scene`

## Rules

- No real WebGL context is required.
- Unknown command kinds reject deterministically.
- Unknown projection modes reject deterministically.
- Materials, textures, and colors remain overlays.
- The adapter does not mutate source, edit logs, sync packets, coordinates,
  closures, scope graphs, or composer scenes.

## Acceptance

- `make workbench-webgl-runtime-test` passes.
- The same command stream always produces the same plan.
- The plan retains OMI metadata.
- 2D, 2.5D, 3D, scope graph, and barcode template streams all adapt
  deterministically.
