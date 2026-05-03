# Precursor Reference Audit

Status: REFERENCE ONLY.

OMI was rebuilt from first principles in this repository. The older
`/root/omnicron` and `/root/omi-lisp` trees are useful historical references,
but they are not authority for current OMI behavior.

## Reference Boundary

The current repository remains authoritative for:

- kernel boot behavior
- Phase 28 bitwise law
- Phase 29 pre-OS measurement law
- Phase 30 OSI projection law
- QEMU foundation vectors
- GAUGE sealed path

Precursor code may inform implementation strategy, test vectors, and future
architecture work. It must not replace current invariants without a new audit.

## Useful Precursor Material

`/root/omnicron/riscv-baremetal/startup.S`
: RISC-V hart gate, stack setup, and `_start -> main` handoff pattern.

`/root/omnicron/riscv-baremetal/linker.ld`
: Simple RISC-V `virt` memory layout beginning at `0x80200000`.

`/root/omnicron/riscv-baremetal/run_omicron.sh`
: QEMU RISC-V launch pattern using `qemu-system-riscv64`, OpenSBI, `virt`, and
  a flat guest kernel image.

`/root/omnicron/logic/verify/verify_multi_emulator_smoke.sh`
: Multi-emulator readiness pattern for x86, RISC-V, ARM, AArch64, ESP32-S3,
  and optional big-endian lanes.

`/root/omnicron/logic/sources/endian_compatibility_vectors.ndjson`
: Endian compatibility vectors. These have been represented in the current
  C-level `platform-endian-test` rather than imported as a Node.js dependency.

`/root/omi-lisp/build_omi_riscv.sh`
: Linux/initramfs-based RISC-V VM build path. Useful as a separate higher-level
  boot strategy, not a replacement for bare-metal OMI runtime witnesses.

`/root/omi-lisp/omi_riscv_vm.c`
: Older OMI-LISP byte/control-plane runtime. Useful for control-plane design
  comparison only.

## Current Integration

Current OMI now has:

- `make platform-endian-test`
- `make qemu-cross-arch-readiness`
- `make qemu-platform-test`
- `make riscv-qemu-foundation-test`
- `make full-test`

The endian test includes platform profiles for RISC-V, ARM, AArch64, ESP32-S3,
and ESP32-C3, plus precursor-style endian vectors for UTF BOM, control-window,
32-bit state words, and 64-bit runtime lanes.

## Future Work

RISC-V 64 now has a minimal booted vector proof. To turn the remaining non-x86
QEMU readiness checks into booted runtime proof, implement per-arch entry paths
that emit the same foundation witness shape:

```text
FOUNDATION_QEMU_BEGIN
PHASE28_QEMU ...
PHASE30_QEMU ...
FOUNDATION_QEMU_END
```

Candidate sequence:

1. Add GAUGE validity to the RISC-V lane if full `VALID STATE` parity is
   required.
2. AArch64 `virt` flat kernel entry with serial output.
3. ARMv7 `virt` or board-specific entry with serial output.
4. ESP32-S3 Xtensa entry or host-supported emulator boot path.
5. ESP32-C3 RISC-V entry once a board model or acceptable `virt` profile is
   selected.
