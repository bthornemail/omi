# Phase 114 - Autonomous World Transport Availability Court

Phase 114 adds a deterministic availability map over local transport evidence.
It classifies required receipts as available, missing, corrupt, or repairable,
identifies candidate suppliers from peer/package metadata, and can emit a
repair plan for Phase 113.

Locked rule:

> **Availability may guide repair, but availability is not admissibility.**

Locked phrase:

> **Phase 114 tells the node what evidence it has, what evidence it lacks, and where repair might come from -- but only verification can admit history.**

## Boundary

```text
113 = repair missing/corrupt evidence
114 = classify evidence availability and repair sources
future = live peer availability gossip / routing / scheduling
```

Availability is not admission:

```text
availability != authority
availability match != admission
candidate supplier != trust
repairable != repaired
available evidence still must verify
```

## Flow

```text
local evidence inventory
-> required receipt set
-> available / missing / corrupt / repairable classification
-> candidate suppliers from peer/package metadata
-> availability receipt
-> optional repair plan
-> Phase 113 repair path
-> verification before admission
```

Missing evidence is explicit. Corrupt evidence is unavailable. Candidate
suppliers are hints, not trusted sources. Repair plans can feed Phase 113 but
cannot bypass repaired replay verification.

## Availability Report

```json
{
  "kind": "omi.autonomous-world.transport-availability",
  "authority": false,
  "required_receipts": [],
  "available": [],
  "missing": [],
  "corrupt": [],
  "repairable": [],
  "candidate_suppliers": [],
  "availability_receipt": "..."
}
```

The availability receipt witnesses the local evidence map. It does not open
snapshots, admit world history, or trust the peer/package that may supply a
repair payload.

## Authority

Local authority remains admitted declarations and receipts. Phase 114 tells a
node what it can verify, what it lacks, and where repair may begin.
