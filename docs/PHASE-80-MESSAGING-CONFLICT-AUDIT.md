# Phase 80 - Messaging Conflict Audit

Status: audit.

This audit supports the sovereign doctrine source:
[OMI Constitutional Geometry](OMI-CONSTITUTIONAL-GEOMETRY.md).

## Scope

This audit treats messaging as propagation across declared OMI boundaries, not
as a single semantic channel.

The point is to find places where the repo uses message-like language without
keeping the authority split explicit:

- declaration
- event
- packet
- receipt
- projection
- trust
- narrative
- carrier

## Executive Statement

Messaging in OMI behaves more like a wave propagating through a declared
medium than like a single parser pass.

```text
declaration
-> propagation
-> overlay / interference
-> receipt
-> projection
```

That means we should audit conflicts the way one audits wave behavior:

- amplitude = salience, duplication count, or propagation strength
- frequency = cadence, recurrence, or tick rate
- phase = ordering / alignment of receipts
- interference = collision between authority domains
- resonance = deterministic agreement between projections
- aliasing = loss of resolution between identity, projection, and view
- damping = noise rejection or projection filtering

## What To Look For

The main audit question is not "is there a message?"
The question is:

```text
which authority domain does this message belong to?
```

The usual collision classes are:

1. identity being treated like transport
2. projection being treated like authority
3. receipt being treated like content
4. trust being treated like identity
5. event being treated like packet
6. narrative being treated like source code

## Conflict Surfaces Already Present

### 1. Event vs Packet vs Receipt

`kernel/mmio_device_court.c` and `kernel/mmio_device_court.omi` use `event`
for device surfaces such as render output, pointer select, carrier scan,
model sync, receipt append, and timing receipt.

That is good, but it must remain clear that:

- `event` is a witnessed change
- `packet` is a transport envelope
- `receipt` is an integrity witness

Those are adjacent, but not interchangeable.

### 2. Overlay vs Package vs Trust

`workbench/src/stream_overlay_package.js` carries:

- `identity_receipt`
- `projection_receipt`
- `view_receipt`
- `overlay_receipt`
- `resolved_region_receipt`
- `package_receipt`

`workbench/src/composition_bundle.js` carries:

- `identity_receipt`
- `view_receipt`
- `trust_receipt`
- `bundle_receipt`

These are coherent, but the audit boundary is:

- identity is declaration authority
- projection is readout reconciliation
- package is transport serialization
- trust is attestation over identity, not over view

### 3. Stream Declaration vs Stream Projection

`workbench/src/stream_declaration.js`, `workbench/src/stream_projection.js`,
and `workbench/src/stream_overlay_package.js` correctly separate declared
regions from readout and overlay resolution.

The audit concern is aliasing:

- if a readout is mistaken for declaration, identity can drift
- if a projection lens is mistaken for source, conflict becomes invisible

### 4. Narrative vs Canonical Declaration

`docs/PHASE-79-NARRATIVE-TIMELINE-AS-DECLARED-WORLD.md` makes the narrative a
declared world surface, but it remains a projection of canonical declaration.

That means:

- chapter and scene structure are declarative
- interjections are overlay candidates
- timeline frames are deterministic projections
- narrative is not a rewrite channel for history

### 5. S-P-O-M Triangulation

`docs/PHASE-76-GAUGE-RESOLVED-CANONICAL-UNIFICATION.md` uses S-P-O-M as a
derived triangulation surface.

That is correct if and only if:

- `S` is subject / identity anchor
- `P` is predicate / relation edge
- `O` is object / target / value
- `M` is modality / authority / scope / evidence state

S-P-O-M becomes a messaging audit surface only if it stays derived and never
claims source authority.

## Recommended Naming Discipline

Use the following nouns consistently:

- `declaration` for canonical source structure
- `event` for local witnessed change
- `packet` for transport envelope
- `receipt` for integrity witness
- `projection` for deterministic readout
- `view` for surfaced presentation
- `trust` for attestation metadata
- `narrative` for human-readable world projection
- `carrier` for a transport medium

Avoid using `message` as a catch-all. If a surface must say message, it should
still declare which authority domain it belongs to.

## Wave-Model Audit Rule

If two surfaces claim to carry the same message, compare them the way you would
compare two waveforms:

1. Check amplitude: are they carrying the same amount of declared content?
2. Check frequency: do they recur on the same cadence?
3. Check phase: do the receipts align in the same order?
4. Check interference: does one surface inject authority into another?
5. Check resonance: do they normalize to the same derived witness?
6. Check aliasing: was any resolution lost between identity, projection, and
   view?

That gives us an audit method for conflicts without collapsing the stack.

## Locked Statement

> Messaging in OMI is wave propagation across declared boundaries.
> Conflict is phase mismatch between authority domains.
> Reconciliation is receipt-consistent alignment, not lossless flattening.
