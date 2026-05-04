# Phase 52 - Literate Org/Tree-Sitter Export Court

Phase 52 makes OMI collaboration literate.

Org-mode becomes the human collaboration surface for:

- canonical OMI-LISP source
- append-only edit logs
- sync packet bundles
- receipts
- graph templates
- tanglable projection artifacts

Tree-sitter is treated as an interoperability bridge, not authority.

## Doctrine

Org is not authority.

Tree-sitter is not authority.

Tangling is not authority.

Exports are not authority.

They are literate projections over:

- canonical OMI-LISP source
- append-only edit logs
- sync packets
- receipts
- deterministic replay

## Bundle Shape

The deterministic export bundle contains:

- `model.omilisp`
- `edits.omi-log.json`
- `sync.omi-synclog.json`
- `receipts.json`
- `README.org`

`README.org` includes:

- model identifier
- base/edit/sync receipts
- FS/GS/RS/US counts
- edit count
- conflict count
- Babel source blocks for model, edit log, sync bundle, receipts, and graph

## Property Drawer Law

Property drawers carry OMI metadata such as:

- `OMI_PATH`
- `OMI_FS`
- `OMI_GS`
- `OMI_RS`
- `OMI_US`
- `OMI_RECEIPT`
- `OMI_AUTHORITY`
- `OMI_TANGLE_TARGET`

These are metadata projections over canonical source, not replacements for it.

## Babel / Noweb / Tangle Law

Org-Babel blocks are reproducible projection recipes.

Noweb references are symbolic template composition.

Tangling is deterministic materialization.

This phase proves deterministic parsing and tangling; it does not require block
execution for validation.

## TRAMP / Remote Path Law

TRAMP-style paths are remote carrier locators.

They identify where collaboration artifacts may live. They do not authorize
mutation or replace packet/import validation.

## Tree-Sitter Bridge

The tree-sitter bridge currently provides deterministic extraction helpers for:

- OMI-LISP source blocks
- DOT graph blocks
- `data-omi-*` SVG pointers

It is intentionally subordinate to the canonical OMI parser.

## Acceptance Surface

`make workbench-org-test` proves:

- deterministic Org bundle export
- stable receipts and counts in `README.org`
- deterministic Org/Babel parsing
- deterministic noweb expansion and tangle output
- TRAMP path parsing as carrier locators
- bridge extraction of OMI, graph, and pointer content

## Locked Statement

Phase 52 makes OMI collaboration literate and reviewable.

Authority remains:

- canonical OMI-LISP source
- append-only edit logs
- sync packets
- receipts
- deterministic replay
