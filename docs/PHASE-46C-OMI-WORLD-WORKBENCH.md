# Phase 46C - OMI World Workbench MVP

Phase 46C adds the first human-facing organizer for OMI world models.

The workbench is not a second authority. It is a projection editor over
canonical OMI-LISP declarations.

## Root Law

- OMI-LISP is canonical
- source buffer is authority
- tree, graph, ASCII, and preview surfaces are projections
- visual edits may propose source edits
- roundtrip must preserve FS/GS/RS/US counts

## Included Surfaces

1. source buffer
2. FS/GS/RS/US tree
3. ASCII plane inspector
4. relation graph
5. polyform preview

## ASCII Plane Inspector

The workbench treats ASCII as a structural code surface rather than just text.

- `0x00–0x1F` control / structural plane
- `0x20–0x2F` operator / projection plane
- `0x30–0x3F` metric / digit plane
- `0x40–0x7F` symbolic / user-space plane

The inspector also projects the structural FS/GS/RS/US control bytes:

- `FS -> 0x1C`
- `GS -> 0x1D`
- `RS -> 0x1E`
- `US -> 0x1F`

## Included Examples

- `model.trailer.wike-ebike-cargo`
- `world.cargo-yard-demo`

## Verification

`make workbench-test` proves:

- the workbench parser loads the trailer model and cargo-yard world
- tree view preserves the pinned structural counts
- relation graph shows trailer, bicycle, cargo, and the three interaction edges
- polyform preview exposes the trailer far/middle/near traces
- ASCII plane inspector separates control, operator, metric, and symbol planes
- source buffer preserves canonical declaration text
- roundtrip parse/serialize preserves pinned FS/GS/RS/US counts

The MVP deliberately stops before AI generation or a full 3D engine. It gives
OMI a source-first visual organizer without breaking the authority chain.
