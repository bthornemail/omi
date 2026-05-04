# Phase 54C - Canonical / Barcode Multi-Graph Scope Law

Phase 54C adds a deterministic multi-graph witness over Phase 54 coordinate
blocks and sexagesimal CONS closures.

## Root Statement

The canonical OMI-LISP graph owns structure.

The barcode graph is a scannable carrier projection over the same closure
receipts and public-frame readouts.

The two graphs may share coordinate and closure witnesses, but they do not
share authority.

## Two Graphs

`G_canonical`
: Authority-side OMI-LISP structural graph.

`G_barcode`
: Carrier-side barcode orientation and transport graph.

The bridge is the shared closure witness:

- coordinate receipts
- closure receipt
- sexagesimal slot
- `orientation4`
- `public_frame240`

## Scope Lattice

Visibility is a graph label:

- `public`
- `private`
- `protected`

Location is a graph label:

- `global`
- `local`
- `remote`

Together they form the nine deterministic scope classes:

- `public.global`
- `public.local`
- `public.remote`
- `private.global`
- `private.local`
- `private.remote`
- `protected.global`
- `protected.local`
- `protected.remote`

These are labels, not authority changes or enforcement mechanisms.

## Carrier Orientation Mapping

Barcode orientation is pinned to the four normalized carrier roles:

- `0 = Code16K`
- `1 = Aztec`
- `2 = MaxiCode`
- `3 = BeeCode`

Barcode carrier orientation must align with Phase 54 `orientation4`.

## Multi-Graph Edge Witness

Each edge witness carries:

- `from_coord_receipt`
- `to_coord_receipt`
- `closure_receipt`
- `edge_kind`
- `visibility`
- `location`
- `carrier`
- `orientation4`
- `sexagesimal_slot`
- `public_frame240`
- edge receipt
- scope-class string

Canonical edges use `carrier = none`.

Barcode edges use one of:

- `Code16K`
- `Aztec`
- `MaxiCode`
- `BeeCode`

## Authority Law

Canonical edges:

- own structure
- may reference closure witnesses
- may carry scope labels

Barcode edges:

- carry scannable orientation/readout only
- may reference the same closure witness
- may not claim canonical authority
- may not mutate the canonical graph

## Acceptance Surface

`make scope-multigraph-test` and
`make workbench-scope-multigraph-test` prove:

- deterministic scope encode/decode
- all nine scope classes roundtrip
- canonical and barcode edges may share a closure receipt
- barcode carrier alignment with `orientation4`
- invalid scope and invalid barcode authority reject deterministically
