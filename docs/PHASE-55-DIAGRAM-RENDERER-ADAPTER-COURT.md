# Phase 55 - Diagram Renderer Adapter Court

Phase 55 makes diagram fixtures visible as deterministic projection artifacts.

It consumes:

- Phase 53 diagram tangle artifacts
- Phase 54 coordinate and closure witnesses
- Phase 54C canonical/barcode scope multi-graph edges

It does not create authority.

## Root Statement

The renderer draws the graph.

The graph does not come from the renderer.

## Fixture Families

The first fixture registry pins these diagram families:

- Smith chart -> incidence / 360 field projection
- 4-bit adder -> Aztec-like component graph projection
- graph coloring -> MaxiCode-like mesh/texture/filter graph projection
- Karnaugh torus -> BeeCode-like compact truth/instruction surface
- double-cube distances -> Code16K-like CONS closure/extrusion projection
- Genaille rods -> arithmetic/path projection
- polyform unfoldings -> 2D/2.5D/3D polyform basis projection

These fixture records are renderer inputs. They are not model authority.

## Renderer Modes

- `fallback-svg`
- `dot-source`
- `html-inline-svg`
- `coordinate-overlay-svg`
- `scope-multigraph-svg`
- `external-graphviz-optional`

The fallback renderer is deterministic and dependency-free.

The external Graphviz mode remains optional and uses the fallback projection in
this phase. No Graphviz runtime is required for proof.

## Metadata Law

Renderer output preserves OMI metadata:

- `data-omi-path`
- `data-omi-carrier`
- `data-omi-scope`
- `data-omi-witness`

Coordinate overlays also preserve:

- `data-omi-x`
- `data-omi-y`
- `data-omi-z`
- `data-omi-w`
- `data-omi-coordinate-receipt`

Scope multi-graph overlays also preserve:

- `data-omi-visibility`
- `data-omi-location`
- `data-omi-orientation4`
- `data-omi-public-frame240`
- `data-omi-closure-receipt`

## Non-Authority Rules

- diagrams are projection templates
- SVG output is a projection
- renderer adapters do not mutate source
- renderer adapters do not mutate edit logs or sync packets
- renderer adapters do not mutate coordinates, closures, receipts, or graph
  edges
- barcode graph edges remain carrier projections
- no drag/drop composition in this phase
- no GPU/WebGL/OpenGL in this phase
- no image recognition in this phase

## Acceptance Surface

`make workbench-diagram-renderer-test` proves:

- fixture families register deterministically
- fallback SVG is deterministic
- DOT source mode returns the tangled DOT artifact
- HTML inline SVG wraps a stable SVG projection
- coordinate-overlay SVG carries Phase 54 metadata
- scope-multigraph SVG carries Phase 54C metadata
- unknown modes and fixtures reject deterministically
