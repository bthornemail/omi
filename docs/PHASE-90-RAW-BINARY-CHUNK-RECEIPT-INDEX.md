# Phase 90 - Raw Binary Chunk Receipt Index

## Summary

Phase 90 makes raw binary shareable by receipt before it becomes networked by
protocol.

This phase adds a deterministic chunk index over a raw byte payload. It is the
first executable raw-binary court after the Phase 89 integration audit, but it
still does not implement QEMU, QMP, vfio-user, peer sync, device access, live
storage, or network behavior.

## Core Object

```text
chunk = offset + size + sparse marker + content hash + receipt
```

Each chunk is a declared receipt-bearing region of the raw byte carrier.

## Authority Boundary

```text
raw bytes are carrier, not authority
chunk receipts are deterministic witnesses
canonical declarations + receipts remain authority
```

The raw payload can be shared later. The receipt index is what makes it
admissible for replay and repair.

## Sparse Chunks

An all-zero chunk is treated as:

```text
sparse = true
sparse_marker = declarative-hole
content_hash = null
```

A sparse chunk is not missing data. It is a declared hole with its own receipt.

## Dense Chunks

A non-zero chunk is treated as:

```text
sparse = false
sparse_marker = present-bytes
content_hash = deterministic byte hash
```

The chunk receipt derives from:

```text
index id
OMI path
scope
identity anchor
block size
chunk index
offset
size
sparse marker
content hash
```

## Determinism Laws

Phase 90 locks these laws:

```text
same bytes + same block size -> same index receipt
changed byte -> changed affected chunk receipt + changed index receipt
projection/view mode -> no identity receipt change
```

## Projection Modes

The index supports the same view family as the surrounding workbench courts:

```text
lazy     sealed chunk manifest
greedy   expanded chunk chart
static   receipt reconciliation
animated offset sweep
```

Each projection preserves `identity_receipt` and changes only projection/view
receipts.

## Non-Goals

Phase 90 does not:

```text
open QEMU
call QMP/QAPI
create vfio-user sockets
start peer sync
repair chunks
open block devices
mount raw images
claim network trust
```

Those belong to later courts.

## Relationship To Phase 89

Phase 89 identified the raw binary chunk receipt index as the next missing
court. Phase 90 fills that gap without jumping ahead to transport.

The safe order remains:

```text
chunk identity first
transport later
repair after transport
trust after receipt discipline
```

## Locked Statement

> Phase 90 makes raw binary shareable by receipt before it becomes networked by
> protocol.
