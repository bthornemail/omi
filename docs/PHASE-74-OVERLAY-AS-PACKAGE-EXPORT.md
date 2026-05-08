# Phase 74 - Overlay as Package Export

Phase 74 packages stream declarations and overlay readouts as portable
metadata. The declaration stack stays authoritative, the overlay projection
stack stays lens-like, and the presentation mode stays a separate view
selection.

## What Is Packaged

- declaration stack
- resolved overlay stack
- resolved regions
- overlay receipts
- declaration receipt
- projection receipt
- view receipt

## Core Rule

```
identity_receipt   = declaration stack
projection_receipt = overlay stack + readout lens
view_receipt       = presentation mode
```

That separation is preserved across export and import.

## Package Shape

- `manifest.json`
- `declaration/declaration.json`
- `projection/projection.json`
- `overlays/overlay-stack.json`
- `overlays/resolved-regions.json`
- `receipts/receipts.json`
- `README.org`

## Import Law

Import reconstructs the declaration and recomputes the overlay stack
deterministically. If the package was tampered with, import rejects before any
projection state is accepted.

## Locked Statement

> Phase 74 makes overlay resolution portable without making projection
> metadata authoritative.
