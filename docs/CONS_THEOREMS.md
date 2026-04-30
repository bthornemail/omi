# CONS Theorems

This file records the claims OMI is trying to make mechanically checkable. The
current Phase 1 implementation verifies only a small subset. The rest are design
targets for the rule engine and graph runtime.

## T1 - Closure

For every adjacency pressure, resolution must terminate as exactly one of:

- stable CONS binding
- NULL collapse
- transient oscillation deferred to the next BOM tick

Phase 1 witness:

```text
adjacent(A, B) -> cons(A, B) | null_collapse(A, B) | transient(A, B)
```

The current implementation counts these outcomes for non-overlapping byte
pairs.

## T2 - Replay

Given the same memory image, BOM tick, and rewrite rules, CONS resolution must
produce the same graph structure across runs.

Phase 1 witness:

```text
tools/replay_validator vm_image/omi.img 3
```

The replay validator runs the same byte-pair summary outside QEMU.

## T3 - Projection Non-Authority

No polyform projection may introduce graph truth that cannot be reconstructed
from OMI-GRAPH state.

Meaning:

- renderers can display graph state
- encoders can serialize graph state
- projections cannot invent authoritative edges, nodes, or stable identities

## T4 - Normative Validity

A graph state is valid only when all `MUST` constraints in `RULES.omi` hold and
no `MUST_NOT` constraint is satisfied.

This separates validity from preference. A `SHOULD` violation is not the same
thing as invalidity.

## T5 - Soft Pressure Non-Fatality

Violating a `SHOULD` or satisfying a `SHOULD_NOT` rule does not invalidate a
state, but it creates optimization pressure for later BOM ticks or compiler
analysis.

## T6 - Two-Tick BOM Return

For the Phase 1 BOM operator, applying BOM inversion twice returns the memory
view to its original byte ordering.

```text
BOM(BOM(M)) = M
```

This theorem is specific to the current reversal operator. Future BOM semantics
may generalize it into a period or orbit rule.

## T7 - Derived CONS

CONS is a derived relation over graph memory, not an independent source of
truth.

If memory changes, CONS must be recomputed. If a projection displays a CONS
edge, that edge must be reconstructible from memory and rules.

## T8 - SID Promotion Requires Stability

A SID may only be promoted from an OID after the relevant region has shown
stability under the rule-defined BOM period.

Phase 1 does not implement SID promotion. The theorem exists to prevent future
identity systems from treating first observation as semantic stability.
