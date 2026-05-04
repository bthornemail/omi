# Phase 48 - Workbench Edit Log and Undo/Redo Court

Phase 48 makes workbench edits durable and replayable.

The workbench still does not mutate canonical authority directly. Instead,
pointer-driven proposals become append-only edit-log events. The visible source
is reconstructed from base OMI-LISP plus replayed committed edits.

## Root Law

- source trace remains canonical
- visual edits append proposed edit events
- accepted edits append committed edit events
- undo appends a reversal event
- redo appends a reapply event
- same base source + same edit log = same reconstructed source

## Edit Event Classes

- proposal
- commit
- undo
- redo

The log is append-only. History is never deleted.

## Replay Model

Replay walks the edit log in sequence order:

- commits become active edits
- undo masks a prior commit
- redo reactivates a prior commit

The reconstructed source is:

- base source when no edits are active
- base source plus deterministic replay footer when active edits exist

## Export Metadata

SVG, glTF, and OBJ sidecar receipts may carry an edit-log receipt so exported
projections can witness which edit history produced them.

## Verification

`make workbench-edit-test` proves:

- pointer move proposal can be committed
- relation creation proposal can be committed
- texture assignment proposal can be committed
- undo appends a reversal event
- redo restores the projected source deterministically
- replay from base source plus edit log reproduces final source
- export metadata can carry the edit-log receipt witness

Phase 48 therefore turns the workbench from a proposal surface into a
replayable construction system while preserving the source-first authority
chain.
