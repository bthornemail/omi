# Phase 49 - Workbench Collaboration and Merge Court

Phase 49 adds deterministic local merge for multiple append-only workbench edit
logs over the same base source.

This phase is local-only. It does not add networking, shared sockets, CRDTs,
or hidden collaborative state. It only defines how two edit histories are
combined into a third append-only merged log.

## Root Law

- base source remains canonical
- input edit logs remain append-only and unchanged
- merge output is a new append-only merged log
- non-conflicting commits merge automatically
- conflicting commits produce explicit conflict records
- same base source + same logs = same merged source

## Deterministic Ordering

Active commits are ordered by:

1. `path`
2. `action`
3. `proposalText`
4. `importedFrom`
5. original sequence

This ordering is used only to make merge output stable. It does not rewrite the
input logs.

## Conflict Law

A conflict occurs when two active commits share the same merge key:

- same `action`
- same `path`

but carry different `proposalText`.

Conflict records are append-only OMI merge events, not hidden UI state.

## Covered Conflict Classes

- same record, same property, different values
- same relation id, different source/target
- same texture target, different texture assignment

## Verification

`make workbench-merge-test` proves:

- two non-conflicting logs merge deterministically
- conflicting move edits produce a conflict record
- relation conflicts produce a conflict record
- texture conflicts produce a conflict record
- merged logs replay deterministically
- undo/redo can still operate over the merged log
- input logs remain unchanged

Phase 49 therefore makes collaboration a deterministic merge of append-only OMI
edit logs rather than shared mutable UI state.
