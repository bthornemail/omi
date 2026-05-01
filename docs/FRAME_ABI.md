# FRAME ABI Spec v0.1

## Purpose

The FRAME ABI defines a deterministic interpretation contract for byte streams
where control codes precede syntax, framing determines meaning, resolution is
dynamically scaled, and symbols are derived from framed regions rather than raw
bytes alone.

This document sits above the current Phase 6 kernel. It is the target for a
future user-space interpretation layer and should not be confused with behavior
already enforced in QEMU.

## Core Principle

A frame is a bounded byte region whose interpretation is determined by a
control-derived framing state.

```text
FRAME = (region, control_state, header_state, plane_state, resolution, chirality)
```

Raw bytes do not carry one timeless meaning. They are heard through BOM,
direction, framing, plane, and control state.

## Layer Stack

### Control Layer

The `0x00..0x1f` lattice is pre-language. It is the control plane, event stream,
and LUT substrate.

Canonical split:

```text
0x00..0x0f -> REFERENCES
0x10..0x1f -> POINTERS
```

`FS`, `GS`, `RS`, and `US` are the structural separator spine inside the pointer
half, not the whole pointer layer.

### Frame Layer

`FRAMES.omi` defines how stable regions become frames and when they may enter
user-space interpretation.

The pre-header prepares `HEADER8`; it is not collapsed into `HEADER8`.

### Encoding Dialect Layer

Surface / decoding planes:

```text
ASCII   0x00..0x7f
BRAILLE 0x80..0xbf
AEGEAN  0xc0..0xff
```

Functional roles:

- `BRAILLE` is the dense payload / significand dialect.
- `AEGEAN` is the lifted header / exponent / governance dialect.
- `OMICRON` is radix-4 control hearing over `BOM`, `ESC`, `BOUNDARY`, and
  `ECC`.

### User-Space Interpretation Layer

User-space opens when a frame is stable, symbolized, and valid. At that point,
the kernel remains the deterministic structure producer, while user space may
perform controlled resolution reinterpretation without changing kernel truth.

## Pre-Header Ladder

Readable notation:

```lisp
(!NULL
  .
  (((NULL . ESC)
    (CONTROL . SIGNAL)
    (REFERENCES . POINTERS)
    (NON-PRINTING . PRINTING)
    (ASCII . BRAILLE))
   . AEGEAN))
```

This is not a claim that raw stream interpretation begins as Lisp list syntax.
It is notation for the order in which distinctions become valid:

```text
NOT-NULL stream
-> NULL/ESC chirality
-> CONTROL/SIGNAL cardinality
-> REFERENCES/POINTERS ordinality
-> NON-PRINTING/PRINTING modality
-> ASCII/BRAILLE surface polarity
-> AEGEAN governance closure
```

## Frame Structure

Future C target:

```c
typedef struct omi_frame {
    uint32_t start;
    uint32_t length;
    uint8_t control_state;
    uint8_t header_state;
    uint8_t plane_state;
    uint8_t resolution;
    uint8_t chirality;
    uint8_t mode;
} omi_frame_t;
```

The fields are intentionally small. Phase 7 should add only enough runtime
state to prove frame detection and replay equivalence.

## Resolution Model

The ladder establishes a 32-state addressing basis. Aegean framing lifts the
basis into a governed resolution scale, and Braille supplies an 8-dot microcell
expansion.

```text
32 logical states * 8 Braille microstates = 256 addressable microstates
```

This is a resolution-addressing law, not a text decoration rule.

## BOM As Semantic Operator

The Phase 6 kernel already uses BOM for address traversal. FRAME ABI extends
the design target:

```text
BOM = traversal_direction | frame_orientation | semantic_rewrite_bias
```

Future frame interpretation must treat BOM as a semantic projection operator,
not merely an index permutation.

## Symbol Identity

Phase 6 defines:

```text
symbol_id = f(content_hash, orbit_id)
```

FRAME ABI extends the future target:

```text
symbol_id = f(content_hash, orbit_id, control_state, header_state, plane_state, chirality)
```

That extension must be replay-equivalent before it becomes authoritative.

## OMI Logs

OMI logs are not merely linear event output. A log entry is itself a frame trace
across interpretation layers:

```text
OMI_LOG = (frame_id, symbol_id, bom_state, resolution_level, interpretation_layer)
```

Future OMI logging should be reinterpretable under the same frame rules as
payload memory.

## Invalid Frame Conditions

Initial guardrail diagnostics:

- `premature_structure`: punctuation/list structure introduced before the rung
  is active
- `plane_confusion`: decoding planes confused with control points
- `control_plane_collapse`: control lattice treated as ordinary text payload
- `invalid_pointer_range`: `0x10..0x1f` treated as references rather than
  pointer/control half
- `ambiguous_hearing`: a byte receives multiple meanings without explicit frame
  context

These belong in `FRAMES.omi` first. They should move into `RULES.omi` or a
generated diagnostic table only when the runtime state needed to evaluate them
exists.

## Replay Contract

A valid FRAME implementation must satisfy:

```text
frames(kernel) == frames(replay)
symbols(kernel) == symbols(replay)
diagnostics(kernel) == diagnostics(replay)
```

No frame interpretation is authoritative until host replay can reproduce it.

## Non-Normalization Rule

The system MUST NOT flatten FRAME into:

- linear byte-array semantics
- pure Lisp S-expressions
- an AST-first parser
- ordinary Unicode/text encoding

FRAME is a resolution-aware, control-bound interpretation cell.

## Phase Boundary

The next kernel phase should not implement full user space. It should only prove
this smaller contract:

```text
stable symbol region
-> frame detection
-> content/orbit/frame identity
-> host replay equivalence
```

Only after that should OMI introduce user-space frame rebinding.

## IEEE 754 Structural Isomorphism

This section clarifies that OMI frame addressing uses the same field
decomposition grammar as IEEE 754 floating-point layout, but reinterprets
the domain symbolically rather than numerically.

### Not A Numeric Format

OMI does NOT redefine IEEE 754. It does NOT propose an alternative floating-
point representation. The structural mapping is:

| IEEE 754 Field | OMI Frame Role | Semantic Interpretation |
|---------------|----------------|-------------------------|
| Sign bit | BOM unit | Recursion/polarity operator |
| Exponent field | AEGEAN header | Scale/tower/governance selector |
| Significand field | BRAILLE body | Dense resolution/payload manifold |

This is a **structural isomorphism over field decomposition**, not
equivalence. The layout grammar is shared; the domain is transformed.

### Scale Hierarchy (Tower of Power)

The addressing law scales with precision:

```text
HALF (binary16):
  1 BOM × 5 AEGEAN × 10 BRAILLE  = frame address
  (1 bit  + 5 bits  + 10 bits)

SINGLE (binary32):
  1 BOM × 8 AEGEAN × 23 BRAILLE = frame address
  (1 bit  + 8 bits + 23 bits)

DOUBLE (binary64):
  1 BOM × 11 AEGEAN × 52 BRAILLE = frame address

QUAD (binary128):
  1 BOM × 15 AEGEAN × 112 BRAILLE = frame address

OCTUPLE (binary256):
  1 BOM × 19 AEGEAN × 236 BRAILLE = frame address
```

Increasing AEGEAN depth raises the tower abstraction level.
Increasing BRAILLE width increases resolution density at that level.

### Non-Numeric Composition

The addressing equation is:

```text
FRAME = BOM ⊗ AEGEAN ⊗ BRAILLE
```

Interpreted as **composition of transform operators**, NOT arithmetic
multiplication:

```text
FRAME := BOM ∘ AEGEAN ∘ BRAILLE
```

This reads: "Apply BOM recursion, then AEGEAN scale transformation,
then BRAILLE resolution embedding."

### Symbol Identity Extension (Future)

When the frameABI stabilizes, identity should extend to:

```text
symbol_id = f(content_hash, orbit_id, frame_fields)
```

Where `frame_fields` includes BOM, AEGEAN, and BRAILLE components,
enabling frame-aware symbol derivation beyond raw orbit/content hashing.

### Structural Analogy Preservation

Maintain these distinctions in explanations:

- BOM is **recursion/polarity**, not merely traversal or sign
- AEGEAN is **exponent/scale/governance**, not merely metadata or header
- BRAILLE is **significand/resolution body**, not ornamental payload

Do not flatten frame addressing into:
- ordinary floating-point arithmetic
- plain indexed memory addressing
- standard text encoding

## OMICRON Interpreter Pipeline

This section defines the **OMICRON interpreter loop** — the core execution
pipeline that replaces parsing with state transformation.

### The Pipeline

```text
BYTE → BOM detect → OMICRON mode → GAUGE transform → STATE update
```

Each stage:

1. **BYTE**: Raw input byte from codepoint space (0x00-0x7F)
2. **BOM detect**: Carrier detection — is this byte a control boundary?
3. **OMICRON mode**: Interpretation mode selection based on BOM
4. **GAUGE transform**: Apply operator to interpreter state
5. **STATE update**: Transition to new state

### BOM / OMICRON Unification

```text
BOM = carrier (byte-level marker)
OMICRON = hearing (interpretation mode selector function)
```

When BOM byte matches the following symbol:

- Continue same encoding mode (linear continuation)

When BOM byte differs from following symbol:

- Enter recursion/loop/replay mode (mode shift)

This is the **execution polarity** — not a sign bit, but a mode switch.

### GAUGE Operators (Subset)

The primary operators applied during transform:

| Operator | Effect |
|----------|--------|
| I | No state change |
| F | Toggle control/data boundary |
| M | Parity inversion |
| p | Binary plane rotation |
| q | Decimal plane rotation |
| r | Hex plane rotation |

### OMICRON Depth Sensitivity

- **Shallow OMICRON**: Simple polarity flip (linear ↔ recursion)
- **Deep OMICRON**: Full structural recursion over frame graph

The depth determines whether OMICRON acts as:

- A simple toggle (branch)
- A loop controller (repetition)
- A replay trigger (reconstruction)

### Complete GAUGE Table Reference

For the full 128-entry operator mapping, see `docs/GAUGE_TABLE.omi`.

### GNOMON (Self-Similarity Invariance)

The invariant that keeps the system stable under recursion:

```text
∀ depth d: GAUGE^d(State) preserves structural operator equivalence
```

This is NOT a field — it is the closure constraint ensuring that deeper
interpretations preserve the same operator grammar. Meaning is invariant to
recursion depth — only the resolution changes.

### OMICRON-GAUGE Separation (Hard Invariant)

This is the critical separation that must be preserved:

```text
For every input byte b:

1. Γ(b) = gauge_lookup(b)  // EXACTLY ONE table lookup (no state change)
2. OMICRON mode may update traversal metadata (depth, replay index)
3. GAUGE_APPLY(state, Γ(b)) // EXACTLY ONE state transition

Formal: state_{t+1} = GAUGE_APPLY(state_t, Γ(byte_t))
```

**Critical Rules:**

- OMICRON MUST NOT modify the GAUGE operator mapping Γ(b)
- OMICRON MUST NOT cause multiple GAUGE applications per byte
- OMICRON only controls traversal metadata (depth, replay path)

This invariant is enforced in `gauge_step()`:

```c
omi_gauge_state_t gauge_step(omi_gauge_state_t state, omi_escape_state_t *esc, uint8_t *header, uint8_t byte, uint8_t omicron_mode, uint8_t *op_out, uint8_t *resolved_out)
{
    (void)omicron_mode;
    *op_out = GAUGE_NOOP;
    *resolved_out = 0; // Initialize to 0

    uint8_t out;
    int kind = escape_step(esc, byte, &out);

    if (kind == 1) {
        // We have a resolved byte from the escape processing
        *resolved_out = out; // Store the resolved byte for header decoding
        
        // Update the header state using the resolved byte (ESC-resolved stream)
        *header = gauge_header_decode(*header, out);

        // Look up the gauge op for the resolved byte
        uint8_t op = gauge_lookup(out);
        *op_out = op;

        // Apply the gauge op to the state
        return gauge_apply(state, op);
    }

    // If kind != 1, then we don't have a resolved byte, so we don't update header or apply any op.
    return state;
}
```

### The Operational Principle

**ASCII is operational, not semantic.**

A codepoint performs a transformation on interpreter state.
Meaning is a side-effect of state transformation, not inherent in the glyph.

This is the key distinction that stabilizes the entire model.

## Phase 9: Trace Projection Theorem

### NOT the framing:

> "All OMICRON modes are equivalent"

### YES the framing:

> "Same execution, different observation projections"

### Core Theorem

```
EXECUTION = constant
OBSERVATION = π_mode(EXECUTION)
```

Where:

- **EXECUTION**: `state_{t+1} = GAUGE_APPLY(state_t, Γ(byte_t))`
- **π_linear**: identity projection
- **π_recursive**: depth-accumulating projection
- **π_replay**: depth-erasing projection

### Proof

```
Γ_linear(byte) = Γ_recursive(byte) = Γ_replay(byte)
GAUGE_APPLY operates identically
π_mode differs only on metadata
```

### Equivalence Classes

| Class | Strength | What is Equivalent |
|-------|----------|-------------------|
| Γ-equivalence | STRONG | Operator sequence (exact) |
| GAUGE-state | MODERATE | {mode, parity, plane} only |
| metadata | WEAK | depth differs by mode |
| trace-projection | OBSERVATIONAL | via π_mode |

### Implementation Note

The test harness verifies:

- State equivalence (mode, parity, plane) — MODERATE class
- Operator sequence (Γ) — STRONG class
- Depth differs as expected — metadata observation

These verify different equivalence claims. Do not conflate them.

## Phase 10: Projection Algebra (π-Composition)

### Formal Definition

```
π : Trace → View
```

Projections are functions from canonical trace to observable view.

### Composition Laws

| Composition | Result |
|-------------|--------|
| π_linear ∘ π_any = π_any | Identity |
| π_any ∘ π_linear = π_any | Identity |
| π_replay ∘ π_replay = π_replay | **Idempotence** |
| π_recursive ∘ π_linear = π_recursive | Right identity |
| π_linear ∘ π_recursive = π_recursive | Left identity |

### Identity Projection

π_linear is the identity element. It passes trace through unchanged.

### Idempotence (Critical)

This is essential for replay:
```
π_replay is idempotent: applying replay twice = applying once
```
If violated, replay loses canonical status.

### Core vs Meta State Separation

| State Component | Type | Handled By |
|----------------|------|------------|
| parity, plane | CORE | GAUGE_APPLY |
| mode, depth | META | π projection only |

### Projection Equivalence Classes

Two projections π_a and π_b are equivalent if:
- For all traces: view_a ≡ view_b

Classes:
- **Γ-equivalence**: operator sequence identical
- **state-equivalence**: core state fields match
- **trace-equivalence**: full structural view match

### Key Invariant

```
EXECUTION (sealed)
  ↓
TRACE (canonical)
  ↓
π_projection (observation)

No reverse flow. π cannot modify execution.

## Phase 11: Core/Meta State Separation

### Purpose

Explicitly separate state fields to prevent ambiguity:

- **Core state** (semantic): `{parity, plane}`
- **Meta state** (observational): `{mode, depth, omicron_mode}`

### Separation Rules

| Field Type | Mutated By | Part Of |
|-----------|------------|--------|
| CORE: parity, plane | GAUGE_APPLY only | Execution semantics |
| META: mode, depth, omicron_mode | OMICRON/π only | Observation only |

### Invariant (Critical)

```
GAUGE_APPLY must never modify meta fields
OMICRON/π must never modify core fields
```

This prevents field leakage between semantics and observation.

### Functions

```c
omi_gauge_core_state_t gauge_get_core(state);
omi_gauge_meta_state_t gauge_get_meta(state);
int gauge_core_equiv(a, b);  // semantic equivalence
int gauge_meta_equiv(a, b); // annotation equivalence
```

### Equivalence Classes

| Equivalence | What is Compared |
|-------------|-----------------|
| Core | `{parity, plane}` |
| Meta | `{mode, depth}` |
| Full | Core + Meta |

### State Structure

```c
typedef struct {
    uint8_t parity;
    uint8_t plane;
} omi_gauge_core_state_t;

typedef struct {
    uint8_t mode;
    uint8_t depth;
    uint8_t omicron_mode;
} omi_gauge_meta_state_t;

typedef struct {
    omi_gauge_core_state_t core;
    omi_gauge_meta_state_t meta;
} omi_gauge_state_t;
```
```
