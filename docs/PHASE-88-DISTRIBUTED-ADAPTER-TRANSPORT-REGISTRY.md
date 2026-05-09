# Phase 88 - Distributed Adapter Transport Registry

## Summary

Phase 88 gives OMI peers a transport vocabulary without trusting transport as
identity.

This phase declares distributed, device, filesystem, web, and ledger adapter
surfaces as capability-bound projection adapters. It does not implement live
networking, peer routing, device access, ledger anchoring, consensus, or
runtime channel opening.

The phase boundary is:

```text
Phase 87 names local runtime channels.
Phase 88 names distributed/device/web transport adapters.
Future phases open, sync, route, and harden them.
```

## Core Guardrail

```text
adapter != authority
transport != identity
device != declaration
```

External standards and runtimes are useful carrier surfaces. They do not become
OMI source authority.

## Declared Adapter Vocabulary

The registry declares these adapter names:

```text
tcp        routable peer stream
udp        datagram propagation channel
ipc        local process channel
fifo       declared local propagation edge
unix-sock  local socket surface
w3c-web    browser and semantic-web projection
btc-ledger append-only receipt anchor
inode      filesystem address binding
gpio       physical signal edge
scsi       block-device command surface
i2c        peripheral bus channel
```

Each adapter has:

```text
class
role
binding
capability
authority
runtime-opened false
```

`runtime-opened false` is deliberate. Phase 88 is vocabulary, not runtime.

## Capability Boundary

Adapter bindings reference declared capabilities, not raw OS permissions.

For example:

```text
tcp  -> use-tcp
gpio -> use-gpio
scsi -> use-scsi
```

This prevents a host operating system, device bus, socket permission, or
filesystem path from becoming OMI authority. The OS may permit access, but OMI
still requires a declared capability and a receipt-emitting runtime effect.

## Adapter Classes

The registry groups adapters into descriptive classes:

```text
network     TCP and UDP peer propagation
local-ipc   IPC, FIFO, and Unix-domain socket surfaces
web         W3C browser and semantic web projections
ledger      append-only receipt anchors
filesystem inode/path bindings
device-bus  GPIO, SCSI, and I2C device projections
```

These classes describe projection surfaces. They are not identity roots.

## Relationship To Decentralized Collaboration

The current stack can now describe decentralized collaboration without treating
the network as trusted:

```text
canonical declarations
-> receipts
-> runtime resolver
-> local channel manifest
-> distributed adapter registry
-> future peer protocol
```

Later phases can open channels, synchronize receipts, route peer state, repair
from logs, and add adversarial hardening. Phase 88 only declares the transport
vocabulary and capability boundaries.

## Receipt Separation

The registry preserves the receipt split:

```text
identity_receipt   = adapter registry declaration authority
projection_receipt = adapter/readout projection witness
package_receipt    = transport serialization witness
view_receipt       = presentation state
```

Transport can carry receipts. It cannot define identity.

## Locked Statement

> OMI peers may propagate over TCP, UDP, IPC, web, ledger, inode, GPIO, SCSI,
> or I2C surfaces, but those surfaces are adapters. Canonical declarations and
> receipts remain authority.
