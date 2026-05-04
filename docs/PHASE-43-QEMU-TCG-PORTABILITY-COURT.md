# Phase 43: QEMU TCG Portability Court

Status: IMPLEMENTED as explicit TCG proof targets.

Phase 43 makes QEMU TCG the canonical portable execution witness for OMI OS.
Hardware acceleration remains useful for local speed, but it is not proof
authority.

## Doctrine

```text
OMI logical timing = authority
QEMU TCG = portable execution court
QEMU software MMU = portable memory/address witness
MMIO = future typed device/projection boundary
serial vectors = proof surface
```

OMI owns logical time:

- `5040` master blackboard resolution
- `360` global state resolution
- `240` public canvas frame
- `60` private/local sweep
- `16` operator bank
- `8` source-target byte cadence
- `7` Fano incidence selector

QEMU wall-clock timing is not evidence. The proof is identical replay, pinned
serial vectors, and a valid final state.

## Runner Policy

The repository runner now defaults to:

```text
-accel tcg
```

`tools/qemu_tcg_run.sh` forces `OMI_QEMU_ACCEL=tcg` explicitly.

Hardware acceleration can be requested manually through `OMI_QEMU_ACCEL`, but
portable proof targets require TCG.

## Implementation Surface

- `tools/qemu_tcg_run.sh`
- `tools/validate_qemu_tcg_foundation.sh`
- `tools/validate_qemu_tcg_model_registry.sh`
- `tools/validate_qemu_tcg_court.sh`
- `make qemu-tcg-foundation-test`
- `make qemu-tcg-model-registry-test`
- `make qemu-tcg-court`
- `make qemu-portable-test`

## Court Requirements

The combined court requires:

- `FOUNDATION_QEMU_BEGIN`
- pinned Phase 28 bitwise vectors
- pinned Phase 30 OSI vectors
- pinned polyform block witness
- `FOUNDATION_QEMU_END`
- `MODEL_REGISTRY_QEMU_BEGIN`
- pinned trailer/world registry vectors
- pinned relation and projection lines
- `MODEL_REGISTRY_QEMU_END`
- `VALID STATE`
- `OMI HALT`

The validator rejects missing lines, changed vectors, and wrong ordering.

## Non-Goals

Phase 43 does not add custom QEMU devices, MMIO handlers, multi-architecture
coverage, translated-block inspection, TLB inspection, or wall-clock timing
checks.

## Root Statement

OMI OS uses QEMU TCG as its canonical portability court.

OMI owns logical timing. QEMU TCG supplies portable execution. Serial vectors
provide the proof surface. Hardware acceleration is optional and
non-authoritative.
