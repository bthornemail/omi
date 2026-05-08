# Phase 69 - Composition Trust Bundles

Phase 69 adds a trust bundle for barcode-template compositions. The trust
bundle signs the composition `identity_receipt`, not the `view_receipt`.

## Root Statement

Trust follows identity, not projection.

A composition trust bundle is an attestation layer over the current composition
identity receipt. Lazy/greedy switching changes the view receipt, but it must
not invalidate trust. Content edits change the identity receipt and therefore
invalidate the old trust bundle until the composition is re-sealed.

## Runtime Rules

- `identity_receipt` is the trust anchor.
- `view_receipt` is projection metadata only.
- Sealed trust survives lazy/greedy switching.
- Content edits change `identity_receipt` and invalidate the old trust bundle.
- The gallery SVG may include trust metadata when a bundle is present.
- Trust validation is deterministic and projection-only.
- No new authority path is introduced.

## Bundle Fields

- `identity_receipt`
- `signatures[]`
- `review_status`
- `trust_receipt`

Each signature record carries:

- `identity_receipt`
- `signer_id`
- `signer_scope`
- `signed_at_tick`
- `signature_algorithm`
- `signature_value`
- `review_status`
- `trust_receipt`

## Acceptance Surface

`make workbench-composition-trust-test` proves:

- sealing a composition produces a deterministic trust bundle
- view changes do not invalidate the bundle
- content edits invalidate the old bundle
- resealing restores trust deterministically
- direct bundle validation rejects identity mismatches

