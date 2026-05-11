# Phase 109 - Autonomous World Live Transport Adapter Court

Phase 109 adds deterministic transport adapter plans and package-offer events
over the Phase 107 peer exchange and Phase 108 subscription courts. It names
carrier surfaces for future live collaboration without opening sockets, file
watchers, pub/sub daemons, or network runtimes.

Locked rule:

> **A live transport may carry offers, but only the declared exchange and receipt-verification courts admit world history.**

Locked phrase:

> **Phase 109 gives world collaboration a carrier surface, not a trust surface.**

## Boundary

```text
108 = subscription/filter evaluation
109 = transport adapter plan/event binding
future = actual sockets, file watchers, pub/sub daemons
```

The transport adapter court is not live transport:

```text
transport plan != authority
transport event != admission
file/socket/network/barcode label != automatic admission
transport success != receipt validity
```

## Flow

```text
transport plan
-> offered package event
-> transport event receipt
-> Phase 107 peer exchange verification
-> Phase 106 package receipt verification
-> Phase 108 subscription filtering
-> accepted verified snapshots become visible
```

Tampered packages still reject over valid transport plans. Unmatched valid
transport events remain ignored by subscriptions. Browser and renderer
projections may open only verified accepted snapshots.

## Transport Plans

Phase 109 declares these carrier surfaces:

```text
file-drop
fifo
unix-socket
tcp
udp
websocket
http-poll
barcode-scan
```

Each plan records an adapter name, endpoint label, mode, and transport plan
receipt. The plan does not open the endpoint and does not create authority.

## Transport Event

```json
{
  "kind": "omi.autonomous-world.transport-event",
  "transport_plan": {
    "adapter": "file-drop",
    "authority": false
  },
  "offer_receipt": "...",
  "offered_package_receipt": "...",
  "transport_success": true,
  "authority": false,
  "admission": false,
  "transport_event_receipt": "..."
}
```

The transport event witnesses that an offer was carried by a declared surface.
It does not admit history. Admission remains downstream in the Phase 107 and
Phase 106 verification path, then Phase 108 subscription filtering decides
whether verified snapshots become locally visible for that subscription.

## Authority

Local authority remains admitted declarations and receipts. Phase 109 only
plans carrier surfaces and witnesses package-offer events.
