#!/usr/bin/env sh
set -eu

ISO="${1:-build/omi.iso}"
QEMU_BIN="${OMI_QEMU_BIN:-qemu-system-x86_64}"
QEMU_MACHINE="${OMI_QEMU_MACHINE:-}"
QEMU_CPU="${OMI_QEMU_CPU:-}"
QEMU_ACCEL="${OMI_QEMU_ACCEL:-tcg}"
QEMU_TIMEOUT="${OMI_QEMU_TIMEOUT:-30s}"

if [ ! -f "$ISO" ]; then
    echo "missing iso: $ISO" >&2
    echo "run make iso first" >&2
    exit 1
fi

if ! command -v "$QEMU_BIN" >/dev/null 2>&1; then
    echo "missing qemu binary: $QEMU_BIN" >&2
    exit 1
fi

set -- "$QEMU_BIN" -m 64M -accel "$QEMU_ACCEL"

if [ -n "$QEMU_MACHINE" ]; then
    set -- "$@" -machine "$QEMU_MACHINE"
fi

if [ -n "$QEMU_CPU" ]; then
    set -- "$@" -cpu "$QEMU_CPU"
fi

set -- "$@" \
    -cdrom "$ISO" \
    -serial stdio \
    -display none \
    -device isa-debug-exit,iobase=0xf4,iosize=0x04 \
    -no-reboot

set +e
if command -v timeout >/dev/null 2>&1; then
    timeout "$QEMU_TIMEOUT" "$@"
else
    "$@"
fi
status=$?
set -e

if [ "$status" -eq 33 ]; then
    exit 0
fi

if [ "$status" -eq 124 ]; then
    echo "qemu timed out after $QEMU_TIMEOUT" >&2
fi

exit "$status"
