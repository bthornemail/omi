# Phase 104 - Autonomous World Version History Court

Phase 104 adds a deterministic version-history layer over Phase 103 admission
reports. It records receipt-linked edges between admitted world snapshots
without becoming world authority.

Locked rule:

> **World history is not overwritten; it is a receipt-linked chain of admitted declarations.**

Locked phrase:

> **Phase 104 gives the world memory without smuggling mutation into the present: history is a receipt-linked graph of admitted declarations.**

## Boundary

```text
Phase 103 = admission creates a new admitted snapshot
Phase 104 = admitted snapshots become linked version history
```

The version graph is a witness surface:

```text
history graph != world authority
history edge != admitted world state
old identity remains referenceable
new identity is admitted only by Phase 103 admission report
```

## Version Edge

The core history edge is:

```json
{
  "from_identity_receipt": "...",
  "overlay_receipt": "...",
  "candidate_edit_receipt": "...",
  "admission_decision_receipt": "...",
  "to_identity_receipt": "...",
  "history_edge_receipt": "..."
}
```

The edge receipt is deterministic over the required receipts. Missing overlay,
candidate, admission decision, or destination identity receipts reject the edge.

## Replay

Replay follows admitted history edges, not overlay projections.

```text
root admitted identity
-> admitted edge
-> admitted snapshot identity
-> admitted edge
-> latest admitted identity
```

Branching is allowed. Multiple admitted edges may share the same
`from_identity_receipt` when each edge has its own admission report and history
edge receipt.

## Projection

The history graph may index admitted snapshots by identity so browser and
renderer surfaces can open any version:

```text
identity receipt
-> admitted snapshot
-> browser projection
-> renderer projection
```

Package, closure, and raw-binary receipts remain attached to each admitted
snapshot as witnesses. They do not make the history graph authoritative.
