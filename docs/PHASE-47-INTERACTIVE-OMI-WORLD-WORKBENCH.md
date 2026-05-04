# Phase 47 - Interactive OMI World Workbench

Phase 47 extends the Phase 46C MVP into an interactive projection editor over
canonical OMI-LISP traces.

The workbench is not authority. Canvas, SVG, A-Frame, glTF, OBJ, and MTL are
not authority. They are synchronized projection backends over the same
FS/GS/RS/US source.

## Root Law

- OMI-LISP is canonical
- visual projections are not authority
- `data-omi-*` attributes are live pointers back to canonical records
- pointer events create event and intent declarations, not direct mutation
- exports preserve OMI paths and projection metadata

## Added Backends

- Canvas 2D interaction projection
- SVG semantic projection with `data-omi-*`
- A-Frame entity projection with `data-omi-*`
- glTF export with OMI `extras`
- OBJ/MTL export with sidecar OMI receipt mapping

## Polyform Basis

Phase 47 also introduces a deterministic basis registry across:

- 2D polyforms
- 2.5D extruded or layered polyforms
- 3D polyforms

These shapes remain projection backends, not canonical geometry authority.

## Verification

`make workbench-test` proves:

- trailer and cargo-yard models load
- FS/GS/RS/US tree remains deterministic
- relation graph remains deterministic
- Canvas/SVG/A-Frame projections are deterministic
- SVG `data-omi-*` attributes resolve back to canonical paths
- pointer select emits `event.pointer-select`
- move interaction emits a proposed edit rather than direct mutation
- glTF preserves OMI metadata in `extras`
- OBJ/MTL sidecar maps geometry names back to OMI paths
- 2D, 2.5D, and 3D polyform families stay pinned

The workbench therefore becomes interactive without breaking the authority
chain: source edits remain canonical, projections remain synchronized, and
visual interaction is routed back through declarations rather than direct state
mutation.
