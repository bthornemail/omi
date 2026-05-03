# Phase 36: Model VFS Projection

Status: IMPLEMENTED as a host-side filesystem-like projection witness.

Phase 36 exposes Phase 34 mounted handles and Phase 35 lazy projection views
through deterministic paths. The VFS is a projection over model handles; paths
are navigable views, not authority.

## Path Law

```text
path != authority
path = deterministic view over mounted model handles
```

The VFS does not render SVG or polyforms, hot-plug models, decode carriers,
mutate mounted handles, call GAUGE, call kernel ticks, or emit registry
witnesses.

## Required Paths

```text
/omi/models
/omi/models/model.trailer.wike-ebike-cargo
/omi/worlds
/omi/worlds/world.cargo-yard-demo
/omi/projections/far/model.trailer.wike-ebike-cargo
/omi/projections/middle/model.trailer.wike-ebike-cargo
/omi/projections/near/model.trailer.wike-ebike-cargo
/omi/projections/inspect/model.trailer.wike-ebike-cargo
/omi/projections/far/world.cargo-yard-demo
/omi/projections/middle/world.cargo-yard-demo
/omi/projections/near/world.cargo-yard-demo
/omi/projections/inspect/world.cargo-yard-demo
```

## Implementation Surface

- Public API: `userspace/include/omi_model_vfs.h`
- Runtime: `userspace/runtime/omi_model_vfs.c`
- Host test: `tests/model_vfs_test.c`
- Make target: `make model-vfs-test`

## Verified Properties

- required paths resolve deterministically
- model/world paths return lazy handle metadata
- projection paths return corresponding lazy projection depth
- unknown paths are rejected deterministically
- repeated path resolution returns identical results
- resolving paths leaves `handle.expanded` and `table.expansion_count` at zero

## Root Statement

OMI OS now has lazy declarative evaluation. The kernel exposes canonical model
receipts. User space mounts them as lazy handles. The evaluator projects
FS/GS/RS/US depth on demand. The VFS exposes those projections through paths
while preserving the rule that paths are views, not truth.
