#!/usr/bin/env sh
set -eu

ELF="${1:-build-riscv/omi-riscv.elf}"
QEMU="${OMI_RISCV_QEMU:-qemu-system-riscv64}"

if [ ! -f "$ELF" ]; then
    echo "missing RISC-V ELF: $ELF" >&2
    echo "run make riscv-image first" >&2
    exit 1
fi

if ! command -v "$QEMU" >/dev/null 2>&1; then
    echo "missing qemu binary: $QEMU" >&2
    exit 1
fi

set +e
"$QEMU" \
    -machine virt \
    -m 128M \
    -nographic \
    -bios none \
    -kernel "$ELF" \
    -no-reboot
status=$?
set -e

if [ "$status" -eq 0 ]; then
    exit 0
fi

exit "$status"
