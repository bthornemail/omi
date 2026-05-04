# Phase 39: Polyform/SVG Renderer Projection

Status: IMPLEMENTED as a deterministic user-space render projection witness.

Phase 39 adds the first visible projection layer over lazy model handles. It
renders from Phase 35 projection views and Phase 36 VFS paths into a
deterministic polyform trace, then emits an optional SVG witness string.

The trace is emitted before SVG because SVG is not authority.

## Renderer Law

```text
The renderer is not the world.
The renderer is not the model.
The renderer is a projection from a lazy model view into a visible primitive trace.
```

Renderer inputs:

- a mounted model/world handle
- a lazy projection view
- a model VFS path
- a carrier-validated Aztec object receipt selecting an existing handle

Renderer outputs:

- deterministic `POLYFORM_RENDER ...` trace
- non-authoritative SVG witness string
- deterministic render receipt hash

## Supported Primitives

Phase 39 pins the first renderer primitive vocabulary:

- `rectangular-container`
- `rectangle`
- `line`
- `circle`
- `triangle`
- `point-joint`
- `bent-line`

## Projection Depths

| Depth | Meaning | Trailer trace |
|-------|---------|---------------|
| `far` | `FS.GS` | `box.two-wheels.tow-arm` |
| `middle` | `FS.GS.RS` | `panels.frame.wheels.tow-arm` |
| `near` | `FS.GS.RS.US` | `rails.latches.reflectors.hinges.spokes` |
| `inspect` | `full-trace` | full primitive set with form/function labels |

World rendering remains a placeholder projection over known relation records:
`trailer`, `bicycle`, `cargo`, `hitch-link.001`, `load-support.001`, and
`rolling.001`.

## Implementation Surface

- Public API: `userspace/include/omi_polyform_renderer.h`
- Runtime: `userspace/runtime/omi_polyform_renderer.c`
- Host test: `tests/polyform_renderer_test.c`
- Make target: `make polyform-render-test`

## Verified Properties

- trailer far render emits `box.two-wheels.tow-arm`
- trailer middle render emits `panels.frame.wheels.tow-arm`
- trailer near render emits `rails.latches.reflectors.hinges.spokes`
- inspect render includes form/function labels and the full primitive set
- world render includes trailer, bicycle, cargo, and relation placeholders
- VFS projection paths render through the lazy evaluator
- carrier-validated Aztec object receipts select existing handles
- repeated render of the same model/depth gives identical trace, SVG, and hash
- rendering does not set `handle.expanded` or increment `expansion_count`

## Root Statement

Phase 39 makes OMI models visible without changing authority. The model
declaration remains truth. The renderer produces deterministic observer traces
and optional SVG witnesses over lazy FS/GS/RS/US projections.
