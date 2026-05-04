# QEMU TCG/MMU OMI Memory Law

Status: DOCTRINE for Phase 43 and future page/MMIO phases.

QEMU system emulation translates guest virtual addresses to guest physical
addresses on memory access, accelerates translation with a TLB, physically
indexes translated code, distinguishes RAM/ROM from MMIO, and routes MMIO
access to device emulation.

OMI normalizes that as:

| QEMU concept | OMI interpretation |
|--------------|--------------------|
| guest virtual address | projected address |
| guest physical address | execution witness address |
| RAM | mutable runtime state |
| ROM | canonical law/model receipt substrate |
| MMIO | typed device/projection boundary |
| TLB/cache | projection accelerator |
| dirty page | future mutation witness |
| translated block | replayable execution fragment |

## Authority Rules

- OMI model receipts and replay state are authority.
- Virtual addresses and VFS paths are projections.
- Physical addresses are execution witnesses.
- Host addresses are emulator implementation detail.
- Caches accelerate projection but are never authority.
- MMIO is not arbitrary mutation; it is a future typed event/projection
  boundary.

## Future Page Court

Phase 43 does not inspect QEMU internals. Later phases may emit guest-visible
memory region witnesses:

- ROM/law region
- foundation proof region
- model registry region
- user init region
- overlay registry region
- event log region
- render trace region
- MMIO device region

The future rule is that changed memory must have an OMI receipt, and
append-only regions must remain append-only.

## Root Statement

QEMU software MMU supplies a portable address/memory witness. It does not own
OMI truth. OMI truth remains canonical replay plus pinned receipts.
