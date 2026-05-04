# Phase 45: MMIO Device Projection Court

Status: IMPLEMENTED as a static device taxonomy witness.

Phase 45 makes the `DEVICE_MMIO_RESERVED` boundary from Phase 44 concrete as a
typed event/projection court, without implementing real QEMU devices yet.

## Doctrine

```text
MMIO is a typed event/projection boundary.
MMIO does not own OMI timing.
MMIO does not mutate canonical model declarations.
MMIO does not mutate the boot registry.
```

## Device Classes

- `DISPLAY_MMIO`
- `KEYBOARD_MMIO`
- `CAMERA_MMIO`
- `NETWORK_MMIO`
- `STORAGE_MMIO`
- `TIMER_MMIO`

Each device class is emitted as a serial witness with a role, event, and
authority:

- display accepts render traces
- keyboard emits input events
- camera emits carrier-scan events
- network emits and receives model-sync events
- storage appends declaration and receipt logs
- timer observes timing receipts only

## Implementation Surface

- `kernel/include/mmio_device_court.h`
- `kernel/runtime/mmio_device_court.c`
- `kernel/mmio_device_court.omi`
- `tools/validate_qemu_mmio_device_court.sh`
- `make qemu-mmio-device-court-test`

## Rules

- No complex QEMU device emulation yet.
- No MMIO handlers are added.
- No QEMU TLB inspection is used.
- No canonical model declaration is mutated.
- No boot registry mutation is introduced.
- Boot still reaches `VALID STATE` and `OMI HALT`.

## Root Statement

Phase 44 classified memory regions. Phase 45 classifies device I/O at the MMIO
boundary.

MMIO is not arbitrary hardware mutation. It is a typed boundary where devices
emit or accept OMI event declarations.
