# Phase 113 - Autonomous World Transport Repair Court

Phase 113 adds deterministic repair over transport logs, checkpoints, and
compaction bundles. It detects missing or corrupt evidence, emits
receipt-addressed repair requests, applies repair payloads, rebuilds the replay
path, and recomputes verification before any snapshot becomes visible.

Locked rule:

> **Repair may restore evidence, but only verification restores admissibility.**

Locked phrase:

> **Phase 113 makes transport evidence survivable without making repair trustworthy.**

## Boundary

```text
112 = compact old transport evidence
113 = detect/repair missing or corrupt transport evidence
future = live peer repair requests over real transports
```

The repair court is not admission:

```text
repair request != authority
repair payload != admission
repaired log != admitted history
peer supplying repair != authority
```

## Flow

```text
transport log / checkpoint / compaction bundle
-> detect missing or corrupt evidence
-> emit repair request by missing/corrupt receipt
-> apply repair payload
-> rebuild replay path
-> recompute Phase 109/107/106/108 verification
-> expose snapshots only after repaired verification
```

Tampered repair payloads reject. Repair status alone cannot open snapshots.
Browser and renderer projections may open only snapshots accepted after the
repaired evidence path is verified again.

## Repair Request

```json
{
  "kind": "omi.autonomous-world.transport-repair-request",
  "authority": false,
  "target_receipt": "...",
  "target_kind": "transport-event",
  "reason": "missing-or-corrupt",
  "repair_request_receipt": "..."
}
```

The request names missing or corrupt evidence. It does not trust the peer,
payload, transport, or replacement evidence. The repaired path must still
verify through the replay, peer exchange, package, and subscription courts.

## Authority

Local authority remains admitted declarations and receipts. Phase 113 restores
evidence shape so verification can run; it does not restore admissibility by
itself.
