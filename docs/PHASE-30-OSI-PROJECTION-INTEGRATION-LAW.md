# Phase 30 - OSI Projection Integration Law

Foundation proof:
[Foundation Audit: Pre-OS OSI Chain](FOUNDATION-AUDIT-PRE-OS-OSI.md).

Phase 30 integrates the verified Phase 28 bitwise kernel with the pre-OS
measurement stack by making the OSI model a projection stack over deterministic
replay.

```text
Phase 28 bitwise kernel
  -> Phase 29 pre-OS measurement machine
  -> OSI projection stack
```

This is not a merge of authority paths. OSI projections read Phase 28 state and
produce observer metadata. They do not tick the kernel, mutate source state, or
feed GAUGE.

## Core Law

```text
state_t = phase28_tick(seed, t)
OSI_layer_n(state_t) = projection_n(state_t)
projection_n must not mutate state_t
```

Equivalently:

```text
for every layer L:
  OSI_L = pi_L(Phase28Replay)
```

## Layer Mapping

| OSI layer | OMI projection role | Implementation source |
|-----------|---------------------|-----------------------|
| 1 Physical | bit motion / delta state | `delta8`, `kernel_tick` |
| 2 Data Link | FS/GS/RS/US structural plane | layer salt over structural controls |
| 3 Network | address projection | deterministic observer address |
| 4 Transport | replay window agreement | tick/window-derived projection |
| 5 Session | ESC-gated regime selection | ESC regime salt |
| 6 Presentation | visible digit/simplex/geometry output | `0x30..0x3F`, simplex class |
| 7 Application | optional user-space tag | application-layer observer salt |

## Public API

```c
omi_osi_source_t omi_osi_source_from_kernel(const kernel_state_t *state,
                                            uint64_t tick);

omi_osi_projection_t omi_project_osi_layer(const kernel_state_t *state,
                                          uint64_t tick,
                                          omi_osi_layer_t layer);
```

The projection record contains:

```text
layer
visible_digit   in 0x30..0x3F
address         deterministic observer address
simplex_class   0..8 derived class
```

## Non-Causality

`omi_project_osi_layer` MUST NOT:

```text
call kernel_tick
call gauge_lookup
call gauge_apply
mutate kernel_state_t
```

Phase 30 keeps the sealed GAUGE path intact:

```text
ESC -> Gamma -> GAUGE_APPLY
```

## Vision / Simplex Bridge

Triangle and simplex geometry are presentation projections, not kernel
primitives. Because triangle meshes and incidence structures are common in
graphics, vision, reconstruction, and geometry processing, deterministic
pre-OS simplex projection gives OMI a bridge into visual computation without
making graphics or vision foundational.

## Verification

`make osi-test` verifies:

- same seed/tick produces identical OSI projection stacks
- every layer projection is deterministic
- projection leaves `kernel_state_t` unchanged
- presentation emits `0x30..0x3F`
- simplex class is derived observer metadata

Existing checks must continue to pass:

```bash
make bitwise-test
make pre-os-test
make test
make replay
```
