# Phase 67 - Cube Differential as Barcode Template

Phase 67 makes the six-ray cube witness loadable as a lazy/greedy switchable
barcode template component.

## Root Statement

The cube differential SVG is a frame-difference chart: one origin, six
colored displacement classes, and a bounded cube enclosure that makes
frame-to-frame motion measurable.

## Runtime Rules

- `lazy` mode is the sealed barcode form
- `greedy` mode is the unfolded cube-difference chart
- switching modes does not change identity receipts
- the same component can be imported as an SVG barcode template
- the same template can be dropped into the composer scene as an append-only
  proposal

## What the Component Carries

- OMI path for the cube witness
- carrier and scope metadata
- cube-difference chart witness
- six-ray frame-difference fixture
- SVG barcode projection with `data-omi-view`

## Acceptance Surface

`make workbench-cube-differential-test` proves:

- the cube witness exports a deterministic lazy SVG template
- the greedy view exposes the six-ray chart witness
- SVG import roundtrips through the barcode template parser
- lazy/greedy toggles preserve identity receipts
- composer-shell integration can import and drop the component without
  changing authority
