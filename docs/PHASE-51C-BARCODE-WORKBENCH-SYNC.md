# Phase 51C - Barcode Workbench Sync Adapter

Phase 51C makes workbench collaboration scannable without making the barcode
authoritative.

This phase does not generate or read barcode images yet. It encodes Phase 50
sync packets into deterministic carrier frame declarations and decodes those
declarations back into validated packets.

## Doctrine

A barcode is not the edit.

A barcode is a timed carrier receipt for a validated OMI sync packet.

Decoded packets still flow through the Phase 50 packet court and the existing
append-only edit-log import path.

## Carrier Mapping

- `Code16K` carries timing plus packet `sequence`
- `Aztec` carries `base_receipt` and global object-root receipt
- `MaxiCode` carries `bundle_receipt` / public sync receipt
- `BeeCode` carries a bounded 15-bit packet selector

The pinned timing constants remain:

- `5040`
- `60`
- `16`
- `8`
- `7`
- `360`
- `240`

BeeCode stays bounded to `0..32767`.

## Declaration Shape

The adapter emits a deterministic JSON declaration with:

- `format = "omi-barcode-sync"`
- `code16k`
- `aztec`
- `maxicode`
- `beecode`
- `packet_text`
- `packet_receipt`

`packet_text` is the deterministic Phase 50 packet encoding. The carrier
declaration wraps that packet; it does not replace packet validation.

## Import Law

Decoding validates:

- Code16K timing constants
- Aztec `360`
- MaxiCode `240`
- BeeCode selector bounds
- embedded Phase 50 packet receipt and base receipt

Applying a decoded carrier uses the existing Phase 50 packet court. Duplicate
decoded packets are therefore ignored deterministically.

## Acceptance Surface

`make workbench-barcode-sync-test` proves:

- deterministic carrier declaration encode/decode
- BeeCode selector bounds
- Code16K timing enforcement
- decoded packet import through the packet court
- duplicate scan suppression
- invalid timing/base receipt rejection

## Locked Statement

Phase 51A made sync file-carriable.

Phase 51C makes sync scannable.

Barcode carriers transport validated sync packets; they do not become a new
authority path.
