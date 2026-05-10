# Phase 102 - Autonomous World Interjection Overlay

Phase 102 adds a deterministic headless overlay court for autonomous worlds. It
lets a user or observer interject a branch, annotation, alternate scene note, or
proposed relation onto an admitted world path without mutating canonical world
identity.

Locked rule:

> **An interjection is a projected overlay on an admitted world, not a rewrite of the world’s authority.**

Locked phrase:

> **Phase 102 lets the observer speak into the world as projection, while preserving the admitted world as receipt-verified authority.**

## Boundary

The autonomous world stack now separates:

```text
Phase 99  = build/admit world state
Phase 100 = open/traverse/inspect admitted world state
Phase 101 = render/animate admitted world projections
Phase 102 = interject overlay without rewriting authority
```

Phase 102 does not create an editor. It creates a receipt-witnessed projection
overlay.

```text
interjection != authority
overlay != canonical world state
branch snapshot != canonical history
browser overlay != admission
renderer overlay != admission
admitted declaration + receipts = authority
```

## Overlay Record

An overlay record is a projection object:

```json
{
  "overlay_id": "overlay.example",
  "target_path": "world.autonomous-fixture/objects/trailer.001",
  "kind": "annotation",
  "body": "observer note",
  "modality": "projection.interjection",
  "authority": false,
  "world_identity_receipt": "...",
  "overlay_receipt": "...",
  "view_receipt": "..."
}
```

The `world_identity_receipt` remains the admitted world identity. The
`overlay_receipt` witnesses the interjection content, target path, modality,
observer, branch label, and admitted world identity.

## Branch Snapshot

A branch snapshot collects one or more overlays into a projection-only branch.
It is useful for alternate scene readouts, commentary, proposed relations, and
observer notes, but it is not canonical history.

```text
same admitted world + same interjection
-> same overlay receipt

different target path
-> different overlay receipt

same overlay shown in browser or renderer
-> world identity unchanged

branch snapshot
-> projection-only receipt, not canonical history
```

## Display Surfaces

The browser and renderer may show overlays:

```text
browser
-> overlay readout
-> projection receipt

renderer
-> render plan with overlays
-> overlay projection receipt
```

Neither surface admits the overlay into world state. A future edit/admission
phase may define how an overlay becomes a candidate world mutation. Phase 102
only defines lawful interjection as projection.
