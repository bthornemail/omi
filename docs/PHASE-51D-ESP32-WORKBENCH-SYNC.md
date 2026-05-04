# Phase 51D - ESP32 Workbench Sync Adapter

Phase 51D makes workbench collaboration hardware-witnessable through the
existing ESP32 event witness profile.

This phase is simulator-only. It does not require real ESP32 hardware, radio,
serial transport, or networking.

## Doctrine

An ESP32 does not own the edit.

It carries a compact event packet containing a validated OMI sync packet.

The ESP32 layer is therefore a carrier around the Phase 50 packet court, not a
new sync authority path.

## Transport Mapping

- `EDIT_LOG_SEGMENT` -> `MODEL_SYNC`
- `MERGE_LOG_SEGMENT` -> `MODEL_SYNC`
- `CONFLICT_RECORD` -> `RECEIPT_APPEND`
- `BASE_RECEIPT` -> `TIMING_OBSERVE`
- `REQUEST_MISSING_SEGMENT` -> `MODEL_SYNC`

The envelope uses the Phase 46 timing receipt:

- `5040`
- `240`
- `60`
- `8`
- `7`

## Envelope Law

The adapter emits a deterministic ESP32 witness envelope with:

- `profile_id = device.esp32-event-witness`
- event-packet kind
- device/source/target/relation fields
- pinned timing receipt
- embedded Phase 50 packet text
- payload receipt hash

Decoding validates timing first, then validates the embedded Phase 50 packet.

## Import Law

Decoded sync still applies through the Phase 50 packet court.

That preserves:

- duplicate suppression
- missing-sequence request emission
- append-only imported history
- replay-based reconstruction

## Acceptance Surface

`make workbench-esp32-sync-test` proves:

- deterministic ESP32 envelope encoding
- decode back into the same Phase 50 sync packet
- packet-court import
- invalid timing rejection
- duplicate suppression
- missing-sequence request emission

## Locked Statement

Phase 51A made sync file-carriable.

Phase 51C made sync scannable.

Phase 51D makes sync hardware-witnessable through the ESP32 simulator profile.
