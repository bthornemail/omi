# PHASE 72 - Scoped Stream Projection Court

## Summary

Phase 72 turns the Phase 71 declaration surface into an executable projection
surface.

The declaration remains authoritative. Projection is the lens.

This phase makes it possible to read the same declared stream as:

- raw-binary carrier output
- character-encoded presentation
- endian-aware word readout
- direction-aware text readout
- traversal-aware byte ordering

## Law

```text
declaration -> projection -> readout
identity stays stable
view_receipt changes with mode
```

The stream declaration anchors `identity_receipt`. The projection layer derives
`view_receipt` and `projection_receipt` from the declared stream plus the active
projection mode.

## Modes

The workbench projection surface currently recognizes:

- `barcode`
- `chart`

These are the projection modes already used by the declaration layer.

## Region Readout

Each declared region can project:

- `storage_hex` from byte ordering and traversal
- `display_text` from character order and text direction
- `word_hex` from endian-aware interpretation
- `band_counts` from pre-OS ASCII band classification

That keeps raw binary and character encoding visible as scoped modes over the
same canonical stream.

## Workbench Surface

The composer shell now exposes:

- `projectStreamDeclaration(...)`
- `inspectStreamProjection(...)`
- `currentStreamProjection()`

This is the first executable readout surface for the declared stream law.

## Test Coverage

Phase 72 is verified by:

- `make workbench-stream-projection-test`
- `make unit-test`

The court proves:

- barcode and chart projections stay deterministic
- identity remains stable across projection changes
- region-level raw-binary and character-encoded readouts are deterministic
- composer shell projections are inspectable without mutating the declaration

## Locked Statement

```text
OMI treats traversal itself as declarable structure.
Projection is a view over that declaration, not a new authority.
Raw binary and character text are scoped projections over the same canonical stream.
```
