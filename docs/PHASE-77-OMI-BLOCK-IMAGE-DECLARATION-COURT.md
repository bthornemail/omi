# Phase 77 - OMI Block Image Declaration Court

Phase 77 makes disk and block-image layouts declarable without turning them
into mounted devices or live transport endpoints.

## Doctrine

- `block_size` is fixed and required.
- `total_size` is derived from the declared chunk layout.
- Each chunk is explicit, deterministic, and receipt-bearing.
- Sparse chunks are declared holes, not implicit gaps.
- `identity_receipt` changes when layout or content changes.
- `projection_receipt` changes with the readout lens.
- `package_receipt` and `view_receipt` remain separate witnesses.

## Snapshot Shape

The block-image court exports a portable snapshot bundle with:

- `manifest.json`
- `declaration/block-image.json`
- `chunks/chunks.json`
- `projection/projection.json`
- `receipts/receipts.json`
- `README.org`

The snapshot can be written to a directory and imported back deterministically.

## Non-Goals

- No mounted device behavior
- No read/write protocol
- No routing or consensus law
- No network block transport

## Verification

- `make workbench-block-image-test`
- `make unit-test`

