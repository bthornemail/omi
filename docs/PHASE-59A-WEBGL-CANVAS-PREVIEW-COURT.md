# Phase 59A - WebGL Canvas Preview Court

Phase 58 lowered GPU command streams into deterministic WebGL plans. Phase
59A turns those plans into browser-facing preview surfaces without requiring a
real WebGL context.

## Root doctrine

```text
The canvas shows the world.
The canvas does not own the world.
```

## Inputs

The preview accepts Phase 58 WebGL runtime plans, which themselves are derived
from:

- Phase 57 GPU command streams
- Phase 54 coordinate blocks and closure receipts
- Phase 54C scope multi-graph edges
- Phase 56 composer scenes

## Outputs

The preview emits deterministic fallback preview records:

- `backend = webgl-canvas-preview`
- `records[]`
- `lookup[path]`
- `preview_receipt`

These records preserve:

- OMI path
- coordinate receipt
- closure receipt
- scope
- carrier
- witness

## Rules

- Preview is projection, not authority.
- No real WebGL context is required in tests.
- Pointer selection emits event/intent proposals, not direct mutation.
- The preview does not mutate source, edit logs, sync packets, coordinates,
  closures, scope graphs, composer scenes, GPU command streams, or WebGL
  plans.
- Unknown or invalid plans reject deterministically.

## Acceptance

- `make workbench-webgl-preview-test` passes.
- Polyform 2D, 2.5D, 3D, scope graph, and barcode plans are accepted.
- Fallback draw records are deterministic.
- OMI path lookup works.
- Pointer selection emits `event.pointer-select`.
- Repeated preview preparation is identical.
