# Phase 50 - Workbench Sync Packet Court

Phase 50 makes append-only workbench collaboration portable without making it
network-first.

The workbench already has:

- canonical OMI-LISP source
- append-only edit logs
- replay-based undo/redo
- deterministic local merge with explicit conflicts

This phase adds a transport-neutral packet format for moving those edit and
merge histories between peers.

## Doctrine

Sync is not shared mutable state.

Sync is transport of append-only OMI edit-log packets.

Packets may later move through files, HTTP, WebSocket, storage logs, barcode
carriers, or embedded event links, but the packet court itself is neutral about
transport.

## Packet Kinds

- `EDIT_LOG_SEGMENT`
- `MERGE_LOG_SEGMENT`
- `CONFLICT_RECORD`
- `BASE_RECEIPT`
- `ACK_RECEIPT`
- `REQUEST_MISSING_SEGMENT`

## Packet Fields

Each packet carries:

- `packet_kind`
- `base_receipt`
- `source_peer`
- `target_peer`
- `sequence`
- `log_events`
- `conflict_events`
- `receipt_hash`

`base_receipt` binds the packet to the canonical base source. A packet with the
wrong base receipt is rejected.

`receipt_hash` is deterministic over the normalized packet payload. The same
packet bytes therefore produce the same receipt.

## Import Law

Applying a sync packet does not mutate source directly.

Applying a sync packet appends imported events into a local append-only log
using the same edit-log court already proven in Phase 48 and Phase 49.

Imported event handling is:

- `proposal` -> append proposal
- `commit` -> append imported commit or commit imported proposal
- `undo` / `redo` -> append replay mask events
- `conflict` -> append explicit conflict event

## Ordering and Gaps

Packets are applied in ascending `sequence`.

If a packet arrives with a future sequence, the local peer does not guess.
Instead it emits `REQUEST_MISSING_SEGMENT` for the next required sequence.

Duplicate packet receipts are ignored deterministically.

## Acceptance Surface

`make workbench-sync-test` proves:

- deterministic encode/decode for edit-log packets
- deterministic encode/decode for merge-log packets
- deterministic encode/decode for conflict packets
- invalid base receipt rejection
- duplicate packet suppression
- deterministic missing-segment requests
- replay-equivalent merged-log reconstruction from applied packets

## Locked Statement

Phase 49 made collaboration local and deterministic.

Phase 50 makes collaboration portable.

No packet is authority by itself. A packet is a transport witness over
append-only edit, merge, and conflict records.
