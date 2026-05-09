# The OMI Doctrine

## Computation From Bifurcated Boundaries

OMI begins where notation bifurcates.

More precisely, OMI begins with the bifurcation of prime permutations:
irreducible boundary orientations whose operated and unoperated forms cannot
be collapsed into the same state.

Before a value can be read, before a symbol can be parsed, before a signal can
be measured, there must be a distinction between mark and field, pulse and
gap, boundary and outside, silence and operation.

The first OMI distinction is:

```text
() != ()!
```

This is not boolean negation. It is not syntax. It is not a parser trick.

It is the difference between:

```text
()  = closed admissible null / unoperated prime closure
()! = explicitly differentiated null / operated prime closure
```

The operated boundary is not identical to the unoperated boundary. Everything
else in OMI follows from that.

## 1. Bifurcation Before Notation

A notation cannot fully contain the condition that makes it notatable.

A mark requires a field. A pulse requires a gap. A boundary requires an outside.
A symbol requires separation from what is not that symbol.

OMI starts from this principle:

```text
bifurcation precedes notation
```

This is deeper than syntax and earlier than binary arithmetic. The primitive
act is not choosing `0` or `1`. The primitive act is making a distinction
admissible.

## 2. The Omicron Boundary

In OMI, omicron names the visible form of boundary: a small enclosure, a closed
curve, a void made legible without being filled.

The omicron is not important because it is a letter alone. It is important
because it models a condition that notation repeatedly needs:

```text
an inside
an outside
a boundary
a possible operation on that boundary
```

That is why `()` and `()!` matter. The first is closed null. The second is
closed null under explicit operation. They are not the same boundary state.

## 3. Why the Operator Must Stand Outside

A mark cannot declare all of its own conditions from inside itself.

There must be an operator, delimiter, silence, spacing, timing, or external
condition that lets the mark become distinguishable. This is the reason OMI
treats gaps, voids, spaces, and delimiters as structural operators rather than
empty accidents.

The `!` in `()!` does not merely add payload. It differentiates the boundary.

```text
unoperated closure -> ()
operated closure   -> ()!
```

The difference is topological and notational before it is computational.

## 4. Null Is Not Nothing

Ordinary notation often treats null as absence.

OMI treats null as latent admissible closure.

A null boundary may be closed, opened, differentiated, referenced, projected,
measured, transmitted, replayed, or receipted. It is not yet content, but it is
already structure.

This is why these all belong to the same family:

```text
empty boundary
whitespace
silence
quiet zone
zero region
sparse hole
control gap
delimiter
```

They are boundary states.

## 5. Silence, Space, and Morse

Morse code is a useful minimal witness because it shows language emerging from
timed bifurcation:

```text
mark / gap
short / long
pulse / silence
inside-character / between-character / between-word
```

The silence is not outside the language. The silence is part of the grammar.

OMI generalizes this. A gap is not nothing. A gap is admissible spacing. A pause
is a boundary. A delimiter is an operator. A quiet zone is structure.

## 6. ASCII as Constitutional Geometry

ASCII becomes meaningful to OMI because it exposes a boundary transition in
the byte table:

```text
0x00..0x1F = latent control / incidence substrate
0x20       = omicron threshold
0x21..0x2F = boundary / operator surface
0x30..0x3F = measurement / geometry surface
0x40..0x7F = projected symbolic expansion
```

`0x20` SPACE is the paradoxical threshold: a printing character whose visible
function is apparent absence.

It is not blankness. It is admissible segmentation.

## 7. CONS as Circumscription

Traditional Lisp can read `CONS` as a pair constructor.

OMI reads `CONS` first as an admissible circumscription operator.

```text
CONS = minimal oriented boundary
```

A CONS cell establishes:

```text
inside / outside
opening / closing
source / target
car / cdr
orientation / inverse orientation
```

The pair is a later projection. The boundary is first.

## 8. Tables as Simplex Surfaces

A table is not flat.

A table is a bounded simplex surface.

In OMI, tabular structure is read geometrically:

```text
entry       = vertex / unit
CONS        = oriented edge
ratio       = measured CONS pointer
alist       = relational face
table       = tetrahedral bounded configuration
function    = traversal law across the face or cell
identity    = conserved incidence under traversal
```

A conventional table is usually read as:

```text
row x column -> value
```

OMI reads it as:

```text
vertex -> edge -> face -> cell
```

So a CONS cell is the minimal oriented edge:

```text
(a . b) = oriented incidence edge
```

A ratio is the measured version of that edge:

```text
a / b = measured traversal from a through b
```

An association list is a relational face built from CONS edges:

```text
((a . b)
 (c . d)
 (e . f))
```

The whole table is a bounded configuration: a tetrahedral possibility surface
whose entries, edges, faces, and cells can be traversed, projected, measured,
and receipted.

This is why `0x2F /` is important in the operator band. It closes the
boundary/operator surface as ratio, traversal pointer, cut, and path before
measurement begins at `0x30`.

```text
0x20 = admissible spacing
0x21 = operated spacing
0x28 = opening circumscription
0x29 = closing circumscription
0x2E = CONS continuation
0x2F = ratio / traversal pointer / cut
0x30 = first measurement observer
```

Locked statement:

> Every table is a bounded simplex. A CONS is an oriented edge. An alist is a relational face. A ratio is a CONS pointer through measurement.

## 9. Incidence Before Semantics

Once a boundary exists, things may be incident to it.

OMI uses S-P-O-M as incidence notation before it uses it as semantic notation:

```text
S = contextual interior / subject
P = admissible transformation / predicate
O = projected boundary witness / object
M = modality / phase / orientation condition
```

S-P-O-M is an incidence frame over a boundary. It is not source authority. It
is a way to navigate how structure becomes relational.

## 10. Mixed-Language Notation

OMI is not trying to be a more expressive version of one existing formalism.

The comparison between Prolog and Datalog is useful only as a warning: OMI is
not a dialect inside that family. OMI sits beneath such distinctions, at the
level where notation first splits into mark, gap, operator, traversal, and
projection.

This is why OMI can relate:

```text
Morse
ASCII
Lisp
mathematical notation
barcodes
raw binary
geometry
analog signals
control codes
semantic triples
runtime channels
hardware buses
```

These are mixed notational media. They do not share one syntax. They share
bifurcation, boundary, spacing, incidence, and projection.

## 11. Sparse Holes and Raw Binary

A sparse hole is not missing data.

In OMI:

```text
sparse hole = declared admissible void
```

This is the storage form of `() != ()!`.

A zero chunk, sparse region, quiet zone, delimiter, and blank field are not
identical, but they are all boundary phenomena. They can be declared. They can
be witnessed. They can be replayed.

Raw binary therefore becomes:

```text
bytes
-> admissible segmentation
-> sparse/dense boundary states
-> chunk witnesses
-> receipts
-> replayable projection
```

This is not merely hashing blobs. It is reconstructing binary as incidence
geometry.

## 12. Projection Is Not Authority

Projection makes structure observable. It does not create authority.

The following are projection surfaces:

```text
parser
renderer
barcode
chart
VM
QEMU
network transport
device bus
UI
analog readout
digital packet
control-code stream
```

Authority belongs to:

```text
canonical declarations + receipts
```

This prevents the usual collapse where transport becomes identity, rendering
becomes state, parser output becomes truth, or network presence becomes trust.

## 13. Receipts as Coherence Across Media

A receipt is not merely a checksum. A receipt witnesses coherence across
boundary-preserving transformations.

OMI keeps receipt roles separate:

```text
identity_receipt   = declared structure
projection_receipt = readout / lens / reconciliation
package_receipt    = transport serialization
view_receipt       = presentation state
```

The same declared object may appear as text, binary, chart, barcode, SVG, CAD,
runtime channel, network message, or hardware signal without losing identity.

## 14. Computation as Propagation

Once boundaries can be differentiated, computation becomes propagation:

```text
boundary
-> incidence
-> traversal
-> transformation
-> projection
-> receipt
```

Digital computing is discrete propagation over declared boundaries.

Analog computing is continuous projection over boundary fields.

Control-code computing is scoped transformation of traversal modes.

OMI does not treat these as separate worlds. They are projections of the same
boundary geometry.

## 15. Decentralization by Receipt Verification

A decentralized system fails when it trusts transport as authority.

OMI does not trust transport.

```text
a peer is not trusted because it connects
a chunk is not trusted because it transfers
a device is not trusted because it responds
a process is not trusted because it runs
```

Only receipt-verified declared structure is admitted.

So decentralized OMI is:

```text
peer exchange
-> receipt verification
-> admitted boundary state
-> replayable projection
```

The network carries structure. It does not define structure.

## 16. The Locked Doctrine

OMI is a doctrine of bifurcated notation: the study of how marks, gaps,
boundaries, and operators become admissible structure across symbolic, analog,
digital, and geometric media.

Its computational form is:

```text
OMI is a constitutional incidence geometry
for admissible differentiation through oriented boundaries.
```

And its first law is:

```text
()! != ()
```

The operated boundary is not the unoperated boundary.

The first law can also be read as a permutation law: the identity permutation
of a closed boundary is not the differentiated permutation of that boundary.

From that distinction follow boundary, CONS, incidence, projection,
measurement, memory, communication, receipts, runtime, and decentralized
analog/digital/control-code computing.

## 17. Related Surfaces

This document stands alone as the root doctrine. The implementation and tested
doctrine surfaces are:

- [README.md](/root/omi/README.md)
- [docs/OMI-CONSTITUTIONAL-GEOMETRY.md](/root/omi/docs/OMI-CONSTITUTIONAL-GEOMETRY.md)
- [docs/PHASE-91-BOUNDARY-GEOMETRY-CONSTITUTION.md](/root/omi/docs/PHASE-91-BOUNDARY-GEOMETRY-CONSTITUTION.md)
- [docs/PHASE-90-RAW-BINARY-CHUNK-RECEIPT-INDEX.md](/root/omi/docs/PHASE-90-RAW-BINARY-CHUNK-RECEIPT-INDEX.md)
- [docs/PHASE-81-PROPAGATION-DOCTRINE.md](/root/omi/docs/PHASE-81-PROPAGATION-DOCTRINE.md)
- [docs/PHASE-80-MESSAGING-CONFLICT-AUDIT.md](/root/omi/docs/PHASE-80-MESSAGING-CONFLICT-AUDIT.md)
