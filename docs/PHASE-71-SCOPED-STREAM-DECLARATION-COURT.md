# PHASE 71 - Scoped Stream Declaration Court

## Summary

Phase 71 makes the pre-OS declaration substrate executable in the workbench.
It does not change authority. It gives the composer shell a deterministic
surface for declaring how a source stream is interpreted in place:

- raw binary regions
- character-encoded regions
- endian orientation
- text direction
- car/cdr traversal
- barcode/chart presentation

The same canonical source can carry these declarations without changing
identity when only the active presentation changes.

## Law

OMI treats traversal itself as declarable structure.

```text
canonical source
  -> declared stream regions
  -> stream identity receipt
  -> active presentation receipt
  -> projection / inspection
```

The declaration is the structural anchor. The active presentation is a lens.

## Bands

Phase 71 aligns with the pre-OS measurement bands:

| Range | Role |
|-------|------|
| `0x00..0x1F` | control / hidden structure |
| `0x20..0x2F` | operators / lenses |
| `0x30..0x3F` | first visible measurements |
| `0x40..0x7F` | optional projection surfaces |

This court does not redefine those bands. It exposes them as inspectable
stream structure.

## Declaration Model

Each stream region may declare:

- `binary_mode`: `raw-binary` or `character-encoded`
- `endian`: `little` or `big`
- `text_direction`: `ltr` or `rtl`
- `traversal`: `car/cdr` or `cdr/car`
- `presentation`: `barcode` or `chart`

Region declarations contribute to the stream identity receipt.
Changing the active presentation changes the view receipt only.

## Workbench Surface

The composer shell now exposes:

- `declareStreamRegion(...)`
- `setStreamPresentation(...)`
- `toggleStreamPresentation(...)`
- `currentStreamDeclaration()`
- `inspectStreamDeclaration(index)`

This keeps the declaration surface close to the existing source and composer
workbench, while remaining projection-only.

## Test Coverage

Phase 71 is verified by:

- `make workbench-stream-declaration-test`
- `make unit-test`

The court proves:

- band classification is deterministic
- declared raw-binary and character-encoded regions coexist
- endian, direction, traversal, and presentation are inspectable
- view changes preserve identity
- content edits change identity and require a new declaration state

## Locked Statement

```text
OMI treats traversal itself as declarable structure.
Raw binary and character text are scoped projections over the same canonical stream.
Identity follows the declaration; presentation follows the lens.
```
