# Phase 106 - Autonomous World Package Sync Court

Phase 106 adds a deterministic package sync layer for admitted autonomous world
histories. It exports and imports admitted snapshots, history edges, branch
metadata, merge admission reports, and package/closure/raw-binary witnesses
without trusting the sender, package, or transport.

Locked rule:

> **A synced world package is transport evidence, not world authority; only receipt verification admits it locally.**

Locked phrase:

> **Phase 106 makes admitted world histories portable before it makes them networked.**

## Boundary

```text
105 = reconcile admitted branches
106 = package/sync admitted world history
future = peer transport / live network
```

The sync package is a portable evidence envelope:

```text
sync package != authority
sender != authority
transport != authority
import != admission until receipts verify
```

Local admitted declarations and receipts remain authority.

## Package Contents

A Phase 106 package carries:

```text
admitted world snapshots
identity receipts
history edges
branch metadata
overlay receipts
candidate edit receipts
admission decision receipts
merge admission reports
package receipts
closure coding witnesses
raw-binary chunk witnesses
```

The package receipt is computed over the canonical package body. Changing a
snapshot, history edge, witness, sender label, or transport label changes the
package receipt and causes verification to reject unless the package is
re-issued with a new receipt.

## Import

Import is a verification step, not authority:

```text
package
-> verify package receipt
-> verify snapshot witnesses
-> verify history edge receipts
-> reconstruct local history graph
-> admit locally as receipt-verified evidence
```

Browser and renderer projections may open imported admitted snapshots only
after verification.

## Authority

The sync court does not add live networking, peer trust, consensus, or
distributed mutation. It makes admitted histories portable so future peer
transport can move receipt-verifiable history without becoming authority.
