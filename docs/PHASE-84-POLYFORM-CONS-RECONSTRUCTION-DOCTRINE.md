# Phase 84 - Polyform CONS Reconstruction Doctrine

Phase 84 records polyforms as derived geometry over OMI-CONS incidence chains.

## Core Rule

A polyform is a metric witness of an admissible CONS chain.

This is derived geometry, not a constitutional axiom. It explains how an
admissible continuation structure can be reconstructed as a square, triangular,
hexagonal, layered, or cubical metric carrier.

## Canonical Declaration

The canonical declaration surface is:

```text
declarations/polyform-cons-reconstruction.omilisp
```

It is parsed by the Phase 75 OMI-Lisp reader and triangulated by the Phase 76
S-P-O-M adapter. The declaration is authoritative for this doctrine surface,
but it does not create new runtime behavior.

## Reconstruction Ladder

```text
CONS chain
-> unary admissible continuation
-> spliced incidence chain
-> reconstructed metric carrier
-> polyform / diagram / CAD object
```

## Basis Families

- `polyomino`: square-cell 2D reconstruction
- `polyiamond`: triangular-cell 2D reconstruction
- `polyhex`: hexagonal-cell 2D reconstruction
- `layered-polyomino`: z-indexed 2.5D reconstruction
- `shadow-polycube`: projected 2.5D cube-shadow reconstruction
- `polycube`: voxel/cell-complex 3D reconstruction

## Authority Boundary

Polyforms are not arbitrary shapes. They are metric reconstructions of declared
incidence.

The authority chain remains:

```text
declared CONS incidence
-> metric reconstruction
-> projection surface
```

SVG, CAD, diagrams, and world objects are projection surfaces. They witness the
metric reconstruction, but they do not replace the declared incidence chain.

## Locked Statement

> Polyforms are not arbitrary shapes; they are metric reconstructions of
> admissible CONS incidence chains.
