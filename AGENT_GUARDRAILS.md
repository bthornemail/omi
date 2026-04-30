# Agent Guardrails

## Purpose

These guardrails constrain coding agents so they stay aligned with the OMI-LISP
model and do not silently flatten, reinterpret, or reorder the ontology. Use
this file as a hard constraint when generating code, docs, or explanations.

## Non-Negotiable Model Constraints

### 1. Control Codes Are Pre-Language Control Selectors

Treat the `0x00..0x1f` lattice as the control plane, event stream, and LUT
substrate.

Preferred language:

- control plane
- event stream
- pre-language selectors
- LUT substrate
- in-band control

Avoid:

- "just non-printing characters"
- "invisible text"
- "just ASCII control characters"

### 2. The Pre-Header Comes Before HEADER8

The pre-header is the in-band control sequence that prepares `HEADER8`.

Canonical form:

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

Read as:

- NOT-NULL stream
- enters `NULL/ESC` chirality
- enters `CONTROL/SIGNAL` cardinality
- enters `REFERENCES/POINTERS` ordinality
- enters `NON-PRINTING/PRINTING` modality
- enters `ASCII/BRAILLE` surface polarity
- closes upward under `AEGEAN` header/governance scope

Do not collapse the pre-header into `HEADER8`. Do not describe `HEADER8` as
the origin of the ladder.

### 3. HEADER8 Is Not The Ontology

`HEADER8` is the first complete runtime injection surface.

Canonical slot contract:

- `[0]` `NULL`
- `[1]` `ESC`
- `[2]` `FS`
- `[3]` `GS`
- `[4]` `RS`
- `[5]` `US`
- `[6]` input byte
- `[7]` current state

Use language like:

- runtime injection surface
- first complete realized generator
- dispatch witness
- control witness

Avoid language like:

- the whole ontology
- the origin of meaning
- the full model

### 4. Do Not Introduce Punctuation/List Syntax Too Early

Do not treat `(`, `)`, and `.` as foundational before their rung has been
earned. The control lattice comes first.

This means:

- do not force early explanations into list syntax
- do not assume pair notation is already active at the raw control stage
- do not rewrite the stream model into fully formed Lisp too early

If discussing early stages, keep the explanation stream-first and control-first.

### 5. Distinguish Planes From Control Points

Surface / decoding planes:

- `ASCII` = `0x00..0x7f`
- `BRAILLE` = `0x80..0xbf`
- `AEGEAN` = `0xc0..0xff`
- `OMICRON` = control-plane hearing

Control points:

- `BOM` = `0xef`
- `ESC` = `0x1b`
- `BOUNDARY` = `0x1c..0x1f`
- `ECC` = `0xe0..0xee`

Do not confuse plane selection, framing, control points, and ladder inversions.
They are related but not identical.

### 6. OMICRON Is Radix-4 Control Hearing

`OMICRON` is not just another decorative character plane. Treat it as radix-4
control hearing over four control kinds:

- `BOM`
- `ESC`
- `BOUNDARY`
- `ECC`

Do not reduce OMICRON to "a fourth alphabet."

### 7. BRAILLE And AEGEAN Are Functional Dialects

Do not describe them as ornamental alphabets.

- `BRAILLE` = dense payload / significand dialect
- `AEGEAN` = lifted header / exponent / governance dialect

These are part of the runtime encoding strategy.

### 8. REFERENCES And POINTERS Are A Control Inversion

Canonical split:

- `REFERENCES = 0x00..0x0f`
- `POINTERS = 0x10..0x1f`

Inside the pointer half, `FS/GS/RS/US` are structural pointer separators. Do
not refer to `0x1c..0x1f` as the whole pointer layer. They are the structural
separator spine inside the pointer half.

### 9. Do Not Guess Missing Values

If a mapping is not fixed by the docs or code:

- say it is unassigned
- say it is not yet fixed
- ask which source file governs it

Do not improvise placeholders and continue as if the model is complete.

This is especially important for:

- BOM categories
- framing markers
- ordinality declarations
- plane switches
- sign/exponent/index semantics

### 10. OMI-LISP Is Framed Rewriting

Do not force the model into a Lisp 1.5 `eval/apply`-first explanation.

Preferred execution order:

```text
byte stream
-> control hearing
-> pre-header
-> HEADER8
-> match
-> rewrite
-> fixpoint
-> emit
```

Use language like:

- rewrite
- fixpoint
- dispatch
- framed reduction
- in-band control
- structural hearing

Avoid prematurely recentering the system on:

- `eval`
- `apply`
- conventional reader/evaluator splits

### 11. Use Contextual Interpretation

The same value may be heard differently under BOM, direction, framing, plane,
and control state.

Prefer:

- nibble/value first, representation second
- contextual decoding
- framed interpretation

Avoid explaining bytes as if they have one timeless meaning independent of
context.

### 12. Explain With Layered Roles

Preferred vocabulary:

- control plane
- framing
- ladder
- inversion
- address hearing
- dispatch
- rewrite
- fixpoint
- witness
- payload
- governance

Avoid flattening the model into:

- "just text encoding"
- "just syntax"
- "just another Lisp"
- "just Unicode representation"

### 13. Frame Fields Use IEEE 754 Structural Grammar

OMI frame addressing uses the same field decomposition grammar as IEEE 754
floating-point layout, but reinterprets the domain symbolically:

- **BOM** = recursion/polarity unit (analogous to IEEE sign bit)
- **AEGEAN** = exponent/scale/governance selector (analogous to IEEE exponent)
- **BRAILLE** = significand/resolution body (analogous to IEEE significand)

**IMPORTANT**: This is a structural isomorphism, NOT equivalence.

Preferred language:

- structural mapping over field decomposition
- symbolic address geometry modeled after floating-point layout grammar
- transform operator composition: FRAME := BOM ∘ AEGEAN ∘ BRAILLE

Avoid language:

- "new floating-point format"
- "IEEE 754 replacement"
- "numeric redefinition"
- numeric computation or arithmetic product

### 14. Preserve the Sign/Exponent/Significand Analogy

When discussing frame addressing, maintain:

- BOM is recursion/polarity, not merely traversal or index
- AEGEAN is exponent/scale/governance, not merely metadata or header
- BRAILLE is significand/resolution body, not ornamental payload

Do NOT describe these as:

- "just like the sign bit in floating-point"
- "equivalent to the exponent field"

### 15. GAUGE is Operational, Not Semantic

ASCII codepoints perform state transformations. They do not carry inherent meaning.

Preferred language:

- GAUGE operator applies transform to interpreter state
- codepoint → operator → state transition
- meaning is side-effect of transformation

Avoid language:

- "character means X"
- "the symbol represents Y"
- "glyph carries semantic value"

### 16. OMICRON Pipeline

Always explain the interpretation pipeline in order:

```text
BYTE → BOM detect → OMICRON mode → GAUGE transform → STATE update
```

Preferred terms:

- BOM = carrier (byte-level marker)
- OMICRON = hearing (interpretation mode selector)
- GAUGE = action (operator applied to state)

### 17. GNOMON is Invariance Constraint, Not a Field

GNOMON is the self-similarity constraint over recursion depth. It is NOT
a data field — it is the invariant law that deeper interpretations
preserve the same operator grammar.

Preferred language:

- GNOMON constraint
- self-similarity invariance
- closure invariant under recursion depth

Avoid language:

- "GNOMON field"
- "GNOMON value"
- "GNOMON entity"

### 18. Do Not Mix Theory with Lookup Table

Keep the layers separate:

- FRAMES.omi = semantic theory (GAUGE operators, OMICRON, GNOMON)
- FRAME_ABI.md = execution pipeline rules
- GAUGE_TABLE.omi = canonical lookup (DO NOT duplicate into theory files)

## Short Alignment Brief

OMI-LISP is a boundary-first, control-first framed rewriting system. The control
lattice is pre-language. The pre-header prepares `HEADER8`. `HEADER8` is the
runtime injection surface, not the ontology. ASCII, Braille, and Aegean are
decoding planes; BOM, ESC, BOUNDARY, and ECC are control points. OMICRON is
radix-4 control hearing. Explain bytes contextually, do not guess undocumented
mappings, and do not force the model into ordinary Lisp or ordinary text
encoding too early.
