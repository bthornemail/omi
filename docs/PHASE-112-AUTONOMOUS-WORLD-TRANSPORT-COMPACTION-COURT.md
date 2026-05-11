# Phase 112 - Autonomous World Transport Compaction Court

Phase 112 adds deterministic compaction bundles over Phase 110 replay logs and
Phase 111 checkpoints. Compaction can reduce old transport evidence to a
receipt-preserving bundle, but it cannot replace the receipts needed to verify
history.

Locked rule:

> **Compaction may reduce transport evidence size, but it cannot erase the receipts needed to verify history.**

## Boundary

```text
110 = replayable transport event log
111 = checkpoint / resumability
112 = receipt-preserving compaction bundle
future = storage pruning, archival policy, live transport capture
```

The compaction court is not an authority shortcut:

```text
compaction bundle != authority
compaction bundle != replay admission
compaction resume != verification bypass
stored accepted status != admitted snapshot
```

## Flow

```text
transport replay log
-> checkpoint boundary
-> compact old evidence into retained receipts
-> compaction receipt
-> resume through checkpoint plus later evidence
-> recompute verification for exposed snapshots
```

Tampered logs reject. Tampered compaction bundles reject. A compacted bundle may
summarize old transport evidence, but browser and renderer projections may open
only snapshots accepted after the resumed verification path.

## Compaction Bundle

```json
{
  "kind": "omi.autonomous-world.transport-compaction-bundle",
  "compaction_id": "compaction.fixture.0",
  "authority": false,
  "admission": false,
  "compacted_range": {
    "from_order": 0,
    "to_order": 0,
    "event_count": 1
  },
  "checkpoint_receipt": "...",
  "replay_entry_receipts": [],
  "transport_event_receipts": [],
  "retained_evidence_receipts": [],
  "compaction_receipt": "..."
}
```

The compaction receipt witnesses a reduced evidence bundle. It does not admit
history and does not erase the checkpoint, replay entry, transport event, or
processing receipts needed to verify what was compacted.

## Authority

Local authority remains admitted declarations and receipts. Phase 112 helps old
transport evidence become smaller without letting smaller evidence become
trusted evidence.
