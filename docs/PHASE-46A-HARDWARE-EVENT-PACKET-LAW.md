# Phase 46A - Hardware Event Packet Law

Phase 46A defines the compact packet carried across the typed device boundary
introduced by the MMIO device court.

The packet is not state. The packet is not time. The packet is not authority.

The packet is a compact, append-only event receipt that can be emitted by a
keyboard, camera, network surface, storage surface, timer observer, or future
low-power device witness such as an ESP32-class node.

## Root Law

- event packets are append-only declarations
- event packets do not mutate canonical models directly
- event packets may carry timing receipts only
- hardware sources are witnesses, not authorities
- same packet bytes produce the same receipt hash

## Packet Fields

- `packet_kind`
- `device_id`
- `model_id`
- `source`
- `target`
- `relation`
- timing receipt: `5040 / 240 / 60 / 8 / 7`
- `payload bytes`
- `receipt_hash`

## Packet Kinds

- `IO_CHANGE`
- `POINTER_SELECT`
- `CARRIER_SCAN`
- `MODEL_SYNC`
- `RECEIPT_APPEND`
- `TIMING_OBSERVE`

`TIMING_OBSERVE` is observer-only. It may witness timing receipts, but it may
not define OMI time.

## Timing Law

A valid packet timing receipt must match the pinned OMI timing constants:

- master blackboard: `5040`
- public frame: `240`
- private sweep: `60`
- kernel cadence: `8`
- Fano selector: `7`

Packets with any other timing receipt are rejected.

## Projection Law

Phase 46A keeps the packet layer separate from model mutation. A packet may be
projected into a Phase 40A event declaration, but it may not bypass the model
loader, mutate the registry, or redefine timing.

The event packet therefore sits between the device court and the event model:

device witness
-> event packet
-> validated event declaration
-> append-only event log
-> later projection or synchronization path

## Verification

`make event-packet-test` proves:

- valid `IO_CHANGE`, `CARRIER_SCAN`, and `MODEL_SYNC` packets encode and decode
  deterministically
- invalid timing receipts are rejected
- invalid packet kinds are rejected
- repeated encode/decode yields the same receipt
- packets project into Phase 40A event declarations

Phase 46A does not add wall-clock authority, direct device mutation, or eager
model expansion.
