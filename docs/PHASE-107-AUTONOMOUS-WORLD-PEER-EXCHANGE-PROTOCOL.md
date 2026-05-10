# Phase 107 - Autonomous World Peer Exchange Protocol

Phase 107 adds a deterministic peer-exchange protocol layer for Phase 106
autonomous world sync packages. Peers may offer packages, but local receipt
verification decides admission. This phase models peer exchange without live
networking.

Locked rule:

> **A peer may offer world history, but only local receipt verification admits it.**

Locked phrase:

> **Phase 107 lets peers exchange evidence without becoming evidence themselves.**

## Boundary

```text
106 = portable sync package
107 = declared peer exchange protocol
future = live transport, routing, pub/sub, subscriptions
```

The peer exchange protocol is not a socket runtime:

```text
peer != authority
peer identity != package authority
offer != admission
transport != authority
```

Unknown peers reject unless explicitly declared. Tampered packages reject
through the Phase 106 verifier.

## Protocol Flow

```text
peer declaration
-> offer sync package receipt
-> receive package
-> verify Phase 106 package
-> accept/reject locally
-> index admitted snapshots/history
-> emit exchange receipt
```

An accepted exchange preserves imported snapshot identities and indexes them
only after receipt verification. Browser and renderer surfaces may project
accepted snapshots after verification, but neither surface admits them.

## Exchange Record

```json
{
  "kind": "omi.autonomous-world.peer-exchange",
  "peer_id": "peer.fixture.alice",
  "peer_authority": false,
  "offered_package_receipt": "...",
  "verification_status": "accepted",
  "accepted_snapshot_identities": ["..."],
  "exchange_receipt": "..."
}
```

The exchange receipt is a witness over the declared peer, offered package
receipt, verification status, and accepted snapshot identities. It does not
make the peer or transport authoritative.

## Authority

Phase 107 lets peers exchange evidence. Local admission still depends on
receipt verification over the package and imported history.

Live network transport, routing, pub/sub, subscriptions, hostile peer
hardening, and peer repair protocols remain future work.
