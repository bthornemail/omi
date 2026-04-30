# RULES.omi Guide

`RULES.omi` is the normative constraint layer for OMI graph states. It borrows
two ideas:

- RFC 2119 requirement levels: `MUST`, `MUST_NOT`, `SHOULD`, `MAY`, and related
  terms
- Datalog-style rules: facts are derived from predicates, and validity is
  checked from the resulting graph of facts

The file is not currently parsed by the kernel. It is a formal design target
that the kernel and host tools implement in slices. Phase 2 adds a hardcoded
minimal executable subset in `kernel/runtime/rules_engine.c`.

## Why This Exists

Natural language is good for explanation but poor at enforcing invariants.
`RULES.omi` gives OMI a place to say:

- which graph states are invalid
- which facts are derived from memory
- which behaviors are permitted but not required
- which unstable states should be reduced over time

## Modal Operators

`MUST`
: Hard invariant. If a `MUST` rule does not hold, the graph state is invalid.

`MUST_NOT`
: Hard prohibition. If a `MUST_NOT` rule is satisfied, the graph state is
invalid.

`SHOULD`
: Soft constraint. A state may violate it, but the implementation should
understand why and should usually move away from the violation.

`SHOULD_NOT`
: Discouraged condition. Non-fatal, but should create optimization pressure.

`MAY`
: Permitted extension point. The implementation can derive or use the fact, but
validity does not depend on it.

`OPTIONAL`
: Explicit implementation choice. Not required for conformance.

## Rule Shape

Rules use this shape:

```text
MODAL conclusion :-
  predicate_1(...),
  predicate_2(...),
  condition.
```

Read it as:

```text
the conclusion has MODAL force when all body predicates hold
```

Example:

```text
MUST node(N) :-
  memory(N).
```

Meaning: every memory position must be interpretable as a graph node.

## Phase 1 Implemented Subset

The current kernel and replay validator implement this subset:

- memory bytes become nodes
- `0x00` is NULL
- equal adjacent non-zero bytes produce CONS binding
- any adjacent pair containing `0x00` produces NULL collapse
- unequal adjacent non-zero bytes produce transient oscillation
- each BOM tick inverts byte order

The current implementation summarizes these facts rather than storing all facts
as a database.

## Future Full Rule Engine

A future rule engine can compile `RULES.omi` into one of:

- bytecode interpreted by the OMI kernel
- a host-side validator for image certification
- generated C tables used by the kernel
- a Datalog database for graph exploration

The first useful compiler target should emit a deterministic validation report:

```text
input:  memory image + BOM tick + rule version
output: valid/invalid + derived fact counts + violations
```

## Conformance Levels

Phase 1 conformance:
: The implementation computes the byte-pair CONS subset and replay validator
matches the kernel summary.

Phase 2 conformance:
: The implementation evaluates the CONS subset through BOM address traversal,
stores a bounded set of derived CONS edges, and halts on fixed-point or orbit
closure.

Phase 3 conformance:
: The implementation extracts CONS regions as symbols, assigns orbit identity,
applies one deterministic rewrite, and re-stabilizes.

Phase 4 conformance:
: `RULES.omi` names at least one rewrite, a host extractor emits a C rule
table, and the kernel executes a rewrite by rule id.

Phase 5 conformance:
: The implementation exposes rule violations as named diagnostics.

Phase 6 conformance:
: `RULES.omi` is parsed or compiled beyond the tiny rewrite declaration.

Phase 7 conformance:
: regions, SID/OID promotion, and soft pressure metrics become executable.

## Non-Goals

`RULES.omi` is not intended to be:

- a general-purpose programming language
- a replacement for implementation code
- a textual macro system
- a symbolic projection format

It is a constraint vocabulary for graph-state validity.
