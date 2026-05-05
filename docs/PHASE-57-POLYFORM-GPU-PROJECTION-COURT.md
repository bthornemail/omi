# Phase 57 - Polyform GPU Projection Court

Phase 57 adds a renderer-neutral GPU command stream over Phase 54 coordinate
blocks, Phase 54 closures, Phase 54C scope edges, and Phase 56 composer
scenes.

## Root Statement

The GPU does not own geometry.

The GPU receives deterministic command streams derived from OMI coordinates,
closures, scope graphs, and composer scenes.

## Projection Modes

- `polyform-2d`
- `polyform-2_5d`
- `polyform-3d`
- `scope-graph-3d`
- `barcode-template-scene`

These modes are deterministic descriptions only. They do not require an actual
GPU, WebGL, OpenGL, or OpenGL ES runtime.

## Command Set

- `BEGIN_SCENE`
- `END_SCENE`
- `DEFINE_BLOCK`
- `DEFINE_VERTEX_BUFFER`
- `DEFINE_INDEX_BUFFER`
- `DEFINE_MATERIAL`
- `DRAW_POLYFORM`
- `DRAW_CLOSURE_EDGE`
- `DRAW_SCOPE_EDGE`
- `ATTACH_OMI_METADATA`

## Metadata Law

Command streams preserve:

- OMI path
- coordinate receipt
- closure receipt
- scope label
- carrier label
- witness receipt

Materials, textures, and colors are overlays. They do not alter coordinate or
closure receipts.

## Non-Authority Rules

- the command stream is projection-only
- no GPU context is required
- no WebGL/OpenGL runtime dependency is introduced
- source, edit logs, sync packets, coordinates, closures, graph edges, and
  composer scenes remain immutable from the projection path
- unknown projection modes reject deterministically

## Acceptance Surface

`make workbench-gpu-projection-test` proves:

- composer scenes project into deterministic command streams
- 2D, 2.5D, and 3D modes emit distinct command sets
- scope-graph and barcode-template modes preserve metadata
- repeated projection is identical
- unknown modes reject deterministically
