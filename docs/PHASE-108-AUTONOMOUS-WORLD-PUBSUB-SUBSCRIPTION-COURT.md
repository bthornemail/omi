# Phase 108 - Autonomous World Pub/Sub Subscription Court

Phase 108 adds a deterministic subscription and filtering layer over Phase 107
peer exchange records. A local node can declare interest in peer, world, and
history streams, match or ignore exchange offers, and only expose snapshots
after the Phase 107 and Phase 106 verification path succeeds.

Locked rule:

> **A subscription may request world updates, but only verified exchanged packages become locally admitted history.**

Locked phrase:

> **Phase 108 lets a node state what history it wants without trusting the stream that offers it.**

## Boundary

```text
107 = peer offers verified package evidence
108 = local node declares which peer/world/history streams it wants
future = live pub/sub sockets, routing, subscriptions over network
```

The subscription court is not pub/sub transport:

```text
subscription != authority
filter match != admission
stream interest != trust
peer/world/history filters do not auto-admit
```

## Flow

```text
declare subscription
-> bind declared peer/world/history filters
-> receive peer exchange offer record
-> evaluate subscription match
-> request or ignore package evidence
-> verify through Phase 107/106 path
-> expose admitted imported snapshots only after verification
```

Matched tampered packages still reject. Unmatched valid exchanges remain
ignored for that subscription. Browser and renderer projections may open only
accepted verified snapshots.

## Subscription Record

```json
{
  "kind": "omi.autonomous-world.subscription",
  "subscription_id": "sub.fixture.world-history",
  "authority": false,
  "filters": {
    "peer_id": "peer.fixture.alice",
    "world_id": "world.autonomous-fixture",
    "history_mode": "admitted-only"
  },
  "subscription_receipt": "...",
  "matched_exchange_receipts": [],
  "admitted_snapshot_identities": []
}
```

The subscription receipt witnesses local interest. It does not admit history.
The evaluation receipt witnesses a specific exchange match or ignore decision.

## Authority

Local authority remains admitted declarations and receipts. Phase 108 adds no
live sockets, routing, network subscriptions, or transport behavior.
