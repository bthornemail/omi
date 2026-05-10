# Phase 103 - Autonomous World Overlay Admission Court

Phase 103 adds the first safe mutation pathway for autonomous worlds. A Phase
102 overlay can become a candidate edit, and the court may reject it or admit it
as a new world declaration snapshot. Mutation only occurs through a new admitted
declaration and receipt chain.

Locked rule:

> **An overlay may become a candidate edit, but only an admitted declaration can become world history.**

Locked phrase:

> **Phase 103 turns interjection into accountable mutation: projection may propose, but only admission creates history.**

## Boundary

```text
overlay != authority
candidate edit != admitted history
rejection != mutation
admission != projection
```

The phase ladder is:

```text
Phase 102 = observer speaks into the world as overlay
Phase 103 = overlay becomes candidate edit, then admit/reject
```

Rejected candidates preserve the original world identity. Admitted candidates
emit a new world snapshot. The old world identity remains referenceable.

## Candidate Edit

A candidate edit records:

```text
original world identity receipt
overlay receipt
candidate edit receipt
candidate action
authority false
admitted history false
```

The candidate is not history. It is only a proposed mutation surface.

## Admission Report

Every decision emits an admission report linking:

```text
original world identity receipt
overlay receipt
candidate edit receipt
admission decision receipt
new world identity receipt, when admitted
```

When admitted, the court regenerates:

```text
package export/import receipts
closure coding witnesses
raw-binary chunk index witnesses
browser readout
renderer render plan
```

Those witnesses prove replay and projection discipline over the new admitted
snapshot. They do not become authority.

## Non-Goals

Phase 103 does not add a live editor, collaborative merge, conflict resolver,
or UI workflow. It only defines accountable promotion from projection overlay to
admitted declaration history.
