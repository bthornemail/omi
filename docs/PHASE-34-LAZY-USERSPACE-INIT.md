# Phase 34: Lazy User-Space Init Mount

Status: IMPLEMENTED as a host-side user-space mount witness.

Phase 34 creates the first OMI user-space initialization layer. It mounts the
Phase 33 kernel model registry as lazy model handles without expanding,
rendering, hot-plugging, or executing the models.

## Law

```text
kernel model registry
-> user-space lazy mount table
-> projection handles
```

User-space init is not a renderer, not a process loader, and not a filesystem
authority. It records handles over canonical registry receipts. Model expansion
is deferred to Phase 35.

## Init Declaration

The declarative init surface is:

```text
userspace/init.omilisp
```

It mounts `kernel.model-registry` in lazy mode, pins the default projection
depth policy, and declares future filesystem, renderer, barcode, application,
and device projection surfaces.

## Implementation Surface

- Declaration: `userspace/init.omilisp`
- Public API: `userspace/include/omi_user_init.h`
- Runtime: `userspace/runtime/omi_user_init.c`
- Host test: `tests/user_init_test.c`
- Make target: `make user-init-test`

## Verified Properties

- trailer model handle exists
- cargo-yard world handle exists
- each handle records id, URI, receipt counts, authority, and lazy depth policy
- no FS/GS/RS/US expansion occurs during init
- repeated init produces an identical mount table
- null inputs do not create handles

## Root Statement

OMI OS begins with canonical models. The kernel proves replay and exposes model
receipts. User space mounts those receipts as lazy declarations. Applications,
files, devices, renderers, agents, and windows are later projections over those
registered OMI-LISP models.
