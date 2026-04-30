# omi

OMI is an experimental bootable graph-machine substrate. The project starts
with a QEMU-loadable flat memory image and grows toward an OMI-LISP layer that
executes as close to bare metal as possible.

The guiding model is simple and strict:

- memory is graph state
- execution is graph rewrite
- time is a BOM-clocked byte-order reinterpretation event
- external encodings are projections, not the source of truth

See [AGENTS.md](/root/omi/AGENTS.md) for the repository coordination contract,
[docs/README.md](/root/omi/docs/README.md) for the documentation map, and
[docs/BOOT_MODEL.md](/root/omi/docs/BOOT_MODEL.md) for the first boot target.

The normative graph constraint layer is [docs/RULES.omi](/root/omi/docs/RULES.omi).

## Layout

```text
docs/       OMI ontology, rules, boot model, theorem notes, and memory spec
kernel/     Bare-metal boot path, runtime loop, and graph VM core
compiler/   OMI-LISP to graph IR pipeline
polyform/   Reversible symbolic encodings and render projections
tools/      QEMU, image building, graph dumping, replay validation
tests/      Focused C tests for invariants and deterministic behavior
vm_image/   Generated graph memory images and seeds
```

## First Milestone

Build a tiny deterministic memory image, load it under QEMU, and prove that a
snapshot can be replayed into the same CONS structure across BOM ticks.

## Phase 1 Commands

```sh
make test
make image
make replay
make kernel
make iso
make run
```

`make run` boots a GRUB Multiboot2 ISO in QEMU and writes OMI kernel output to
the serial console.
