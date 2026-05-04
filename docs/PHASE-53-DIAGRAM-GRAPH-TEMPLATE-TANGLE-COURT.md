# Phase 53 - Diagram/Graph Template Tangle Court

Phase 53 connects the literate Org/noweb/tangle layer to the existing diagram
template library.

The goal is not to create a new diagram authority plane. The goal is to
generate deterministic graph and diagram artifacts from canonical world
relations and template metadata.

## Doctrine

A diagram is not authority.

A diagram is a deterministic projection from canonical OMI paths and diagram
templates.

DOT output, SVG placeholder output, relations JSON, and diagram index files are
all derived artifacts.

## Inputs

- canonical OMI world/model document
- Phase 40D diagram template declaration
- Org noweb blocks
- FS/GS/RS/US path metadata

## Outputs

- `graph.dot`
- `graph.svg`
- `relations.json`
- `diagram.index.org`

`graph.dot` carries OMI path metadata in attributes and comments where
possible.

`graph.svg` is a deterministic placeholder projection with `data-omi-path`
metadata and no external Graphviz dependency.

`relations.json` is a reviewable serialization of canonical world interaction
records.

`diagram.index.org` carries model id, template id, receipts, and embedded graph
blocks for literate review.

## Acceptance Surface

`make workbench-diagram-tangle-test` proves:

- deterministic tangle output
- canonical relation edges from the world model
- OMI path metadata in graph output
- relations JSON roundtrip
- diagram index carries receipts and template metadata

## Locked Statement

Phase 52 made OMI literate.

Phase 53 makes diagrams reproducibly tangled.

Diagram artifacts are projections over canonical world relations and template
receipts, not independent truth.
