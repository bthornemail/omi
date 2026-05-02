# Phase 25 - Topological Digit Derivation Law

ASCII digits `0x30` through `0x39` are not primitive numerals in OMI. They are
derived topology descriptors over the pre-Lisp geometry formed by C0 control
closure (`0x00..0x1F`) and the CONS alignment band (`0x20..0x2F`).

Each digit is a projection label for an invariant of a CONS-set configuration.

| Glyph | Role |
|-------|------|
| `0` | null CONS-set / empty closure |
| `1` | single CONS / primitive edge |
| `2` | two-CONS chain / 2-vertex line |
| `3` | triangle / 3-cycle / first closed surface |
| `4` | tetrahedron / 4-vertex 3-simplex |
| `5` | 5-cell / 4-simplex |
| `6` | 5-simplex |
| `7` | 6-simplex |
| `8` | 7-simplex |
| `9` | 8-simplex / 9-vertex enneazetton |

```text
digit d_i = invariant(CONS-set configuration with i + 1 vertices)
```

The invariant may be read as Euler characteristic, homology rank, simplex
count, or a Schläfli-like recursion signature. No numeric arithmetic is implied
by the kernel.

Boot stack:

| Range | Role |
|-------|------|
| `0x00..0x1F` | control / ESC / closure law |
| `0x20..0x2F` | structural alignment / CONS operators |
| `0x30..0x39` | derived topology descriptors |
| `0x3A..0x3F` | relation / comparison / probe closure |
| `0x40..0x7F` | alphabet / user-space optional projection |

Hard invariants:

1. Digits are derived, not primitive.
2. Digit semantics come from pre-Lisp geometry, not arithmetic.
3. Numeric interpretation is a userspace declaration above Phase 25.
4. Same digit means same CONS-set topology invariant.

The digit `3` does not mean "three" first. It means the invariant of a CONS-set
that forms a 3-cycle under the pre-Lisp closure laws derived from `0x00..0x2F`.

```text
OMI-LISP is geometric before it is numeric.
Digits name topology, not quantity.
Numbers come later, as declared projections.
```
