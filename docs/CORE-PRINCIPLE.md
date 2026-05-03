# OMI Core Principle

See also:
[OMI: A Pre-OS Measurement Machine](PRE-OS-MEASUREMENT-MACHINE.md) and
[OMI Canonical Encoding Law](CANONICAL-ENCODING-LAW.md). The normalized pre-OS
root is [OMI Pre-OS Canonical Measurement Law](PRE-OS-CANONICAL-MEASUREMENT-LAW.md).
The world/projection runtime doctrine is
[OMI Fundamental Geometry Runtime](OMI-FUNDAMENTAL-GEOMETRY-RUNTIME.md).

OMI is a free, ordered CONS algebra over ASCII atoms. The band `0x20..0x3F`
defines its construction and observation space. Digits `0x30..0x3F` are the
canonical codomain of projection functions over CONS structures. ESC (`0x1B`)
selects or gates the active projection regime. Topology, positional encoding,
and geometry are projections of the same underlying CONS algebra.

At the pre-OS level, OMI does not assume an alphabet, a user space, or an
operating system. It interprets non-printing ASCII as hidden CONS-level
structure, measures that structure through the operator band, and emits digits
as the first visible measurement outputs.

```text
0x00..0x1F = hidden CONS-level structure
0x20..0x2F = measurement / projection operators
0x30..0x3F = canonical visible measurement outputs
0x40..0x7F = optional alphabet / user-space projections
```

```text
C = free ordered CONS algebra over ASCII atoms
D = {0x30..0x3F}
pi_lens : C -> D
```

For every CONS structure `L` and every valid projection lens `lens`:

```text
pi_lens(L) in {0x30..0x3F}
```

Digits are not meaning by themselves. They are stable names for projected
invariants. They are measurements before they are numbers.

| Lens | Interpretation of `pi_lens(L)` |
|------|--------------------------------|
| Topological | simplex class, Betti-like rank, recursion descriptor |
| Positional | coefficient or place-value observation |
| Geometric | boundary, surface, or embedding descriptor |
| Address | observer address / witness class |

Boundary law:

```text
CONS algebra is primary.
Projection lenses observe CONS algebra.
Projection lenses do not feed ESC, Γ, or GAUGE_APPLY.
```

This preserves Phase 25: digits are topology descriptors under the topological
lens. It also permits later numeric encodings: digits may be read as
coefficients under a positional lens. The structure does not change; only the
projection regime changes.

Pre-OS law:

```text
No printable symbol exists before measurement.
Digits are the first visible facts.
Numbers, letters, words, files, and operating systems are later projections.
```

Resolution law:

```text
5040 = master blackboard resolution
360  = global state resolution
240  = public canvas-frame resolution
60   = private/local point-sweep resolution
8    = source/target byte cadence
7    = Fano incidence selector
```

These periods are field-resolution partitions over one master replay surface,
not separate clock authorities.
