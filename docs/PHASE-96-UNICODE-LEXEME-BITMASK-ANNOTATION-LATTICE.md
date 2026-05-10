# Phase 96 - Unicode Lexeme Bitmask Annotation Lattice

Phase 96 declares Unicode blocks as versioned annotation lattices. A codepoint
may act as a mux/demux feature operator over a lexeme, synset, UI fixture, or
message-passing projection, but it does not become semantic authority.

Locked rule:

> **Any Unicode block can become a versioned annotation lattice: codepoints act as mux/demux feature operators over lexeme and synset edges, while canonical declarations and receipts remain authority.**

## Boundary

This phase adds a small executable annotation court. It does not import a full
Unicode database, WordNet corpus, ontology, GNN, personality model, DNA model,
or diagnostic classifier.

The authority split is:

```text
Unicode block     = versioned annotation surface
codepoint         = mux/demux feature operator
bitmask           = deterministic projection feature
lexeme/synset     = grounding edge
S-P-O-M           = incidence projection
receipt           = coherence witness
declaration       = authority
```

Guardrail:

```text
Unicode codepoints are annotation operators, not semantic authority.
```

## Lattice

The declared annotation ladder is:

```text
Unicode block
-> codepoint partition
-> bitmask hierarchy
-> lexeme annotation
-> synset edge interpolation
-> S-P-O-M relation
-> SCGNN/message-passing projection
-> receipt witness
```

The executable court partitions a pinned block into deterministic rows and
columns, maps a codepoint to a bitmask feature, and attaches that feature to a
lexeme/synset edge. Changing the annotation codepoint changes the projection
receipt; it does not change the underlying lexeme/synset identity receipt.

## Privacy And Classification Guardrails

Personality, genealogy, DNA, symbols, songs, Unicode blocks, and ontology types
are projection and annotation spaces, not identity truth.

Persona-style labels may be used as synthetic UI fixtures or archetype
projections. They are not psychological diagnoses.

DNA and genealogy annotations are privacy-sensitive. They must use explicit
consent or public/synthetic demo data, and projection symbols must never infer
ancestry, health, or identity.

## Validation

The Phase 96 test proves:

- the declaration parses deterministically;
- Unicode blocks are pinned and non-authoritative;
- codepoints partition into deterministic row/column bitmask features;
- lexeme/synset annotations derive S-P-O-M edges;
- annotation changes projection receipts, not identity receipts;
- `omi-system.omilisp` references Phase 96 by link only.
