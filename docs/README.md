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
2. `CORE-PRINCIPLE.md` states the pre-OS CONS/projection principle.
3. `OMI-FUNDAMENTAL-GEOMETRY-RUNTIME.md` defines the first-principles geometry,
   resolution, and projection doctrine.
4. `LEXICON.omi` defines the vocabulary.
5. `ONTOLOGY.omi` defines the core OMI types and relations.
6. `RULES_GUIDE.md` explains how to read the normative rule file.
7. `RULES.omi` defines the RFC 2119-style graph constraints.
8. `FRAMES.omi` defines the future frame/user-space interpretation contract.
9. `FRAME_ABI.md` explains the frame model in implementation-facing prose.
10. `GRAPH_MEMORY_SPEC.md` defines the Phase 1 byte-level graph memory ABI.
11. `BOOT_MODEL.md` explains how the current kernel boots and evaluates memory.
12. `CONS_THEOREMS.md` records the claims the implementation is trying to make
   mechanically checkable.
13. `IMPLEMENTATION-AUDIT-PHASES-20-29.md` records the current observer,
    projection, and pre-OS law implementation evidence.
14. `PHASE-30-OSI-PROJECTION-INTEGRATION-LAW.md` describes the OSI lens-stack
    bridge over Phase 28 replay.
15. `FOUNDATION-AUDIT-PRE-OS-OSI.md` proves the Phase 28 -> Phase 29 -> Phase
    30 foundation chain.
16. `PHASE-31-POLYFORM-BLOCK-RENDERING-API.md` defines the polyform block as
    the canonical rendering witness over the foundation state.
17. `PHASE-32-POLYFORM-BLOCK-AS-BOOT-ARTIFACT.md` describes the QEMU boot
    header that serializes the canonical polyform block and verifies its
    witness.
18. `PHASE-33-QEMU-MODEL-REGISTRY.md` pins the canonical model registry as a
    booted QEMU serial witness for lazy user-space initialization.
19. `PHASE-34-LAZY-USERSPACE-INIT.md` defines the first lazy user-space mount
    table over the model registry.
20. `PHASE-35-LAZY-PROJECTION-EVALUATOR.md` defines demand-driven depth
    projection over mounted model handles.
21. `PHASE-36-MODEL-VFS-PROJECTION.md` defines the filesystem-like path
    projection over model handles and lazy views.
22. `PRECURSOR-REFERENCE-AUDIT.md` records reference-only material from the
    older Omnicron and OMI-LISP trees.

## File Roles

`ARCHITECTURE.md`
: Human explanation of OMI as a bootable graph rewriting substrate.

`CORE-PRINCIPLE.md`
: The pre-OS CONS/projection principle: hidden structure is measured by
  projection, and digits are visible measurements before they are numbers.

`OMI-FUNDAMENTAL-GEOMETRY-RUNTIME.md`
: First-principles runtime doctrine for canonical byte replay, FS/GS/RS/US
  trace structure, resolution timing, projection-gated rendering, witness
  surfaces, and optional semantic/AI augmentation.

`ONTOLOGY.omi`
: Compact machine-readable-ish vocabulary of types, relations, and invariants.

`LEXICON.omi`
: Plain definitions for project-specific words.

`RULES.omi`
: Normative constraint layer. Treat this as the source for validity language.

`FRAMES.omi`
: Normative target for frame interpretation, resolution scaling, and future
  user-space opening.

`FRAME_ABI.md`
: Human-readable ABI for control-bound, header-scaled, plane-selected frames.

`RULES_GUIDE.md`
: Commentary on the rule syntax, modal operators, and Phase 1 subset.

`BOOT_MODEL.md`
: Current QEMU/GRUB/Multiboot2 boot flow, expected serial proof, and the
  `make qemu-foundation-test`, `make qemu-platform-test`, platform endian, and
  cross-architecture QEMU readiness witnesses.

`GRAPH_MEMORY_SPEC.md`
: Current memory layout, byte classes, image generation, and replay ABI.

`CONS_THEOREMS.md`
: Closure, replay, projection, and validity claims.

`IMPLEMENTATION-AUDIT-PHASES-20-29.md`
: Evidence matrix and verification log for the Phase 20-29 observer/projection
  stack.

`PHASE-30-OSI-PROJECTION-INTEGRATION-LAW.md`
: Integration law for treating OSI layers as non-causal projections over the
  Phase 28 bitwise kernel state.

`FOUNDATION-AUDIT-PRE-OS-OSI.md`
: Foundation proof that deterministic bitwise replay, pre-OS measurement, and
  OSI projections compose without creating a new authority path. Its primary
  witness is `make qemu-foundation-test`, which boots QEMU and validates exact
  runtime serial vectors. The full audit gate is `make full-test`, also exposed
  as `make foundation-proof`.

`PHASE-31-POLYFORM-BLOCK-RENDERING-API.md`
: Host observer API that materializes the Phase 28/29/30 foundation state as a
  deterministic polyform block and renders text, Braille, and SVG projections.

`PHASE-32-POLYFORM-BLOCK-AS-BOOT-ARTIFACT.md`
: QEMU boot witness that emits the canonical polyform block header and
  validates its witness on x86 and RISC-V.

`PHASE-33-QEMU-MODEL-REGISTRY.md`
: Booted QEMU serial witness for the Phase 32 canonical trailer/world model
  registry. It emits pinned `MODEL_REGISTRY_QEMU`, `MODEL_QEMU`, and
  `WORLD_QEMU` lines from a compiled observer-only table for later lazy
  user-space initialization.

`PHASE-34-LAZY-USERSPACE-INIT.md`
: Host-side user-space init witness that mounts Phase 33 registry receipts as
  lazy model/world handles without expansion, rendering, hot-plugging, or
  execution.

`PHASE-35-LAZY-PROJECTION-EVALUATOR.md`
: Host-side lazy projection witness that reports requested FS/GS/RS/US depth
  availability over mounted model/world handles without rendering or mutation.

`PHASE-36-MODEL-VFS-PROJECTION.md`
: Host-side VFS projection witness that resolves deterministic `/omi/...` paths
  to lazy model/world handles or demand-driven projection views.

`PRECURSOR-REFERENCE-AUDIT.md`
: Reference boundary for `/root/omnicron` and `/root/omi-lisp`. These trees are
  historical sources for patterns and vectors, not authority for current OMI
  behavior.

## Source Of Truth

- For validity: use `RULES.omi`.
- For frame interpretation: use `FRAMES.omi` and `FRAME_ABI.md`.
- For byte layout: use `GRAPH_MEMORY_SPEC.md`.
- For boot behavior: use `BOOT_MODEL.md`.
- For terminology: use `LEXICON.omi`.
- For implementation coordination: use the repository-level `AGENTS.md`.

## Documentation Convention

The words `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, `MAY`, and `OPTIONAL`
are normative only when a document says it is using the `RULES.omi`/RFC 2119
meaning. Otherwise, prose is explanatory.
