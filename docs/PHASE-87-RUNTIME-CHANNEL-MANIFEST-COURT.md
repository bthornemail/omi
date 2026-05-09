# Phase 87 - Runtime Channel Manifest Court

## Summary

Phase 87 names the runtime lattice before the runtime opens it.

This phase adds a canonical OMI-Lisp manifest for runtime channel names,
process roles, POSIX projection paths, and capability boundaries. It does not
create FIFOs, sockets, device nodes, directories, processes, network listeners,
or mounted devices.

The core distinction is:

```text
declared channel
!= opened channel
```

## Locked Guardrail

> POSIX paths are projection bindings, not authority.

The manifest may declare names such as `/run/omi`, `/dev/omi`, FIFO paths,
socket paths, and repo-adapter paths, but those names do not define OMI
identity. Canonical declarations and receipts remain the authority.

## Declared Roots

The manifest names three root surfaces:

```text
/run/omi      runtime channel namespace
/dev/omi      device-projection namespace
.omi/runtime  repository adapter namespace
```

Each root is a declared name with `created false`. The declaration is a
portable manifest, not an OS setup script.

## Declared Channels

The manifest declares runtime channels for:

```text
declaration-in      FIFO input for declarations
receipt-out         FIFO output for receipt witnesses
projection-worker   pipe-like projection worker edge
peer-sync           socket-like receipt synchronization surface
block-image-view    device-projection readout
repo-adapter        POSIX repository adapter binding
```

Every channel has:

```text
kind
path
direction
role
capability
opened false
identity_receipt
```

The channel receipt identifies the declared channel name and role. It does not
prove that the host operating system has opened or created the resource.

## Process Roles

The manifest names local process roles:

```text
resolver
receipt-verifier
projection-worker
peer-sync-worker
repo-adapter
```

Each process role binds to declared channels and capabilities, but `spawned
false` preserves the Phase 87 boundary. Runtime process launch belongs to a
future phase.

## Capabilities

Capabilities are declared separately from channels:

```text
read-declaration
resolve-declaration
emit-receipt
verify-receipt
project-view
connect-peer
read-block-projection
adapt-repo
```

This separation prevents channel names from becoming permission grants. A FIFO
name is not a capability. A socket path is not trust. A device-projection path
is not storage authority.

## Relationship To Phase 86

Phase 86 defines the network-bootable runtime resolver doctrine:

```text
runtime lattice = mutable and local
declaration lattice = canonical and replayable
```

Phase 87 makes the next boundary concrete by naming the channels that a future
resolver image may open:

```text
declaration
-> receipt verification
-> runtime channel manifest
-> future resource opening
```

No live network, consensus, device mount, or FIFO creation is implemented here.

## Receipt Separation

Phase 87 keeps the receipt split intact:

```text
identity_receipt   = channel manifest declaration authority
projection_receipt = channel/readout projection witness
package_receipt    = portable serialization witness
view_receipt       = presentation state
```

Changing a view does not mutate the manifest. Opening a channel in a later
runtime phase must emit receipts; it must not rewrite declaration identity.

## Locked Statement

> Phase 87 names the runtime lattice before the runtime opens it.
