# OMI Documentation

This directory describes OMI from four angles:

- descriptive ontology: the names and relations the system uses
- normative rules: the validity constraints a graph state must satisfy
- executable substrate: the current QEMU/Multiboot2 boot path
- verification model: replay, closure, and determinism expectations

The documentation is intentionally split so natural-language explanation does
not blur into normative requirements. When a behavior is mandatory, the rule
belongs in `RULES.omi` or in a spec section that explicitly points to it.

## Reading Order

1. `ARCHITECTURE.md` gives the mental model of the system.
2. `LEXICON.omi` defines the vocabulary.
3. `ONTOLOGY.omi` defines the core OMI types and relations.
4. `RULES_GUIDE.md` explains how to read the normative rule file.
5. `RULES.omi` defines the RFC 2119-style graph constraints.
6. `GRAPH_MEMORY_SPEC.md` defines the Phase 1 byte-level graph memory ABI.
7. `BOOT_MODEL.md` explains how the current kernel boots and evaluates memory.
8. `CONS_THEOREMS.md` records the claims the implementation is trying to make
   mechanically checkable.

## File Roles

`ARCHITECTURE.md`
: Human explanation of OMI as a bootable graph rewriting substrate.

`ONTOLOGY.omi`
: Compact machine-readable-ish vocabulary of types, relations, and invariants.

`LEXICON.omi`
: Plain definitions for project-specific words.

`RULES.omi`
: Normative constraint layer. Treat this as the source for validity language.

`RULES_GUIDE.md`
: Commentary on the rule syntax, modal operators, and Phase 1 subset.

`BOOT_MODEL.md`
: Current QEMU/GRUB/Multiboot2 boot flow and expected serial proof.

`GRAPH_MEMORY_SPEC.md`
: Current memory layout, byte classes, image generation, and replay ABI.

`CONS_THEOREMS.md`
: Closure, replay, projection, and validity claims.

## Source Of Truth

- For validity: use `RULES.omi`.
- For byte layout: use `GRAPH_MEMORY_SPEC.md`.
- For boot behavior: use `BOOT_MODEL.md`.
- For terminology: use `LEXICON.omi`.
- For implementation coordination: use the repository-level `AGENTS.md`.

## Documentation Convention

The words `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, `MAY`, and `OPTIONAL`
are normative only when a document says it is using the `RULES.omi`/RFC 2119
meaning. Otherwise, prose is explanatory.
