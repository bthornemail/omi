# Phase 46B - ESP32 Event Witness Profile

Phase 46B profiles an ESP32-class node as a low-power OMI event witness over
the Phase 46A hardware event packet law.

The ESP32 does not run the world. It does not define time. It does not mutate
canonical model declarations directly.

It observes changes and emits compact, timed event receipts that can be
validated, hashed deterministically, and projected into declarative event
models.

## Root Law

- ESP32 is an event witness, not model authority
- ESP32 may emit compact event packets
- ESP32 may carry timing receipts
- ESP32 may not define OMI time
- ESP32 may not mutate the model registry or model declarations directly

## Covered Scenarios

- GPIO `IO_CHANGE`
- CAMERA `CARRIER_SCAN`
- NETWORK `MODEL_SYNC`
- TIMER `TIMING_OBSERVE`
- STORAGE `RECEIPT_APPEND`

Each scenario uses the Phase 46A encode/decode path. The simulator does not
invent a parallel packet format.

## Timing Law

Every valid ESP32 witness packet carries the pinned receipt:

- `5040` master blackboard
- `240` public frame
- `60` private sweep
- `8` kernel cadence
- `7` Fano selector

The packet may witness that timing receipt. It may not redefine it.

## Verification

`make esp32-witness-test` proves:

- the ESP32 witness declaration parses deterministically
- all five packet scenarios encode and decode deterministically
- repeated simulated input yields identical bytes and receipt hash
- packets project into Phase 40A event declarations
- invalid timing receipts are rejected

Phase 46B therefore turns the hardware packet law into a concrete embedded
profile without making the embedded device authoritative.
