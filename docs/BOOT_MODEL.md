# Boot Model

The first OMI boot target is deliberately small: QEMU loads a flat memory image,
the kernel treats every byte as graph material, and the runtime advances state
only at BOM tick boundaries.

## Purpose

The boot model exists to answer one question:

Can OMI define a machine, load graph memory into it, run deterministic graph
evaluation, and prove that the same image can be replayed outside the machine?

Phase 1 answered this with a GRUB Multiboot2 kernel and serial output. Phase 2
kept that boot path and replaced the core loop with BOM address traversal,
runtime rules evaluation, and fixed-point/orbit halt conditions. Phase 3 adds
symbol extraction and a single rewrite before final re-stabilization.
Phase 4 derives the rewrite rule from `RULES.omi` through a host-generated rule
table linked into the kernel.
Phase 5 also derives a diagnostic table from `RULES.omi` and prints a validity
certificate after convergence.
Phase 6 adds content-addressed symbol identity so replay can compare symbols by
hash/id rather than only table index.

## Phase 1 Target

1. Build `vm_image/omi.img` from deterministic seed material.
2. Load the Multiboot2 kernel and `omi.img` module into an emulated machine.
3. Initialize the BOM clock to `0`.
4. Interpret every byte as a NULL graph node.
5. Run one bounded CONS resolution pass.
6. Emit serial tick summaries and halt after a bounded run.

## Boot Stack

```text
host shell
  -> make run
  -> tools/qemu_run.sh
  -> qemu-system-x86_64
  -> GRUB
  -> Multiboot2 kernel
  -> OMI kernel entry
  -> graph memory module scan
  -> BOM address traversal
  -> RULES/CONS evaluation
  -> symbol extraction
  -> rewrite
```

Current artifacts:

- `build/omi-kernel.elf`: freestanding 32-bit Multiboot2 kernel
- `vm_image/omi.img`: flat graph memory image
- `build/omi.iso`: GRUB ISO containing the kernel and image module

## Why QEMU

QEMU gives OMI a formal machine boundary before real hardware exists. The QEMU
command line defines the machine, the image defines initial memory, and replay
validation checks whether graph evolution is deterministic.

The current QEMU target is intentionally headless. Serial output is the proof
channel because it works in terminals, CI, and Termux-like workflows.

## Phase 1 Build Interface

- `make image` creates the flat graph image.
- `make kernel` builds the freestanding Multiboot2 kernel.
- `make iso` packages the kernel and graph image with GRUB.
- `make run` boots the ISO in QEMU and prints serial output.
- `make qemu-foundation-test` boots the ISO in QEMU and validates the pinned
  Phase 28/Phase 30 foundation serial vectors.
- `make qemu-platform-test` validates the same pinned vectors on the supported
  x86 QEMU matrix: `x86_64-pc`, `x86_64-q35`, `i386-pc`, and `i386-q35`.
- `make riscv-qemu-foundation-test` boots the minimal RISC-V `virt` image and
  validates the same pinned Phase 28/Phase 30 foundation serial vectors.
- `make platform-endian-test` validates endian reinterpretation profiles for
  RISC-V, ARM, AArch64, ESP32-S3, and ESP32-C3.
- `make qemu-cross-arch-readiness` checks that the corresponding QEMU binaries
  and machine models are available, while marking OMI non-x86 boot entries as
  pending.
- `make unit-test` runs focused host tests for the graph/runtime laws and
  Phase 28/29/30 witnesses.
- `make e2e-test` runs the QEMU foundation witness, GAUGE replay witness, and
  host replay validator, including the multi-platform QEMU matrix.
- `make stress-test` repeats QEMU foundation and replay validation. Set
  `STRESS_RUNS=N` to change the loop count.
- `make full-test` runs unit, end-to-end, and stress tiers.
- `make foundation-proof` aliases `make full-test`.
- `make replay` validates the host-side BOM/CONS model against the same image.

## Foundation Runtime Witness

`make qemu-foundation-test` is the primary foundation witness. It runs the real
booted kernel through QEMU, captures serial output, and requires exact lines for
the Phase 28 bitwise runtime vector, the Phase 30 seven-layer OSI projection
vector, `VALID STATE`, and `OMI HALT`.

The pinned runtime vector is maintained in `tools/qemu_foundation_test.sh`.
Changes to Phase 28, Phase 30, the serial format, or the sealed GAUGE boot path
must either preserve that witness or intentionally update the audit record in
`docs/FOUNDATION-AUDIT-PRE-OS-OSI.md`.

The full gate is `make full-test`. It contains:

- unit tier: host law tests
- end-to-end tier: QEMU boot, multi-platform QEMU matrix, RISC-V vector boot,
  and replay witnesses
- stress tier: repeated QEMU foundation and replay validation

The x86 matrix boots the full 32-bit Multiboot2 kernel and verifies `VALID
STATE` plus `OMI HALT`. The RISC-V lane is a minimal flat image that proves the
same Phase 28/30 vectors with shared C runtime code; it does not yet run the
GAUGE validity path.

Requested non-x86 targets are tracked as follows:

| Target | QEMU surface | Endian profile | OMI boot status |
|--------|--------------|----------------|-----------------|
| RISC-V 32 | `qemu-system-riscv32 virt` | little-endian | needs arch entry |
| RISC-V 64 | `qemu-system-riscv64 virt` | little-endian | Phase 28/30 vector boot |
| ARMv7 | `qemu-system-arm virt` | little/big profile check | needs arch entry |
| AArch64 | `qemu-system-aarch64 virt` | little/big profile check | needs arch entry |
| ESP32-S3 | `qemu-system-xtensa esp32s3` | little-endian | needs Xtensa entry |
| ESP32-C3 | `qemu-system-riscv32 virt` readiness | little-endian | needs ESP32-C3 board or RISC-V entry |

## Expected Serial Trace

A successful boot emits lines like:

```text
OMI BOOT
multiboot magic=0x36d76289 info=0x001012f0
BOM tick 0: bytes=4096 bindings=1024 null=512 transient=512
BOM tick 1: bytes=4096 bindings=1024 null=512 transient=512
BOM tick 2: bytes=4096 bindings=1024 null=512 transient=512
BOM tick 3: bytes=4096 bindings=1024 null=512 transient=512
OMI HALT
```

The exact Multiboot info address may vary. The tick summaries should remain
deterministic for the same image and rule implementation.

## Kernel Entry Contract

GRUB enters the kernel through the Multiboot2 entry point. The boot assembly
sets a stack, preserves the Multiboot registers, and calls the C kernel entry.

The C entry expects:

- Multiboot2 magic value `0x36d76289`
- pointer to the Multiboot information structure
- optional module containing `omi.img`

If the graph memory module is missing, the kernel has a tiny fallback byte array
so boot diagnostics can still run. That fallback is not the normal Phase 1
image path.

## Runtime Loop

The current runtime loop is bounded but semantic:

1. begin at orbit seed address `0x00000001`
2. evaluate executable rules over a fixed orbit window
3. derive CONS/null/transient relations from traversed address pairs
4. record a small fixed-size set of CONS edges
5. extract contiguous CONS regions as symbols
6. compute symbol content hashes and symbol ids
7. compare the current summary with the previous summary
8. on the first fixed point, select the extracted rewrite rule
9. split one symbol region through that rule
10. re-run from the orbit seed
11. halt on the next stable fixed point or orbit closure
12. evaluate named diagnostics
13. print warnings/violations and `VALID STATE` or `OMI INVALID STATE`
14. print `OMI HALT`
15. exit QEMU through the debug-exit device

This loop is deliberately finite so `make run` can be automated.

## Normative Rules

`docs/RULES.omi` defines the Datalog-like RFC2119 constraint layer for OMI
state. Phase 1 implements the byte-pair CONS subset of those rules in the QEMU
kernel and host replay validator.

## Failure Modes

Missing QEMU
: `make run` cannot boot the ISO.

Missing GRUB rescue tools
: `make iso` cannot package the kernel. `grub-mkrescue`, `xorriso`, and
`mtools` are expected on the host.

Invalid Multiboot2 kernel
: `grub-file --is-x86-multiboot2 build/omi-kernel.elf` should fail if the
header or link layout is broken.

Replay mismatch
: `make replay` should fail if the host-side BOM/CONS implementation no longer
matches the expected two-tick deterministic cycle.
