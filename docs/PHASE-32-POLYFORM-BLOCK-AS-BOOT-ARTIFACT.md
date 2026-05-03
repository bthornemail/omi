# Phase 32: Polyform Block as Boot Artifact

Phase 32 promotes the Phase 31 polyform block header into the boot witness.
The x86 and RISC-V QEMU paths still emit the Phase 28 and Phase 30 pinned
vectors for audit continuity, then emit one canonical block header derived
from the same tick-11 state.

## Canonical Boot Header

```text
POLYFORM_BLOCK tick=11 K=0x6a fano=0x10 sonar_hi=0x00000000 sonar_lo=0x00000800 digit=0x3c witness=0x77e53ee5
```

This is the concrete Phase 32 artifact. It is produced by:

1. Seeding the Phase 28 kernel state with the foundation seed.
2. Advancing to tick 11.
3. Projecting all seven Phase 30 OSI layers.
4. Building `polyform_block_t` with `polyform_block_from_state()`.
5. Printing the canonical fields and witness through the platform serial path.

No renderer output is authoritative. The block fields are authoritative, and
the witness is the canonical hash over those fields.

## Validator

`tools/qemu_foundation_test.sh` and `tools/riscv_foundation_test.sh` now check:

- the existing pinned `PHASE28_QEMU` and `PHASE30_QEMU` lines
- the exact `POLYFORM_BLOCK` header
- the witness recomputed by `tools/polyform_witness_recompute.c`

The x86 validator also verifies the sealed GAUGE path reaches `VALID STATE`
and `OMI HALT`.

## Verified Commands

```sh
make polyform-test
make qemu-foundation-test
make riscv-qemu-foundation-test
make full-test
```

All pass with the same witness, `0x77e53ee5`, on x86 QEMU and RISC-V QEMU.

## Boundary

Phase 32 does not replace the runtime law and does not mutate the kernel state.
It serializes the already-derived Phase 31 block as a boot artifact. Raw
vectors remain available as lower-level audit evidence.
