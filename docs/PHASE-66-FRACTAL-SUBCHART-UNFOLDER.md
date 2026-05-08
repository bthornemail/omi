# Phase 66 - Fractal Subchart Unfolder

Phase 66 gives the workbench a controlled unfold/refold surface. A sealed
vertex can open into a greedy subchart and then refold back to the same lazy
address without changing identity or receipts.

## Root Statement

A node may unfold into a subchart, and a subchart may refold into a node,
without loss of identity.

## Runtime Rules

- `openSubchart()` unfolds the sealed vertex into its greedy subchart
- `refoldSubchart()` returns to the same lazy address
- `toggle()` alternates between the two states
- the same declared object keeps the same identity receipt throughout
- unfolding is projection only; it does not mutate authority

## Resolution Levels

- `vertex` = sealed address / lazy node
- `subchart` = recursive greedy interior
- `chart` = unfolded difference witness inside the subchart

The existing Phase 63 resolution doctrine remains the source of truth; this
phase only exposes the open/refold control surface.

## Acceptance Surface

`make workbench-fractal-subchart-test` proves:

- a sealed vertex unfolds into a greedy subchart with depth-4 resolution
- the same object refolds back to the original lazy address
- unfold/refold transitions are deterministic and identity preserving
- composer-shell integration keeps the same declared object and receipts
