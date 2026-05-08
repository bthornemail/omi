# Phase 70 - Composition Bundle Court

Phase 70 packages a barcode-template composition together with its gallery
projection and trust seal into a deterministic portable bundle.

## Root Statement

A composition bundle carries identity, projection, and trust in one carrier
format. The trust anchor is the composition `identity_receipt`; the
`view_receipt` remains projection metadata and may change without invalidating
trust. Content edits change identity and require a new bundle or reseal.

## Runtime Rules

- `identity_receipt` is the trust anchor.
- `view_receipt` is projection metadata only.
- The bundle is deterministic and repeatable.
- Lazy/greedy mode changes do not alter trust.
- Content edits change `identity_receipt` and invalidate the old bundle.
- The gallery SVG may carry trust metadata.
- Bundle import validates manifest receipts, composition identity, and trust
  seal.

## Bundle Contents

- `manifest.json`
- `composition/composition.json`
- `gallery/gallery.svg`
- `trust/trust.json`
- `README.org`

## Acceptance Surface

`make workbench-composition-bundle-test` proves:

- bundle export is deterministic
- bundle import validates identity and trust
- view changes preserve bundle trust
- content edits change the bundle receipt and require reseal

