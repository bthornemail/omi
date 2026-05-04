# Phase 37: Hot-Pluggable Model Loader

Status: IMPLEMENTED as a host-side overlay registry witness.

Phase 37 adds hot-pluggable declarations to OMI user space. A hot-plugged model
is not an executable and not a render. It is a validated declaration appended to
a user-space overlay registry.

## Loader Law

```text
declaration text
-> validate FS/GS/RS/US structure
-> compute deterministic receipt
-> append overlay handle
-> expose through VFS and lazy projection
```

The loader does not decode barcodes, render SVG/polyforms, mutate the Phase 33
boot registry, mutate existing mounted handles, call GAUGE, call kernel ticks,
or emit QEMU-only witnesses.

## Validation

Minimum declaration validation requires:

- exactly one FS root
- at least one GS group
- at least one RS record
- at least one US unit
- an FS root ID beginning with `model.` or `world.`
- deterministic FS/GS/RS/US counts
- deterministic FNV-1a receipt over declaration bytes

Duplicate IDs are rejected deterministically. They are not replaced in Phase 37.

## Implementation Surface

- Public API: `userspace/include/omi_model_loader.h`
- Runtime: `userspace/runtime/omi_model_loader.c`
- Host test: `tests/hotplug_model_loader_test.c`
- Make target: `make hotplug-model-test`

## Verified Properties

- a new `model.box.generic-cargo` declaration loads into the overlay
- expected counts are `fs=1 gs=2 rs=2 us=4`
- invalid declarations reject
- duplicate model IDs reject
- overlay handle receives a stable `omi://model/...` URI
- overlay model resolves through VFS only when overlay is supplied
- overlay model projects far, middle, near, and inspect through lazy eval
- boot registry entries remain unchanged
- loading and projection leave `handle.expanded` and `table.expansion_count` at
  zero

## Root Statement

Before Phase 37, OMI OS can view boot-pinned models. After Phase 37, OMI OS can
accept new model declarations at runtime. The system remains declarative, lazy,
and non-causal with respect to the kernel foundation.
