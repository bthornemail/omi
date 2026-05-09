# omi

OMI is boundary-first, not parser-first.

> OMI treats boundaries, segmentation, and traversal as constitutional
> structure; parsing, rendering, messaging, and presentation are projections
> over that structure.

```text
canonical bytes
→ admissible segmentation
→ declared structure
→ gauge law
→ propagation
→ projection
→ receipts
→ presentation
```

The constitutional doctrine:

- [DOCTRINE.md](/root/omi/DOCTRINE.md)
- [docs/OMI-CONSTITUTIONAL-GEOMETRY.md](/root/omi/docs/OMI-CONSTITUTIONAL-GEOMETRY.md)

Supporting doctrine surfaces:

- [docs/OMI-BOUNDARY-FIRST-LANGUAGE-DOCTRINE.md](/root/omi/docs/OMI-BOUNDARY-FIRST-LANGUAGE-DOCTRINE.md)
- [docs/PHASE-80-MESSAGING-CONFLICT-AUDIT.md](/root/omi/docs/PHASE-80-MESSAGING-CONFLICT-AUDIT.md)
- [docs/PHASE-81-PROPAGATION-DOCTRINE.md](/root/omi/docs/PHASE-81-PROPAGATION-DOCTRINE.md)

OMI is an experimental bootable graph-machine substrate. The project starts
with a QEMU-loadable flat memory image and grows toward an OMI-LISP layer that
executes as close to bare metal as possible.

The guiding model is simple and strict:

- memory is graph state
- execution is graph rewrite
- time is a BOM-clocked byte-order reinterpretation event whose periods are
  field-resolution partitions
- external encodings are projections, not the source of truth

See [AGENTS.md](/root/omi/AGENTS.md) for the repository coordination contract,
[docs/README.md](/root/omi/docs/README.md) for the canonical documentation map,
and [docs/BOOT_MODEL.md](/root/omi/docs/BOOT_MODEL.md) for the first boot
target. The first-principles geometry/runtime doctrine is
[docs/OMI-FUNDAMENTAL-GEOMETRY-RUNTIME.md](/root/omi/docs/OMI-FUNDAMENTAL-GEOMETRY-RUNTIME.md).

The normative graph constraint layer is [docs/RULES.omi](/root/omi/docs/RULES.omi).
The future frame/user-space interpretation contract is
[docs/FRAMES.omi](/root/omi/docs/FRAMES.omi).

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

## Foundation Proof

The canonical foundation audit is:

```sh
make foundation-proof
```

This boots the kernel in QEMU, verifies the pinned Phase 28 and Phase 30 serial
vectors, then runs the host confirmation tests and replay validator. Future
phase work should keep this target green before claiming the sealed foundation
still holds.

The primary witness is `make qemu-foundation-test`; host tests are secondary
confirmation.

Test tiers:

```sh
make unit-test
make e2e-test
make qemu-platform-test
make riscv-qemu-foundation-test
make qemu-cross-arch-readiness
make platform-endian-test
make polyform-test
make stress-test
make full-test
```

`make foundation-proof` aliases the full tier. `STRESS_RUNS` controls the
stress loop count, defaulting to `5`. `make qemu-platform-test` verifies the
pinned QEMU foundation vectors across the supported x86 QEMU matrix:
`x86_64-pc`, `x86_64-q35`, `i386-pc`, and `i386-q35`.

RISC-V now has a minimal booted vector witness:
`make riscv-qemu-foundation-test`. Other cross-architecture coverage remains
split until boot entries exist: `make platform-endian-test` verifies endian
reinterpretation profiles for ARM, AArch64, ESP32-S3, and ESP32-C3;
`make qemu-cross-arch-readiness` verifies the matching QEMU binaries and
machine models are present.

Phase 31 adds `make polyform-test`, which materializes the tick-11 foundation
state as a deterministic polyform block and renders text, Braille, and SVG from
that same block.

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
