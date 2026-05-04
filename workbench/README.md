# OMI World Workbench

Phase 46C adds the first human-facing organizer for OMI world models.

This MVP is intentionally small:

- canonical OMI-LISP source buffer
- FS/GS/RS/US outline
- ASCII plane inspector
- relation graph
- polyform preview

OMI-LISP remains the authority. Every other surface is a projection over the
same declaration text.

## Open

Open [index.html](./index.html) directly in a browser.

No dev server is required for the MVP.

## Included examples

- `model.trailer.wike-ebike-cargo`
- `world.cargo-yard-demo`

## Design rule

Visual edits may propose source edits, but source remains canonical. The
workbench therefore updates projections from source text on every edit rather
than treating the canvas as the source of truth.
