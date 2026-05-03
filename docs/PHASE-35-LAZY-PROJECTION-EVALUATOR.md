# Phase 35: Lazy Projection Evaluator

Status: IMPLEMENTED as a host-side demand-driven projection witness.

Phase 35 adds the first projection layer over Phase 34 mounted handles. It
evaluates only the requested FS/GS/RS/US depth and does not render, hot-plug,
decode carriers, mutate mounted handles, or mutate registry receipts.

## Depth Law

```text
far     = FS.GS
middle  = FS.GS.RS
near    = FS.GS.RS.US
inspect = full-trace
```

The evaluator reports depth availability. It does not expand model structure
into renderable geometry. Rendering remains a future projection layer.

## Implementation Surface

- Public API: `userspace/include/omi_lazy_eval.h`
- Runtime: `userspace/runtime/omi_lazy_eval.c`
- Host test: `tests/lazy_eval_test.c`
- Make target: `make lazy-eval-test`

## Verified Properties

- trailer handle projects far, middle, near, and inspect
- world handle projects far, middle, near, and inspect
- far reports FS/GS availability only
- middle reports FS/GS/RS availability
- near reports FS/GS/RS/US availability
- inspect reports full-trace availability
- repeated same handle/depth projection is identical
- projection leaves `handle.expanded` and `table.expansion_count` at zero

## Root Statement

OMI OS initializes from models. The kernel exposes model receipts. User space
mounts those receipts as lazy handles. Phase 35 projects those handles on
demand, while processes, files, renderers, devices, and applications remain
future projections over the same model handles.
