# Phase 78 - OMI Block Image Projection Court

Phase 78 keeps the block-image boundary declarative and adds a projection court
on top of it.

## Status

Phase 77 established declared block-image objects:

- fixed `block_size`
- derived `total_size`
- explicit chunk tables
- sparse chunks as declared holes
- separate `identity_receipt`, `projection_receipt`, `package_receipt`, and `view_receipt`

Phase 78 projects that declared object into deterministic readout views without
mounting it or treating it as a live storage device.

## View Law

- `lazy` -> barcode / chunk manifest
- `greedy` -> chunk chart
- `static` -> reconciliation summary
- `animated` -> chunk-offset sweep

## Invariants

- Block-image declaration remains authority.
- Chunk layout changes `identity_receipt`.
- Projection lens changes `projection_receipt`.
- View mode changes `view_receipt`.
- Sparse chunks remain declared holes.
- No live read/write or network-device behavior exists yet.

## Projection Surface

The projection adapter lower blocks into:

- chunk manifests for lazy readout
- chart views for greedy readout
- reconciliation summaries for static readout
- chunk sweeps for animated readout

This makes block images readable and inspectable without mounting them.

