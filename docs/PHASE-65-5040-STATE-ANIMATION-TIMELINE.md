# Phase 65 - 5040-State Animation Timeline

Phase 65 exposes the Phase 64 animated view as a deterministic 5040-frame
timeline. The timeline is a projection control surface only; it does not change
identity, receipts, or authority.

## Root Statement

The animated view is the sexagesimal rolling difference between reconciled
frames. A 5040-frame timeline lets the workbench seek that difference without
changing the declared object.

## Timeline Rules

- `seek(frame)` normalizes to the 5040 court cycle
- `next()` advances one frame
- `previous()` steps back one frame
- `snapshot()` returns the current frame projection
- frame `0` and frame `5040` reconcile to the same court boundary
- the same declared object keeps the same identity and package receipts

## What the Timeline Carries

- frame index and normalized frame
- 60/240/5040 timing readout
- difference class and difference label
- court boundary state for frame `0` / `5040`
- animated view snapshot from Phase 64

## Acceptance Surface

`make workbench-animation-timeline-test` proves:

- frame `0` and frame `5040` resolve to the same court boundary
- `seek`, `next`, `previous`, and `snapshot` are deterministic
- the animated view remains projection-only
- composer-shell integration preserves identity and receipts while seeking
