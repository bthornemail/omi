# PHASE 73 - Multi-Region Overlay Projection

## Summary

Phase 73 makes scoped stream declarations compositional. Multiple declared
regions may overlap, and the projection layer resolves them into a deterministic
overlay stack.

Declaration remains authoritative. Projection resolves overlaps. Presentation
surfaces the resolved result.

## Law

```text
declaration authority = identity_receipt
projection lens        = projection_receipt
presentation mode      = view_receipt
```

Overlapping regions do not collapse into ambiguity. They resolve by a fixed
overlay order:

1. broader regions first
2. narrower regions later
3. later declarations override earlier ones at the same specificity

## Overlay Resolution

For any inspected byte index, the workbench projects:

- `overlay_stack`: every matching region in resolution order
- `resolved_region`: the final merged projection
- `overlay_receipt`: a deterministic witness for the resolved overlay stack

That makes the resolution inspectable without turning projection into authority.

## Deterministic Stack

The overlay stack is ordered by:

- span length, broadest first
- starting offset
- declaration order

This lets the workbench resolve defaults and overrides without ambiguity.

## Workbench Surface

Phase 73 is exposed through the existing stream projection surface:

- `inspectStreamProjection(index, { mode })`
- `currentStreamProjection()`

The returned projection includes the overlay stack when regions overlap.

## Test Coverage

Phase 73 is verified by:

- `make workbench-stream-overlay-test`
- `make unit-test`

The court proves:

- overlapping regions resolve deterministically
- the narrowest matching region overrides broader defaults
- overlay resolution is inspectable
- identity stays stable while the projection lens changes

## Locked Statement

```text
Phase 73 makes scoped stream declarations compositional: overlapping regions
resolve into deterministic overlay projections without collapsing declaration
authority, projection lens, or presentation mode.
```
