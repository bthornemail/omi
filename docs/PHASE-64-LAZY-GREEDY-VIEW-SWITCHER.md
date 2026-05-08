# Phase 64 - Lazy/Greedy View Switcher

Phase 64 turns the Phase 63 doctrine into a small workbench runtime surface.
It does not change authority. It only switches the projection mode used to
view the same declared object.

## Root Statement

The same declared object can be carried lazily, unfolded greedily, reconciled
statically, and animated as a sexagesimal rolling difference without changing
identity.

## View Modes

- `lazy` = barcode / sealed address / receipt
- `greedy` = chart / unfolded geometry / difference rays
- `static` = reconciled declaration / shared witness
- `animated` = 5040-state rolling difference preview

## Runtime Shape

The workbench exposes a deterministic view switcher that:

- tracks the current mode
- returns a projection-only snapshot for that mode
- toggles through the four views in a fixed order
- preserves the same declared identity across all modes

## Acceptance Surface

`make workbench-view-switcher-test` proves:

- the standalone switcher returns deterministic lazy/greedy/static/animated
  projections
- all four views preserve one identity receipt
- the greedy view exposes the frame-difference chart witness
- the animated view exposes the `5040` coordination period
- the composer shell can switch modes without changing package or scene
  authority
