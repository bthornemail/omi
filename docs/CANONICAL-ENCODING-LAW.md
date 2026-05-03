# OMI Canonical Encoding Law

## 1. Primitive Objects

Let `C` be the set of CONS cells. A CONS cell is an ordered pair `(a, b)` where
`a` and `b` are either atoms or CONS cells.

Let:

```text
Sigma = {0x00, 0x01, ..., 0x7F}
```

be the set of ASCII bytes.

Let `S` be the set of structural bytes:

| Byte/range | Role |
|------------|------|
| `0x00` NUL | empty structure |
| `0x1B` ESC | projection gate selector |
| `0x1C..0x1F` | projection axes: FS, GS, RS, US |

Let `O` be the set of operator bytes:

```text
O = {0x20..0x2F}
```

Let `D` be the digit/measurement codomain:

```text
D = {0x30..0x3F}
```

Let `A` be the optional alphabet/user-space projection band:

```text
A = {0x40..0x7F}
```

## 2. Projection Functions

A projection is a function:

```text
pi : C -> Sigma
```

that maps a CONS structure to a byte.

Required laws:

```text
determinism: same c in C -> same pi(c)
non-causality: pi(c) does not modify c
```

Projection functions observe CONS structure. They do not feed `ESC`, `Gamma`, or
`GAUGE_APPLY`.

## 2.1 Digit Projection

Let:

```text
pi_D : C -> D
```

be defined by a topological invariant of `c`.

| CONS structure | Output |
|----------------|--------|
| no CONS edges / empty closure | `0x30` (`0`) |
| 1 CONS edge / primitive edge | `0x31` (`1`) |
| 2 CONS edges in a chain | `0x32` (`2`) |
| triangle / 3-cycle | `0x33` (`3`) |
| tetrahedron / 3-simplex | `0x34` (`4`) |
| 5-cell / 4-simplex | `0x35` (`5`) |
| 5-simplex | `0x36` (`6`) |
| 6-simplex | `0x37` (`7`) |
| 7-simplex | `0x38` (`8`) |
| 8-simplex / 9-vertex enneazetton | `0x39` (`9`) |

Boundary bytes `0x3A..0x3F` refine the projection:

| Byte | Role |
|------|------|
| `:` (`0x3A`) | project interior / n-ball |
| `;` (`0x3B`) | project boundary / n-sphere |
| `<` (`0x3C`) | inward boundary |
| `=` (`0x3D`) | identification |
| `>` (`0x3E`) | outward boundary |
| `?` (`0x3F`) | query / unresolved |

Digits are canonical invariants of CONS structure. They are not primitive
numbers.

## 2.2 Positional Projection

The positional projection is optional and user-defined:

```text
pi_P : C -> N
pi_P(c) = sum((pi_D(child_i) - 0x30) * b^i)
```

where `b` is a chosen base and `i` is depth or position in the CONS tree.

This projection may read digit outputs as coefficients, but that numeric
meaning is not a kernel primitive.

## 2.3 Sexagesimal Projection

The sexagesimal projection is optional and user-defined:

```text
pi_S : C -> Unicode fraction
```

For a pair `c = (left, right)`, let:

```text
n = pi_P(left)
d = pi_P(right)
```

The projection may compute the sexagesimal expansion of `n / d` and return a
Unicode fraction code point, such as a code point in the range
`U+2150..U+218B`.

This is a rendering projection, not execution authority.

## 2.4 Bitwise Projection

Let:

```text
pi_B : C -> Word8
```

be a bitwise projection over CONS structure. The implemented delta law is:

```text
pi_B(c) =
    ROTL(pi_B(left(c)), 1)
    XOR ROTL(pi_B(left(c)), 3)
    XOR ROTR(pi_B(left(c)), 2)
    XOR GS
```

where:

```text
GS = 0x1D
```

This law is bitwise-only. It uses rotation and XOR over an 8-bit word. It does
not make higher projections causal. The canonical `.omi` surface is
`kernel/bitwise_kernel.omi`; the C implementation is
`kernel/runtime/bitwise_kernel.c`.

## 3. Timing Resolution Layers

The named timing periods are field-resolution partitions over one master replay
surface. They are not separate clock authorities.

```text
5040 = master blackboard resolution
360  = global state resolution
240  = public canvas-frame resolution
60   = private/local point-sweep resolution
8    = source/target byte-pair cadence
7    = incidence selector / consolidation law
```

The master period is:

```text
LCM(7, 8, 60, 240, 360) = 5040 = 7!
```

The `7 x 8` interaction resolves source-target relations into stable state. A
5040 master blackboard contains 90 full `7 x 8` source-target consolidation
cycles.

## 3.1 Unary Rotation Mechanics

A clock is a finite set of bits:

```text
{b_0, b_1, ..., b_(n-1)}
```

with exactly one bit set to `1` at any time.

The clock ticks by rotating the set bit:

```text
tick(b_i) = b_((i + 1) mod n)
```

Runtime representation is unary rotation. No counter state is required.

Each rotation ring implements one resolution layer; it does not create an
independent authority over replay.

### 3.2 Fano Incidence Selector

```text
F = {f_0, f_1, f_2, f_3, f_4, f_5, f_6}
tick(F) = ROTL7(F, 1)
```

The active bit selects the current Fano triplet. This is the incidence selector
and consolidation law.

### 3.3 Sonar Point Sweep

```text
S = {s_0, s_1, ..., s_59}
tick(S) = ROTL60(S, 1)
```

The active bit determines the private/local point-sweep channel and lane.

### 3.4 Master Blackboard

The system reaches master closure when all timing partitions return to shared
phase:

```text
LCM(7, 60, 8, 240, 360) = 5040 = 7!
```

At tick `0`, all timing rings are at bit `0`.

## 4. Kernel Execution

The bitwise kernel state is an 8-bit word `K`.

One tick:

```text
K' = ROTL(K, 1) XOR ROTL(K, 3) XOR ROTR(K, 2) XOR GS
K  = K' & 0xFF
tick F
tick S
```

Kernel execution for this law is bitwise-only:

```text
AND, OR, XOR, NOT, SHIFT, ROT
```

No division and no higher projection is required in the bitwise kernel execution
path.

## 5. Projection Hierarchy

```text
CONS structure (C)
    -> pi_B, kernel/bitwise projection
Word8 state
    -> pi_D, digit/topology projection
0x30..0x3F
    -> pi_P, optional positional projection
Natural number
    -> pi_S, optional sexagesimal projection
Unicode fraction
    -> pi_A, optional alphabet/user-space projection
Alphabet / rendering
```

Lower projections are foundation. Higher projections are optional and
non-causal.

## 6. Invariants

1. Determinism: if `c1 = c2`, then `pi(c1) = pi(c2)` for every projection `pi`.
2. Non-causality: projection does not modify the CONS structure it observes.
3. Bitwise closure: kernel execution uses bitwise operations only.
4. Timing purity: timing periods are resolution layers implemented by unary
   rotation rings, not counters or independent clock authorities.
5. Projection separation: higher projections cannot affect lower projections.
6. Runtime boundary: projection output never feeds `Gamma` or `GAUGE_APPLY`.

## One-Line Summary

OMI is a CONS algebra with deterministic, non-causal projections. Digits
`0x30..0x3F` are canonical invariants of CONS structure. Timing periods are
field-resolution partitions over one master replay surface and are implemented
as unary rotation rings. Phase 28 bitwise kernel execution is implemented as
rotation/XOR/AND/NOT. Positional encoding, sexagesimal fractions, and alphabet
rendering are optional user projections.
