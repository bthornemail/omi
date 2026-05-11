# Phase 115 - Autonomous World Transport Request Scheduler Court

Phase 115 adds a deterministic request scheduler over Phase 114 availability
reports. It decides what evidence should be requested next, orders candidate
suppliers, and emits a receipt-witnessed request schedule.

Locked rule:

> **A scheduler may choose what to request next, but scheduling is not trust and delivery is not admission.**

Locked phrase:

> **Phase 115 lets the node decide what evidence to ask for next without trusting the request, the supplier, or the delivery path.**

## Boundary

```text
114 = availability map
115 = deterministic request scheduling
future = live dispatch / peer routing / bandwidth policy
```

The scheduler is not a dispatcher and not an admission court:

```text
scheduler != authority
request plan != admission
supplier priority != trust
delivery success != receipt validity
retry policy != verification bypass
```

## Flow

```text
availability report
-> classify request needs
-> prioritize missing/corrupt/repairable receipts
-> choose candidate supplier order
-> emit request schedule receipt
-> Phase 113 repair path or future sync dispatch
-> verification before admission
```

Missing evidence remains visible. Corrupt evidence must be scheduled for
replacement or repair before it is treated as available. Repairable evidence may
be scheduled, but it is not repaired until Phase 113 verifies a payload.

## Schedule Shape

```json
{
  "kind": "omi.autonomous-world.transport-request-schedule",
  "authority": false,
  "source_availability_receipt": "...",
  "policy": "deterministic.fixture",
  "requests": [
    {
      "target_receipt": "...",
      "target_kind": "transport-event",
      "reason": "missing",
      "candidate_suppliers": [],
      "priority": 0,
      "request_receipt": "..."
    }
  ],
  "unsatisfied": [],
  "schedule_receipt": "..."
}
```

The schedule receipt witnesses the ordering decision. It does not contact
peers, open transports, admit snapshots, or trust successful delivery.

## Authority

Authority remains canonical declarations and receipts. Phase 115 chooses a next
request order; Phase 113, Phase 106, and Phase 107 still verify evidence before
any world history becomes locally visible.
