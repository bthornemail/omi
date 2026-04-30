# OMI Architecture

OMI is an experimental bootable graph-machine substrate. It starts with a flat
memory image, boots a tiny kernel in QEMU, interprets bytes as graph material,
and advances the state through bounded BOM-clocked evaluation.

Phase 1 is deliberately modest: prove that a small graph memory image can be
loaded, interpreted, summarized, and replayed deterministically.

## Core Claim

OMI treats memory, data, code, and execution as different views of the same
graph substrate.

```text
memory bytes -> byte nodes -> adjacency -> CONS/null/transient resolution
```

The Phase 1 kernel does not yet execute OMI-LISP. It proves the lower substrate:

- there is a bootable machine boundary
- graph memory can be loaded into that machine
- byte adjacency can be interpreted deterministically
- replay can produce the same summary outside the kernel

## Layers

### Machine Layer

QEMU defines the machine. GRUB loads the kernel and graph image. The kernel runs
without a host operating system once control is transferred.

Current target:

- `qemu-system-x86_64`
- GRUB Multiboot2
- freestanding 32-bit x86 kernel
- serial output through COM1

### Memory Layer

`vm_image/omi.img` is the first graph memory image. It is a flat byte sequence,
not a filesystem. Each byte can be interpreted as graph material.

The current implementation treats adjacent byte pairs as pressure sites:

- equal non-zero bytes become CONS bindings
- pairs containing zero collapse to NULL
- unequal non-zero pairs remain transient

### BOM Layer

BOM is the temporal operator. In Phase 1, a BOM tick is represented by inverting
the byte order of the loaded memory view.

This is intentionally simple. It makes two-tick replay visible:

```text
tick 0: original order
tick 1: inverted order
tick 2: original order
```

### CONS Layer

CONS is a derived relation, not an independently authoritative store. The
kernel and replay validator both compute it from memory.

The same image and rules should produce the same summary in both places.

### Rules Layer

`RULES.omi` is the normative layer. It says what states are valid, forbidden,
permitted, and preferred. It does not directly mutate memory.

Think of it as a fixed-point filter:

```text
valid_state = constraints(memory interpreted through BOM and CONS)
```

### Projection Layer

Polyform encodings such as Braille, Aegean, and mixed-base are future external
views of graph state. They are not authoritative in Phase 1.

## Phase 1 Data Flow

```text
tools/image_builder
  -> vm_image/omi.img
  -> GRUB module in build/omi.iso
  -> kernel Multiboot2 module scan
  -> OMI graph memory view
  -> BOM/CONS summaries over serial

vm_image/omi.img
  -> tools/replay_validator
  -> host-side BOM/CONS summaries
  -> replay deterministic check
```

## What Exists Now

- bootable QEMU ISO
- Multiboot2 kernel entry
- serial proof of boot
- BOM clock
- byte-order inversion
- byte-pair CONS/null/transient summary
- image builder
- host replay validator
- unit tests for the low-level primitives

## What Does Not Exist Yet

- a Lisp reader or evaluator in the kernel
- dynamic allocation
- interrupts beyond the minimal halt path
- persistent storage
- a full Datalog engine
- graph regions as runtime objects
- SID/OID promotion as executable logic
- polyform round-trip validation

## Design Discipline

OMI keeps three things separate:

- `RULES.omi` defines validity.
- `GRAPH_MEMORY_SPEC.md` defines the current byte representation.
- Kernel/tool code implements the Phase 1 subset.

That separation matters. It lets the project grow from a tiny executable proof
without pretending the whole semantic machine is already complete.
