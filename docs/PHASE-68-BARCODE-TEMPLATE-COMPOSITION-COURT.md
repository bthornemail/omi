# Phase 68 - Barcode Template Composition Court

Phase 68 turns barcode templates into a deterministic composition surface.
Imported SVG barcode templates and registry fixtures can now be gathered into a
single gallery-like court with a stable identity receipt, a separate view
receipt, and a lazy/greedy projection split.

## Root Statement

A barcode template composition is a projection-only gallery of imported
template witnesses. The same composition can be carried lazily as a sealed
address or unfolded greedily as a chart of templates and relations without
changing identity receipts.

## Runtime Rules

- Composition identity is independent of lazy/greedy mode.
- Lazy mode shows the sealed composition address and receipt.
- Greedy mode shows the unfolded template gallery and relation witness.
- Adding or connecting templates updates the composition receipt, but not the
  authority of the imported templates.
- Imported SVG templates and registry fixtures normalize to the same
  composition surface.
- The composition court is projection-only; it does not mutate source or
  create a new authority path.

## What the Composition Carries

- OMI composition path
- template identities and witnesses
- carrier and scope metadata
- relation witnesses between composed templates
- deterministic SVG gallery projection with `data-omi-*` metadata

## Acceptance Surface

`make workbench-barcode-template-composition-test` proves:

- imported SVG templates compose deterministically
- registry fixtures compose deterministically
- lazy/greedy toggles preserve identity receipts
- relation chains preserve the same composition witness across repeated reads
- the SVG gallery carries stable OMI metadata

