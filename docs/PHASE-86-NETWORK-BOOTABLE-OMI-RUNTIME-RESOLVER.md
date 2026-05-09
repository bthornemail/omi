# Phase 86 - Network-Bootable OMI Runtime Resolver

Phase 86 defines the booted resolver lattice as doctrine and canonical
declaration. It does not implement live networking, consensus, or mounted
devices.

## Core Rule

The runtime lattice is mutable and local; the declaration lattice remains
canonical and replayable.

## Canonical Declaration

```text
declarations/network-bootable-runtime-resolver.omilisp
```

## Runtime Layers

```text
Layer 0: boot carrier
  raw image
  PXE/QEMU/TCG carrier

Layer 1: declaration authority
  declaration resolver
  receipt verifier

Layer 2: propagation lattice
  FIFOs
  pipes
  sockets
  process edges

Layer 3: projection workers
  renderers
  adapters
  repo bridges
  package exporters

Layer 4: workbook surfaces
  UI
  canvas
  Org/Emacs
  Electron/Firefox
  JSON Canvas
```

## POSIX Channel Mapping

```text
FIFO    = declared propagation edge
process = local resolver/projection node
pipe    = admissible traversal path
socket  = routable propagation surface
receipt = coherence witness
```

## Authority Boundary

```text
boot image != authority
runtime node != authority
POSIX channel != ontology
network peer != authority

canonical declarations + receipts = authority
```

## Replay Constraint

```text
runtime mutation
-> emits receipts
-> reconstructible from canonical declarations + receipts
```

All runtime channels must remain replayable from canonical declarations and
receipt witnesses.

## Locked Statement

> An OMI node is not a server first; it is a booted resolver of declared
> structure, exposing pipes, devices, and network edges as projection channels
> over receipt-verified state.
