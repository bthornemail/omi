# Phase 44: OMI Page Court and Memory Region Law

Status: IMPLEMENTED as a typed memory region witness.

Phase 44 makes OMI memory auditable at the region level without implementing a
full MMU or custom MMIO handlers.

## Region Law

```text
RAM, ROM, overlays, event logs, render traces, and future MMIO ranges become
typed regions with explicit authority and mutability laws.
```

Region classes:

- `ROM_LAW`
- `FOUNDATION_PROOF`
- `MODEL_REGISTRY`
- `USERSPACE_INIT`
- `OVERLAY_REGISTRY`
- `EVENT_LOG`
- `RENDER_TRACE`
- `DEVICE_MMIO_RESERVED`

## Witness Shape

The boot log emits:

```text
PAGE_COURT_QEMU_BEGIN
PAGE_REGION name=ROM_LAW authority=canonical mutability=readonly
PAGE_REGION name=FOUNDATION_PROOF authority=witness mutability=readonly
PAGE_REGION name=MODEL_REGISTRY authority=receipt mutability=readonly
PAGE_REGION name=USERSPACE_INIT authority=projection mutability=readonly
PAGE_REGION name=OVERLAY_REGISTRY authority=declaration-overlay mutability=append-only
PAGE_REGION name=EVENT_LOG authority=event-trace mutability=append-only
PAGE_REGION name=RENDER_TRACE authority=projection mutability=ephemeral
PAGE_REGION name=DEVICE_MMIO_RESERVED authority=device-boundary mutability=typed-mmio
PAGE_COURT_QEMU_END
```

## Implementation Surface

- `kernel/include/page_court.h`
- `kernel/runtime/page_court.c`
- `kernel/page_court.omi`
- `tools/validate_qemu_page_court.sh`
- `make qemu-page-court-test`

## Rules

- Page Court emits region declarations only.
- It does not implement paging yet.
- It does not inspect QEMU internal TLB state.
- It does not add custom MMIO handlers.
- It does not mutate regions.
- It does not change Phase 43 vectors.
- Boot still reaches `VALID STATE` and `OMI HALT`.

## Root Statement

Phase 43 made QEMU TCG the portability court. Phase 44 makes memory regions
auditable.

The OMI kernel now emits a typed region witness for ROM/law, foundation,
registry, user-space init, overlay, event log, render trace, and reserved MMIO
space. This is the page court before real paging or device projection work.
