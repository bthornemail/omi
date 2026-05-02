# OMI Pre-OS Canonical Measurement Law

Implementation evidence:
[Implementation Audit: Phases 20-29](IMPLEMENTATION-AUDIT-PHASES-20-29.md).

## Root Statement

OMI is a pre-OS canonical measurement machine.

It does not begin with text, files, processes, users, or an operating system. It
begins with bytes, deterministic replay, and projection.

```text
Bytes are canonical.
Replay is deterministic.
Everything visible is derived by projection.
```

OMI is the layer where hidden byte structure becomes measurable.

## Pre-OS Inversion

A conventional software stack often assumes:

```text
hardware -> firmware -> operating system -> user space -> files -> text -> numbers -> meaning
```

OMI reverses the dependency:

```text
canonical bytes
  -> deterministic replay
  -> hidden structure
  -> measurement operators
  -> visible digits
  -> optional numbers / text / files / OS behavior
```

The operating system is not the foundation. It is a later projection. The
alphabet is not the foundation. It is a later projection. Numbers are not the
foundation. They are interpretations of earlier measurement outputs.

OMI does not require an operating system in order to produce meaning-bearing
structure. It requires canonical bytes, deterministic replay, and projection
rules.

## ASCII Roles

OMI gives ASCII byte ranges structural roles. These are OMI roles, not
historical terminal roles.

| Range | OMI role |
|-------|----------|
| `0x00..0x1F` | hidden structure and control |
| `0x20..0x2F` | operators / measurement lenses |
| `0x30..0x3F` | first visible measurement outputs |
| `0x40..0x7F` | optional alphabetic / user-space projections |

Digits are not primitive numbers. Digits are the first visible measurement
outputs. At the pre-OS level, `0x33` / `3` means:

```text
the active projection produced measurement class 3
```

Only after a numeric projection is selected does that output become arithmetic.

## Hidden Structure And Visible Measurement

Structure is hidden. Measurement is visible.

```text
control bytes are structural causes
digit bytes are measurement effects
```

The non-printing band carries structure. The printing digit band carries
measured invariants.

## CONS-Level Interpretation

OMI may interpret selected non-printing ASCII bytes as CONS-level structural
cells. This is a machine law, not a historical claim about ASCII.

```text
a structure is built from ordered pair relations
a projection reads that structure
a digit names the measured invariant
```

The same CONS structure can be read under different lenses:

| Lens | Digit meaning |
|------|---------------|
| topological | invariant class |
| positional | coefficient |
| geometric | boundary / interior relation |
| precision | resolution level |

Same visible digit. Different projection regime.

## Projection

A projection is a deterministic function:

```text
pi : CanonicalStructure -> VisibleOutput
```

The structure is not modified by being projected. The projection produces a
view.

Authority boundary:

```text
canonical bytes = truth
replay = motion
structure = lawful interpretation
projection = measurement
rendering = display
interpretation = user-space meaning
```

No projection may modify canonical structure.

## Kernel Transition Law

The pre-OS layer requires a deterministic motion law. Phase 28 implements the
normalized delta law:

```text
Delta(x, n) =
  mask(n,
       rotl(x, 1, n)
     XOR rotl(x, 3, n)
     XOR rotr(x, 2, n)
     XOR Cn)
```

Important constraints:

```text
rotation, not shifting
XOR, not arithmetic addition
masking, not unbounded growth
fixed constant, not external state
```

For fixed `(C, n, x0)`:

```text
x_k = Delta^k(x0)
```

is uniquely determined.

No scheduler is required. No wall clock is required. No OS time service is
required. Agreement requires:

```text
same seed
same width
same constant
same transition law
same replay count
= same state
```

Implementation evidence:

```text
kernel/bitwise_kernel.omi
kernel/include/bitwise_kernel.h
kernel/runtime/bitwise_kernel.c
tests/bitwise_kernel_test.c
make bitwise-test
```

## Rotation Before Counting

A shift throws information away. A rotation keeps every bit in the bounded
state. OMI maintains a bounded rotating state before it projects numbers.

```text
OMI does not count first.
OMI rotates first.
Counting is a projection of replay.
```

## Structural Control Planes

OMI interprets the four separator controls as structural planes:

| Byte | Plane |
|------|-------|
| `0x1C` FS | file / world boundary |
| `0x1D` GS | group boundary / kernel constant source |
| `0x1E` RS | record boundary |
| `0x1F` US | unit boundary |

Containment hierarchy:

```text
FS contains GS contains RS contains US
```

These are pre-OS structural planes. A filesystem can be projected from them,
but filenames, folders, and OS paths are not primitive.

## Digit Band

The digit band is:

```text
0x30..0x3F = 0 1 2 3 4 5 6 7 8 9 : ; < = > ?
```

It is the first visible codomain of measurement.

```text
A digit is a canonical measurement output.
Its meaning is selected by the active projection regime.
```

Example readings:

| Output | Projection regime | Meaning |
|--------|-------------------|---------|
| `3` | topology | triangle / 2-simplex class |
| `3` | position | coefficient 3 |
| `3` | precision | resolution level 3 |
| `3` | geometry | boundary / interior class 3 |

## ESC As Projection Gate

In OMI:

```text
ESC gates or selects a projection regime.
```

ESC does not create truth.

```text
canonical bytes remain unchanged
projection regime changes
visible interpretation changes
```

ESC changes the lens, not the underlying structure.

## Witness Surfaces

Stars-and-bars style unary surfaces are witness forms, not the kernel.

```text
kernel replay      = truth motion
structural planes  = scope
stars-and-bars     = unary witness surface
digits             = measured output
text/graphics      = later projection
```

Stars-and-bars is the unary witness form of measured structure.

## Sexagesimal Fractions

A sexagesimal fraction is not a float. It is a rooted logical term over powers
of 60, with numerator, denominator, convergence class, expansion digits, and
optional repeating cycle.

```text
fraction term = truth
Unicode glyph = projection
float value = optional approximation
```

Unicode renders a fraction term. It does not define or modify the fraction.

Precision is not stored first as a float. Precision is derived from position in
a rooted term:

```text
degree = 60^0
prime  = 60^-1
second = 60^-2
third  = 60^-3
fourth = 60^-4
```

## Inverse-Square Precision Projection

Inverse-square precision is a projection law, not the kernel itself.

```text
precision(depth) = 1 / (1 + depth)^2
```

This gives:

```text
depth 0 -> 1
depth 1 -> 1/4
depth 2 -> 1/9
depth 3 -> 1/16
depth 4 -> 1/25
```

Near structure receives high precision. Far structure receives lower precision.
Visibility decays with structural distance.

## Golomb-Coded Precision

Golomb coding does not create precision. Golomb coding serializes the precision
distribution.

Hierarchy:

```text
CONS / byte structure
  -> depth
  -> inverse-square precision projection
  -> positive integer bucket
  -> Golomb-coded stream
```

Golomb coding is useful because non-uniform positive integer distributions can
be represented compactly as quotient/remainder codes.

## Universal Logic Clock

A universal logic clock is a deterministic replay clock, not physical time.

```text
same law + same seed + same tick = same state
```

OMI synchronizes by phase agreement, not by wall-clock agreement.

Major periods:

| Period | Role |
|--------|------|
| `7` | Fano incidence / chirality |
| `8` | kernel cadence |
| `60` | sonar sweep |
| `120` | sync unit |
| `240` | sub-cycle / projective subdivision |
| `360` | rotational goal closure |
| `5040` | master replay closure |

```text
5040 = LCM(7, 8, 60, 240, 360) = 7!
```

## Decentralized Synchronization

Do not share state. Share the law, seed, width, constant, tick, and projection.

Minimal synchronization packet:

```text
law_id
width
constant_id
seed
tick
projection_regime
optional receipt
```

Each peer computes:

```text
state = replay(law, seed, tick)
output = project(state, projection_regime)
```

If output hashes match, the peers agree.

## Foundational Test

A structure is foundational only if removing it changes canonical output.

Foundational:

```text
canonical bytes
delta law
replay
structural planes
projection rules
address / witness invariants
```

Derived:

```text
text
Unicode
fractions as glyphs
SVG
Aztec
geometry
OS behavior
UI
documents
```

If removing a thing does not change canonical replay, it is projection.

## What OMI Is Not

OMI is not primarily:

```text
a Lisp
a filesystem
a UI
a geometry engine
a barcode system
a float system
an operating system
a terminal protocol
```

Those can be projected from it. They are not the root.

## What OMI Is

OMI is:

```text
a pre-OS canonical measurement machine
a deterministic byte replay system
a structural projection framework
a logical clock for decentralized synchronization
a typed algebra over bits, bytes, clocks, addresses, witnesses, and projections
```

Short form:

```text
OMI is a machine for turning hidden deterministic byte structure
into visible, reproducible measurements.
```

## Clean Root Specification

```text
OMI_PRE_OS_CANONICAL_MEASUREMENT_LAW

1. Bytes are canonical.
2. Replay is deterministic.
3. Structure exists before text.
4. Measurement exists before numbers.
5. Digits are the first visible measurement outputs.
6. Numbers are interpretations of digit outputs under a projection regime.
7. Fractions are rooted logical terms, not floats.
8. Unicode glyphs are rendering projections, not truth.
9. Clocks are deterministic phase functions, not wall-clock dependencies.
10. No projection may modify canonical byte structure.
```

## Formal Core

Let:

```text
B  = finite byte sequence
K  = deterministic kernel transition law
R  = replay function
S  = structural interpretation of replayed bytes
Pi = set of projection functions
D  = digit output band 0x30..0x3F
```

Then:

```text
R(K, seed, tick) -> state
S(state) -> structure
pi(structure) -> output
```

For digit projection:

```text
pi_D : Structure -> D
```

For positional projection:

```text
pi_P : Structure -> N
```

For sexagesimal projection:

```text
pi_60 : Structure -> SexagesimalFractionTerm
```

For rendering:

```text
pi_U : SexagesimalFractionTerm -> UnicodeCodepoint
```

Authority rule:

```text
pi never modifies Structure
```

Replay rule:

```text
same K, seed, tick -> same state
```

## ASCII Role Table

| Range | OMI role |
|-------|----------|
| `0x00` | null / absence / packet or structural zero context |
| `0x1B` | ESC / projection gate |
| `0x1C` | FS / file-world structural plane |
| `0x1D` | GS / group structural plane / kernel constant source |
| `0x1E` | RS / record structural plane |
| `0x1F` | US / unit structural plane |
| `0x20..0x2F` | operator and measurement lens band |
| `0x30..0x3F` | digit and boundary measurement output band |
| `0x40..0x7F` | optional alphabetic / user-space projection band |

`0x40..0x7F` is not required for the machine to begin measuring.

## Measurement Chain

```text
hidden bytes
  -> deterministic replay
  -> structural planes
  -> projection lens
  -> digit output
  -> optional numeric interpretation
  -> optional textual interpretation
  -> optional OS object
```

Examples:

```text
control structure -> topology lens -> '3' -> triangle class
control structure -> positional lens -> '3' -> coefficient 3
sexagesimal term -> Unicode projection -> 1/7 glyph -> rendered glyph
```

The glyph is not the truth. The term is the truth.

## Correct Language

Avoid:

```text
Digits are numbers.
Fractions are floats.
Unicode defines the fraction.
The OS owns structure.
```

Use:

```text
Digits are canonical visible outputs that may be interpreted numerically.
Fractions are rooted logical terms over powers of 60.
Unicode renders a fraction term.
The OS is a projection over pre-OS structure.
```

## Final Statement

OMI is a pre-OS canonical measurement machine.

It begins below text, files, processes, users, and operating systems. Its
primitive truth is not an alphabet and not a number system. Its primitive truth
is deterministic byte-level structure replayed by a bitwise kernel.

Bytes are canonical. Replay is deterministic. Everything visible is derived by
projection.

Canonical bytes are truth. Replay is motion. Structure is lawful
interpretation. Projection is measurement. Digits are visible outputs. Numbers,
glyphs, files, geometry, and operating systems are later interpretations.

No projection may modify canonical byte structure.

This is the pre-OS inversion: the operating system is not the source of
structure. The operating system is a projection over structure that already
exists.

## Codex-Safe Summary

```text
OMI_PRE_OS_LAW:

Bytes are canonical.
Replay is deterministic.
Control bytes define hidden structure.
ESC gates projection regimes.
Operators measure structure.
Digits are the first visible measurement outputs.
Numbers are projection-specific interpretations of digits.
Fractions are rooted sexagesimal terms, not floats.
Unicode glyphs are rendering projections, not truth.
Clocks are deterministic phase functions, not wall-clock dependencies.
No projection may modify canonical byte structure.
```

## One-Sentence Version

OMI is a pre-OS measurement machine where deterministic byte replay produces
hidden structure, projection lenses measure that structure, and digits are the
first visible outputs from which numbers, text, fractions, geometry, and OS
behavior may later be derived.
