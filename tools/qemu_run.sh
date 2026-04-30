#!/usr/bin/env sh
set -eu

ISO="${1:-build/omi.iso}"

if [ ! -f "$ISO" ]; then
    echo "missing iso: $ISO" >&2
    echo "run make iso first" >&2
    exit 1
fi

set +e
qemu-system-x86_64 \
    -m 64M \
    -cdrom "$ISO" \
    -serial stdio \
    -display none \
    -device isa-debug-exit,iobase=0xf4,iosize=0x04 \
    -no-reboot
status=$?
set -e

if [ "$status" -eq 33 ]; then
    exit 0
fi

exit "$status"
