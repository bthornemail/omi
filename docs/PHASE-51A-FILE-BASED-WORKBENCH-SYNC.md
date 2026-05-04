# Phase 51A - File-Based Workbench Sync Adapter

Phase 51A adds the first concrete transport for the Phase 50 sync packet
court.

This transport is intentionally narrow:

- write one validated sync packet to a file
- write an ordered bundle of validated sync packets to a file
- read those files back through the packet court
- apply imported packets through the existing append-only edit-log APIs

The adapter is not a second collaboration model.

## Doctrine

A sync file is not authority.

A sync file is a carrier for validated OMI sync packets.

The workbench source remains canonical. File sync only transports packetized
edit, merge, and conflict history.

## File Formats

Single packet:

- `.omi-sync.json`

Ordered bundle:

- `.omi-synclog.json`

`.omi-sync.json` stores one deterministic packet encoding.

`.omi-synclog.json` stores:

- `format = "omi-synclog"`
- `packet_count`
- `packets`
- `bundle_receipt`

`bundle_receipt` is deterministic over the ordered packet encodings.

## Import Law

Reading a file must decode and validate Phase 50 packets.

Applying a file must import through the existing packet/apply APIs.

The adapter therefore preserves:

- base receipt validation
- duplicate packet suppression
- missing-sequence request emission
- append-only imported edit history

No direct source mutation occurs in the file adapter.

## Acceptance Surface

`make workbench-file-sync-test` proves:

- deterministic single-packet file write/read
- deterministic ordered bundle write/read
- bundle import reconstructs imported edit history
- duplicate file import is ignored deterministically
- missing sequence emits `REQUEST_MISSING_SEGMENT`
- invalid base receipt rejects

## Locked Statement

Phase 50 made collaboration portable.

Phase 51A makes collaboration durable through files.

Files are transport carriers for sync packets, not a new authority path.
