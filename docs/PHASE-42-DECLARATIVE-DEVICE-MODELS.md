# Phase 42: Declarative Device Models

Status: IMPLEMENTED as device declarations plus a host-side device model
runtime.

Phase 42 normalizes devices the same way Phase 41 normalized applications.
Devices are not drivers first. They are declarations of accepted projections,
emitted events, and exposed surfaces.

## Required Devices

`device.display`
: Accepts Phase 39 render traces and exposes `polyform-svg-output` as a
  projection target.

`device.keyboard`
: Emits input-style event declarations such as `event.pointer-select`.

`device.camera`
: Emits `event.carrier-scan` and represents a scannable carrier source.

`device.network`
: Declares OSI model packet surfaces for future model synchronization.

`device.storage`
: Declares append-only declaration and receipt log surfaces.

## Implementation Surface

- Declarations: `devices/*.omilisp`
- Public API: `userspace/include/omi_device_model.h`
- Runtime: `userspace/runtime/omi_device_model.c`
- Host test: `tests/device_model_test.c`
- Make target: `make device-model-test`

## Verified Properties

- all five declarations parse deterministically
- display accepts Phase 39 render traces
- keyboard emits input event declarations
- camera emits carrier-scan event declarations
- network declares OSI packet surfaces
- storage declares append-only receipt log surfaces
- device event emission is represented as declarations
- device observation does not set `handle.expanded`
- device observation does not increment `expansion_count`

## Root Statement

Phase 41 made applications declarations. Phase 42 makes devices declarations.

A device is not a driver first. It is a model that declares what events it
emits, what projections it accepts, and what surfaces it exposes.

Drivers become projection handlers later.
