# OMI AGENTS.md
Version: 0.1

## 0. System Principle

OMI is a self-rewriting graph machine.

There is no separation between data, code, memory, and execution. All are
manifestations of OMI-GRAPH under BOM-clocked transformation.

## 1. Global Invariants

### I1 - Graph Invariance

All system state MUST be representable as nodes, edges, control codes, or
hybrid byte-nodes. No external opaque state is allowed.

### I2 - CONS Closure Law

Any adjacency pressure MUST resolve into one of:

- CONS binding: stable edge
- NULL collapse: no relation
- transient oscillation: re-evaluated next BOM tick

No infinite undecided edges are allowed.

### I3 - BOM Temporal Law

Time is defined as an endian inversion cycle or byte-order reinterpretation
event. Every subsystem MUST respect BOM tick boundaries.

## 2. Module Responsibilities

### kernel/

Responsible for booting flat graph memory, enforcing the BOM clock, executing
graph rewrite rules, and maintaining runtime CONS stability.

Kernel is NOT symbolic. It is deterministic.

### compiler/

Responsible for translating OMI-LISP to OMI-GRAPH IR, constructing spectral
representations of CONS clusters, and performing graph reduction and
eigen-analysis.

Compiler is a state observer, not an executor.

### kernel/vm/

Responsible for executing graph state as a runtime system, maintaining
adjacency updates, and applying rewrite rules per BOM tick.

VM = live graph physics engine.

### polyform/

Responsible for encoding graph state into external representations such as
Aegean, Braille, and mixed-base streams; decoding those streams back into graph
form; and rendering symbolic projections.

Polyform is NOT authoritative. It is projection-only.

### tools/

Responsible for QEMU integration, image building, replay validation, and
deterministic execution verification.

## 3. Boot Sequence: QEMU Model

1. Load `vm_image/omi.img` into RAM.
2. Initialize BOM clock to `0`.
3. Interpret all bytes as NULL graph nodes.
4. Begin the CONS pressure iteration loop.
5. On first non-zero adjacency, CONS emerges and the graph transitions from a
   NULL-field to a structured field.
6. System enters steady BOM-tick evolution.

## 4. Execution Model

Each tick:

```text
BOM_TICK:
    invert_byte_order(memory)
    apply_delta_law()
    compute_adjacency_field()
    resolve_cons()
    rewrite_graph()
```

## 5. Validation Rules

A valid OMI system state must:

- be replayable deterministically
- reconstruct graph from memory snapshot
- produce identical CONS structure across runs
- remain stable under BOM inversion cycles

## 6. Non-Goals

OMI is NOT:

- a general-purpose OS
- a conventional Lisp
- a simulation of physics
- dependent on hardware features beyond byte addressing

OMI IS:

- a deterministic graph rewriting substrate
- a self-interpreting memory system
- a BOM-clocked semantic machine

## 7. Agent Roles: Build Strategy

### Kernel Agent

Writes boot code, enforces invariants, and ensures QEMU execution stability.

### Compiler Agent

Builds the OMI-LISP to IR pipeline and defines CONS eigenbasis extraction.

### VM Agent

Implements the graph execution engine and ensures rewrite determinism.

### Polyform Agent

Builds the Aegean/Braille encoding pipeline and ensures lossless graph
projection.

### Tools Agent

Integrates QEMU and the image pipeline, then builds replay validation.

## 8. Phase Plan

### Phase 1

Flat memory graph image boots in QEMU.

### Phase 2

BOM clock controls the execution loop.

### Phase 3

CONS emergence verified from NULL field.

### Phase 4

Compiler extracts stable graph structures.

### Phase 5

Polyform encoding becomes reversible.

END OF AGENTS.md
