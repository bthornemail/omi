# Phase 110 - Autonomous World Transport Replay Court

Phase 110 adds deterministic replay logs for Phase 109 transport events. It
records carrier events as replayable evidence, then replays them through the
Phase 107 peer exchange and Phase 108 subscription courts without depending on
live transport.

Locked rule:

> **A transport log may replay offers, but only receipt verification can replay admission.**

## Boundary

```text
109 = transport adapter plan/event binding
110 = replayable transport event log
future = live transport capture, routing, and pub/sub daemons
```

The replay court is not a network runtime:

```text
transport log != authority
replay entry != admission
stored processing != trusted admission
replay recomputes verification
```

## Flow

```text
transport event
-> replay log entry
-> chained entry receipt
-> transport log receipt
-> replay through Phase 109 event processing
-> Phase 107 peer exchange verification
-> Phase 106 package receipt verification
-> Phase 108 subscription filtering
-> accepted verified snapshots become visible
```

Tampered log entries reject before replay. Tampered packages still reject during
replayed Phase 107 and Phase 106 verification. Unmatched replayed events remain
ignored by subscriptions.

## Replay Log

```json
{
  "kind": "omi.autonomous-world.transport-replay-log",
  "log_id": "transport.replay.fixture",
  "authority": false,
  "admission": false,
  "entries": [
    {
      "kind": "omi.autonomous-world.transport-replay-entry",
      "transport_event_receipt": "...",
      "previous_entry_receipt": null,
      "replay_entry_receipt": "..."
    }
  ],
  "transport_log_receipt": "..."
}
```

The log receipt witnesses the ordered carrier-event record. It does not admit
history. Replay must recompute exchange, package, and subscription verification
from the carried transport events.

## Authority

Local authority remains admitted declarations and receipts. Phase 110 lets a
node repeat carrier evidence without trusting the log as world state.
