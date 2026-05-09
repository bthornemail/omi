# Phase 82 - Operator-Band / CONS-Trie Inclusion Audit

Status: inclusion audit.

This audit keeps the temporary operator-band, SVG recompilation, polyform, and
CONS-trie materials without promoting observed carriers or generated outputs
into root authority.

## Locked Rule

> Source carriers are observed inputs; `.omi` declarations and receipts are
> canonical replay surfaces.

## Included Roles

### Reference Doctrine

`docs/reference/operator-band-truth.txt` is a golden reference table for the
operator band `0x20..0x2F`.

It records each printable operator codepoint as a four-bit admissibility mask
over the `TT`, `TF`, `FT`, and `FF` CONS admission states.

### Projection Compiler Tools

The files below are reference tools, not runtime authority:

- `tools/recompile_svg_to_omi.py`
- `tools/omi_polyform_core.c`
- `tools/omi_polytope_cons_trie.c`

They may observe carriers, compile declarations, emit projections, or generate
fixtures. They do not define canonical truth by themselves.

### Observed Carrier Fixtures

The files below remain observed inputs:

- `tests/fixtures/demo-polyform.svg`
- `tests/fixtures/polytope_records.tsv`

The SVG and TSV surfaces are carriers. They are useful because they can be
recompiled or projected into OMI surfaces, but they do not become declaration
authority.

### Canonical Declaration Fixture

`tests/fixtures/demo-polyform.omi` is a small declaration fixture used to show
how the polyform surface can be expressed directly as OMI.

### Generated Replay Fixtures

The files below are generated replay fixtures:

- `tests/fixtures/generated/omi-svg-recompiled.omi`
- `tests/fixtures/generated/regular-polytopes-cons-trie.omi`

They are large enough to be useful as stable generated witnesses, but they are
not root declarations.

### Receipt Witnesses

The files below are paired receipt witnesses:

- `tests/fixtures/generated/omi-svg-recompiled.manifest.omi`
- `tests/fixtures/generated/regular-polytopes-cons-trie.manifest.omi`

They attest to generated fixture surfaces. They do not make the observed SVG or
TSV carriers authoritative.

## Authority Boundary

This phase adds reference material and fixtures only.

No build target, runtime adapter, compiler pipeline, or root declaration path is
created. Later phases may choose to compile or test these tools, but Phase 82
only preserves and classifies the materials.

## Locked Statement

Operator-band and CONS-trie materials are included as role-separated reference
tools, carriers, fixtures, generated replay surfaces, and receipt witnesses.
They do not create a new authority path.
