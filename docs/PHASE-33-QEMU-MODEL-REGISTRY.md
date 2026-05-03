# Phase 33: QEMU Model Registry and Lazy User-Space Initialization

Status: IMPLEMENTED as a booted registry witness.

Phase 32 proves canonical model declarations on the host. Phase 33 proves that
the booted kernel can expose pinned model declarations as a non-causal registry
for later lazy user-space initialization.

The model registry is the bridge from canonical declarations to lazy user-space
initialization. It is not a renderer, not a process loader, and not an authority
path. It exposes declarations as handles for later projection.

## Initialization Inversion

Conventional OS initialization starts with drivers, filesystems, services,
applications, and UI. OMI user space initializes from models:

```text
boot kernel
-> foundation proof
-> model registry proof
-> user-space init receives model table
-> lazy evaluator projects requested FS/GS/RS/US depth
-> renderer / process / UI / device behavior
```

Applications, files, UI panels, renderers, devices, and agents are projections
over registered OMI-LISP models.

## Registry Law

```text
Models are declarative.
Model registration is causal only as registration.
Model projection is lazy and non-causal.
Model rendering is observer-only.
Hot-plugging appends declarations; it does not mutate prior truth.
```

The freestanding kernel does not parse arbitrary model files in this phase. It
emits a compiled static receipt table derived from the Phase 32 pinned model
declarations.

## Pinned QEMU Witness

```text
MODEL_REGISTRY_QEMU_BEGIN
MODEL_QEMU object=model.trailer.wike-ebike-cargo fs=1 gs=9 rs=29 us=76 authority=declaration-trace
WORLD_QEMU world=world.cargo-yard-demo fs=1 gs=3 rs=7 us=22 objects=3 interactions=3
WORLD_QEMU relation=hitch-link.001 source=bicycle.001.hitch target=trailer.001.tow-arm
WORLD_QEMU relation=load-support.001 source=cargo.001.mass target=trailer.001.panel.floor
WORLD_QEMU relation=rolling.001 source=bicycle.001.forward-motion target=trailer.001.motion
MODEL_QEMU projection=far depth=FS.GS
MODEL_QEMU projection=middle depth=FS.GS.RS
MODEL_QEMU projection=near depth=FS.GS.RS.US
MODEL_QEMU projection=inspect depth=full-trace
MODEL_REGISTRY_QEMU_END
```

Boot must still reach `VALID STATE` and `OMI HALT`.

## Implementation Surface

- Registry doctrine: `kernel/model_registry.omi`
- Registry API: `kernel/include/model_registry.h`
- Static receipt table: `kernel/runtime/model_registry.c`
- Host test: `tests/model_registry_test.c`
- QEMU validator: `tools/validate_qemu_model_registry.sh`
- Make targets: `make model-registry-test`, `make qemu-model-registry-test`

`model_trace` and `qemu-model-test` remain compatibility wrappers. New work
should use registry naming.

## Root Statement

OMI user space initializes from models.

The kernel exposes a verified model registry. User space mounts declarations
lazily. Renderers, files, devices, applications, and agents are projections over
registered OMI-LISP models.

A hot-plugged object is not an executable first. It is a declaration first. It
becomes renderable, queryable, executable, or scannable only through projection
regimes.
