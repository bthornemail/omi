# Phase 111 - Autonomous World Transport Checkpoint Court

Phase 111 adds deterministic checkpoints over Phase 110 transport replay logs.
Checkpoints summarize replay progress so long transport histories can resume,
but resumed replay must still recompute verification over the relevant evidence
path.

Locked rule:

> **A checkpoint may accelerate replay, but it cannot replace replay verification.**

Locked phrase:

> **Phase 111 gives replay memory, not replay authority.**

## Boundary

```text
106 = package
107 = exchange
108 = subscription
109 = transport event
110 = replay log
111 = replay checkpoint / resumability
```

The checkpoint court is not an admission shortcut:

```text
checkpoint != authority
checkpoint summary != replay admission
checkpoint resume != verification bypass
stored accepted status != admitted snapshot
```

## Flow

```text
transport replay log
-> replay through Phase 109/107/106/108 verification
-> checkpoint accepted/rejected summary
-> checkpoint receipt
-> resume from checkpoint + later log entries
-> recompute verification for replayed/resumed evidence
```

Tampered logs reject before checkpoint or resume. Tampered checkpoints reject
before resume. A resumed replay must match full replay over the same evidence,
and browser/renderer projections may open only snapshots accepted after resumed
verification.

## Checkpoint Shape

```json
{
  "kind": "omi.autonomous-world.transport-checkpoint",
  "checkpoint_id": "checkpoint.fixture.0",
  "authority": false,
  "log_from_receipt": "...",
  "log_to_receipt": "...",
  "accepted_snapshot_identities": [],
  "rejected_event_receipts": [],
  "checkpoint_receipt": "..."
}
```

The checkpoint receipt witnesses a replay summary over a log boundary. It is
memory for resumption, not authority for admission.

## Authority

Local authority remains admitted declarations and receipts. Phase 111 helps
long replay histories resume without letting checkpoint summaries replace
receipt verification.
