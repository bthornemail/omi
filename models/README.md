# OMI Canonical Model Base

The `models/` directory is the first canonical object library.

Each model is an OMI-LISP a-list trace over the structural planes:

```text
FS = whole artifact / world object
GS = major part group
RS = part record
US = unit property
```

Models are declarations, not renderer output. A model trace binds form,
function, render depth, and carrier receipts. Meshes, SVG, barcodes, AI output,
and polyform blocks are projections over the declaration.

```text
model declaration = authority
render output      = projection
QEMU trace         = executable witness
```

Phase 32 starts with:

- `trailer/wike-ebike-cargo-trailer.alist`
- `world/cargo-yard-demo.alist`

The trailer model is a WIKE-style ebike cargo trailer. The world demo links a
generic bicycle, trailer, and cargo box through relation records so projection
tests can verify stable object and interaction traces without mutating GAUGE or
kernel state.

Phase 33 hardens this host witness into a boot-visible model registry with
pinned `MODEL_REGISTRY_QEMU`, `MODEL_QEMU`, and `WORLD_QEMU` serial lines. The
registry witness is still observer-only: it emits a compiled static table
derived from the pinned declarations and does not make the renderer, GAUGE path,
or QEMU boot path authoritative over the model.
