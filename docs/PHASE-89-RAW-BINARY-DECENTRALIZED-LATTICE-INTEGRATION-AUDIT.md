# Phase 89 - Raw Binary Decentralized Lattice Integration Audit

## Summary

Phase 89 generalizes by integration, not reinvention.

The raw-binary decentralized OMI lattice is already partially present in the
repository through block-image declarations, block-image projections, runtime
resolver doctrine, local channel manifests, distributed adapter vocabulary, and
the OMI self-map. This phase names that integration surface and identifies the
missing adapter and receipt courts needed before live decentralized
block/process sharing.

This phase is not a runtime. It does not open QMP sessions, start QEMU, parse a
live QAPI schema, create vfio-user sockets, compile LLVM, run TCG, open peer
links, or synchronize chunks.

## Locked Rule

> Generalize by integration, not reinvention. The raw-binary lattice is already
> partially implemented; Phase 89 identifies the missing adapter and receipt
> courts that connect it.

## Authority Boundary

The guardrail remains:

```text
QEMU is not authority
QMP/QAPI is not authority
vfio-user is not authority
LLVM is not authority
TCG is not authority
raw image is not authority
network peer is not authority
canonical declarations + receipts are authority
```

QEMU, QMP, QAPI, vfio-user, LLVM, TCG, raw images, and peers are useful
projection, adapter, witness, carrier, or synchronization surfaces. They do
not replace OMI declarations or receipts.

## Existing Courts To Reuse

Phase 89 explicitly reuses the existing courts:

```text
Phase 77 block image declaration
Phase 78 block image projection
Phase 83 OMI-in-OMI self-map
Phase 86 network-bootable runtime resolver
Phase 87 runtime channel manifest
Phase 88 distributed adapter transport registry
```

The raw-binary lattice should not duplicate these layers. In particular, Phase
77 and Phase 78 already provide the declaration/projection split for block
images.

## Integration Ladder

The declared integration ladder is:

```text
canonical declaration
-> declared raw-binary block topology
-> deterministic block projection
-> local runtime resolver
-> local POSIX channel naming
-> distributed/device/web adapter bindings
-> future receipt-first peer exchange
-> future self-healing repair
```

This ordering preserves authority while leaving room for live runtime work.

## Missing Courts

The missing courts are:

```text
raw binary chunk receipt index
QEMU/QMP block adapter declaration
vfio-user-style device adapter declaration
peer chunk sync protocol
self-healing repair court
LLVM/TCG projection witness adapter
```

These are future implementation surfaces. Phase 89 only names them.

## Adapter Roles

The proposal classifies external systems by role:

```text
QEMU       block-device projection engine
QMP/QAPI   management schema and control-plane adapter
vfio-user  out-of-process device resolver socket boundary
LLVM       compilation projection backend
TCG        deterministic portability witness
raw image  replayable binary carrier
peer       receipt synchronization counterparty
```

Each role is useful. None is authority.

## QEMU/QMP Context

QEMU block operations such as streaming, commit, mirror, backup, and NBD
export/import are natural adapter candidates because they already model live
block surfaces and backing-chain transitions. Phase 89 does not encode those
operations directly. A future QEMU/QMP adapter declaration should validate
selected primitives against a local QEMU source tree, especially the QAPI block
schema.

## vfio-user Context

vfio-user-style device separation is a good candidate for out-of-process OMI
device resolution. The future court should treat the external device process as
a projection boundary over a declared socket/capability surface. It must not
make the server process authority.

## LLVM/TCG Context

LLVM may compile projection adapters. TCG may witness portable execution. Both
remain replay surfaces and witnesses. Neither becomes doctrine or identity.

## Best Next Implementation

The safest next executable court is:

```text
raw binary chunk receipt index
```

That court can index a raw image by:

```text
chunk_id
offset
size
sparse marker
content hash
receipt
```

Only after deterministic chunk receipts exist should QMP, vfio-user, peer sync,
or repair courts attempt live behavior.

## Locked Statement

> OMI raw binary decentralization begins with chunk receipts, not network trust.
> QEMU projects the block lattice, vfio-user externalizes device resolution, TCG
> witnesses portability, and LLVM compiles adapters. Canonical declarations and
> receipts remain authority.
