# OMI Fundamental Geometry Runtime

## Root Claim

OMI is a pre-OS canonical measurement machine and fundamental geometry runtime.

It does not begin with files, text, meshes, images, operating systems, or
AI-generated scenes. It begins with:

```text
canonical bytes
deterministic replay
field timing
structural projection
resolution-gated rendering
```

The root law is:

```text
Bytes are canonical.
Replay is deterministic.
Everything visible is derived by projection.
```

OMI does not store worlds as finished objects. OMI stores replayable causes from
which worlds are projected.

## Authority And Projection

```text
authority  = canonical replay state
projection = a view of that state
rendering  = a visible projection of a view
```

A projection may display, compress, encode, scan, or render the state. A
projection may not modify the state.

```text
No projection is causal.
No renderer is authority.
No barcode is authority.
No mesh is authority.
No AI output is authority.
```

The world is not the render. The render is a projection of replay.

## Quotient Test

A component is foundational only if removing it changes canonical output.
Otherwise it is derived or projected.

```text
foundational:
  delta law
  replay
  FS/GS/RS/US structural access
  timing partitions
  projection rules
  verification receipts

derived:
  numbers
  glyphs
  sexagesimal fractions
  barcodes
  SVG
  meshes
  AI textures
  UI
  OS behavior
```

The foundation is what cannot be removed without changing replay.

## Kernel Law

The kernel is a bounded bitwise transition law. It uses rotation, XOR, masking,
and a fixed constant. It does not use floating point, geometry, or user-space
interpretation.

```text
Delta(x, n) =
  mask(n,
       rotl(x, 1, n)
     XOR rotl(x, 3, n)
     XOR rotr(x, 2, n)
     XOR Cn)
```

The normalized kernel statement is:

```text
The kernel does not draw.
The kernel does not know objects.
The kernel produces deterministic state.
Everything else is a projection of that deterministic state.
```

## Structural Plane Law

OMI uses the structural control band as pre-OS organization:

| Byte | Plane | Runtime role |
|------|-------|--------------|
| `0x1C` | FS | file / world / artifact / scene-object boundary |
| `0x1D` | GS | group / subsystem boundary |
| `0x1E` | RS | record / relation boundary |
| `0x1F` | US | unit property / local fact boundary |

The containment order is:

```text
FS contains GS contains RS contains US
```

For a world runtime:

```text
FS = world / artifact / scene object
GS = major group / subsystem
RS = part record / relation record
US = unit property / parameter / local fact
```

## OMI-LISP Trace Surface

OMI-LISP is a normal-form a-list trace language over canonical structure. It is
not primarily a mesh format, a conventional programming language, or a logic
engine replacement.

```lisp
((FS . trailer)
  ((GS . motion)
    ((RS . wheel.left)
      ((US . primitive) . circle)
      ((US . function)  . rolling-support))))
```

The wheel is not merely geometry. The wheel is a structural part with form and
function. The same trace can support rendering, logic, repair, recognition,
barcode encoding, and AI augmentation.

## Timing As Resolution

The timing periods are field-resolution partitions over one master replay
surface. They are not separate clock authorities.

```text
5040 = master blackboard resolution
360  = global state resolution
240  = public canvas-frame resolution
60   = private/local point-sweep resolution
8    = source/target byte-pair cadence
7    = incidence selector / consolidation law
```

The one-line law is:

```text
5040 is the blackboard.
360 is the global state.
240 is the public canvas.
60 is the private point sweep.
8 carries source-target cadence.
7 resolves incidence into state.
```

## Blackboard Closure

`5040` is the full replay closure. It is the master surface where all
field-resolution partitions return to shared phase.

```text
5040 / 360 = 14
5040 / 240 = 21
5040 / 60  = 84
5040 / 8   = 630
5040 / 7   = 720
```

Two machines do not need the same OS clock. They need:

```text
same law
same seed
same tick
same projection
```

Then they can reconstruct the same field state.

## Resolution Layers

`360` is the global orientation / goal-cycle resolution. It represents the
whole-world phase, not necessarily circular geometry.

`240` is the public projective canvas. A 5040 blackboard cycle contains 21
public canvas frames. The public canvas exposes the stable shared witness frame,
not the whole private state.

`60` is the private/local point sweep. The clean organization is:

```text
60 = 4 channels x 15 lanes
```

The four channels map to FS/GS/RS/US, and the 15 lanes are non-null local
lanes. A 60-point local sweep can project into SVG, polyform boundaries, or mesh
approximations.

`8 x 5 x 2` is not equal to 60. It is the relation grammar:

```text
60      = private geometric sweep
8 x 5 x 2 = relation possibility space
```

The 60-point SVG is projected through the `8 x 5 x 2` relation grammar; it is
not arithmetically identical to that grammar.

## Source/Target Consolidation

`8` is the byte-depth source/target cadence. `7` is the Fano incidence selector.

```text
8 proposes source-target cadence.
7 selects incidence.
7 x 8 = 56 local consolidation cycle.
5040 / 56 = 90.
```

One master blackboard contains 90 full source-target consolidation cycles.

## Resolution-Gated Rendering

The renderer unfolds only the structural depth required by the current
resolution.

```text
far distance:
  FS only

medium distance:
  FS + GS

near distance:
  FS + GS + RS

inspection:
  FS + GS + RS + US

full audit:
  FS + GS + RS + US + witness/barcode/proof
```

Haze is unresolved structural depth at the current renderer resolution, not
missing truth. Far objects are lower-depth projections. Near objects reveal
deeper FS/GS/RS/US records.

## Infinite World Platform

The infinite world does not require storing infinite geometry. It requires
finite seeds plus replayable expansion laws.

```text
world tile
-> OMI-LISP trace
-> timing partition
-> resolution-gated projection
-> polyform render
-> barcode receipt
-> optional AI / WordNet / Prolog augmentation
```

The minimal world object is:

```text
law_id
seed
tick
FS root
projection regime
polyform basis
semantic option set
carrier receipt
```

Everything else unfolds.

## Optional Semantic Layers

WordNet and Prolog/Datalog are optional projection helpers, not authority.

```text
OMI trace first.
Logic constraints second.
Semantic options third.
AI augmentation last.
```

AI may propose projections. AI may not define canonical structure.

If AI changes part logic, relation count, or structural identity, it is no
longer augmentation. It is a different proposed trace that must be checked.

## Carrier And Witness Surfaces

Barcode carriers are scannable projection frames. They are receipts or
transport surfaces, not the object and not the truth.

```text
Aztec   = object / vertex / root carrier
Maxi    = material / logistics / texture profile carrier
BeeCode = query / rule / constraint carrier
Code16K = stacked OMI-LISP trace continuation
```

Braille and Aegean were earlier witness surfaces for object pointers and
pairwise notation. They remain valid object-pointer witnesses, but they are no
longer object authority.

```text
authority:
  OMI fundamental geometry runtime

witness surfaces:
  Braille
  Aegean
  hexagram
  stars-and-bars
  barcode
  SVG
  mesh
```

## Sexagesimal Precision

Sexagesimal precision is not more decimal places. It is position in a rooted
term over powers of 60. The fraction term is truth; Unicode glyphs are
rendering; floating point is an optional approximation.

This matches the resolution model:

```text
5040 = full blackboard precision
360  = global precision
240  = public canvas precision
60   = private point precision
US   = unit property precision
```

## Example: Ebike Trailer

```lisp
((FS . trailer.ebike.cargo)
  ((GS . form)
    ((RS . body)
      ((US . primitive) . rectangular-container)
      ((US . function)  . cargo-volume)))

  ((GS . motion)
    ((RS . wheel.left)
      ((US . primitive) . circle)
      ((US . function)  . rolling-support))
    ((RS . wheel.right)
      ((US . primitive) . circle)
      ((US . function)  . rolling-support))
    ((RS . tow-arm)
      ((US . primitive) . bent-line)
      ((US . function)  . bicycle-coupling)))

  ((GS . render)
    ((RS . far)
      ((US . depth) . FS.GS)
      ((US . output) . box.two-wheels.tow-arm))
    ((RS . near)
      ((US . depth) . FS.GS.RS.US)
      ((US . output) . panels.rails.latches.reflectors.hinges))))
```

The same trace supports rendering, logic, repair, recognition, barcode
encoding, and AI augmentation.

## Resolution Law

1. Bytes are canonical.
2. Replay is deterministic.
3. The kernel produces state; it does not render.
4. FS/GS/RS/US define structural access.
5. Timing periods define field-resolution partitions.
6. `5040` is the master blackboard resolution.
7. `360` is the global state resolution.
8. `240` is the public canvas-frame resolution.
9. `60` is the private/local point-sweep resolution.
10. `8` is the source-target byte cadence.
11. `7` is the Fano incidence selector.
12. `7 x 8` gives local relation consolidation.
13. `5040` contains 90 full `7 x 8` consolidation cycles.
14. Render resolution determines how deep the FS/GS/RS/US trie is unfolded.
15. Haze is unresolved structural depth, not missing truth.
16. Mesh, SVG, barcode, Unicode, Braille, Aegean, and AI output are
    projections.
17. No projection may mutate canonical replay state.

## First-Principles Pipeline

```text
canonical bytes
-> deterministic bitwise replay
-> timing phase
-> FS/GS/RS/US structure
-> OMI-LISP a-list trace
-> relation consolidation by 7 x 8
-> 60-point local sweep
-> 240-frame public canvas
-> 360 global orientation
-> 5040 blackboard closure
-> barcode / SVG / mesh / AI projection
```

## Locked Statement

OMI is a pre-OS canonical measurement machine and fundamental geometry runtime.

Its authority is deterministic byte replay. Its structure is addressed through
FS/GS/RS/US. Its timing periods are field-resolution partitions.

`5040` is the master blackboard resolution. `360` is the global state
resolution. `240` is the public canvas-frame resolution. `60` is the
private/local point-sweep resolution. `8` is the source-target byte cadence.
`7` is the Fano incidence selector.

The renderer unfolds only the structural depth required by the current
resolution. Far objects are not unknown; they are lower-depth projections. Near
objects reveal deeper FS/GS/RS/US records. Meshes, SVG, barcodes, Braille,
Aegean, Unicode, WordNet, Prolog, and AI output are projections over the same
canonical trace.

The infinite world is not stored as finished geometry. It is replayed,
unfolded, and projected from canonical OMI-LISP traces.
