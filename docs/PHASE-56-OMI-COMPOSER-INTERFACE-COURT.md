# Phase 56 - OMI Composer Interface Court

Phase 56 hardens the workbench into the OMI Composer: the user-space
projection editor for building, importing, composing, inspecting, and exporting
OMI world models.

## Root Statement

The composer is not authority.

The composer is the OS-level projection surface where source, graph, spatial
polyforms, barcode templates, receipts, and inspectors meet.

Authority remains:

- canonical OMI-LISP source
- coordinate receipts
- closure receipts
- scope multi-graph edges
- edit logs
- sync packets
- deterministic replay

## Panes

The composer shell exposes five deterministic panes:

- source pane
- graph pane
- spatial/polyform pane
- barcode/template pane
- inspector pane

## Import Pipeline

The first import layer accepts:

- canonical OMI-LISP
- Org bundle text
- SVG templates with `data-omi-*` metadata
- barcode carrier declarations
- sync packets

Imported templates are carriers. They become proposed components only through
append-only edit events.

## Composition Law

Drag/drop does not mutate source directly.

It emits:

- `ADD_COMPONENT` proposal events
- `CREATE_RELATION` proposal events

Accepted edits append commit events through the existing edit log.

## Inspector Law

The inspector resolves selected paths to:

- FS/GS/RS/US coordinate block
- coordinate receipt
- closure receipt
- scope label
- carrier orientation
- edit receipt

## Export Pipeline

Exports are projections:

- OMI-LISP
- Org bundle
- SVG with `data-omi-*`
- glTF with `extras`
- OBJ/MTL with receipt sidecar
- sync packet
- barcode carrier declaration

## Non-Authority Rules

- imported SVG/barcode templates are carriers, not authority
- visual edits create proposals
- source edits reparse and reproject
- sync packets remain validated by the packet court
- coordinate, closure, and scope receipts are not bypassed
- no GPU/OpenGL/WebGL is introduced
- no AI generation is introduced

## Acceptance Surface

`make workbench-composer-test` proves:

- trailer and cargo-yard models load
- SVG barcode templates import deterministically
- drag/drop emits `ADD_COMPONENT`
- connecting components emits `CREATE_RELATION`
- inspector resolves coordinate, closure, scope, carrier, and edit receipts
- SVG/glTF/OBJ/Org/sync/barcode exports preserve OMI metadata
- repeated compose/export is deterministic
