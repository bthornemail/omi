# Phase 105 - Autonomous World Merge / Reconciliation Court

Phase 105 adds a deterministic headless reconciliation layer over Phase 104
version branches. It compares two admitted branches from the same base
identity, produces a merge candidate, classifies conflicts, and admits or
rejects the candidate through receipt discipline.

Locked rule:

> **A merge is a candidate reconciliation between admitted histories; only admission creates the merged world identity.**

Locked phrase:

> **Phase 105 lets histories meet without collapsing authority: reconciliation may propose a join, but only admission creates the merged world.**

## Boundary

```text
Phase 104 = version graph can branch
Phase 105 = branches can propose reconciliation
```

The reconciliation court is not an automatic merge authority:

```text
merge candidate != authority
conflict record != authority
rejected merge does not mutate either branch
admitted merge emits a new world snapshot
```

The browser and renderer may open a merged snapshot after admission, but they do
not admit it.

## Flow

```text
base identity
-> left admitted branch
-> right admitted branch
-> compare history edges
-> produce merge candidate
-> classify conflicts
-> reject or admit
-> new merged identity
-> version history edge
```

The merge candidate records the base, left, and right identity receipts plus a
deterministic candidate receipt. It remains non-authoritative until an
admission decision emits a new declaration snapshot.

## Conflict Records

Conflict records are deterministic witnesses over branch divergence. They
record the target path and the left/right overlay and candidate receipts that
diverged.

Conflict records are not world state. They are evidence for admission or
rejection:

```text
target path
left overlay receipt
right overlay receipt
left candidate receipt
right candidate receipt
-> conflict receipt
```

## Admission

A rejected merge leaves both branch identities stable.

An admitted merge emits a new world snapshot that references:

```text
base identity receipt
left identity receipt
right identity receipt
merge candidate receipt
conflict receipts
admission decision receipt
merged identity receipt
```

Package, closure, and raw-binary witnesses are regenerated for admitted merged
snapshots. The history graph may link the merged identity only after the merge
admission report exists.

## Authority

Canonical authority remains:

```text
admitted declaration + receipts
```

The merge court only proposes and witnesses reconciliation. It does not make
history automatic, and it does not overwrite either branch.
