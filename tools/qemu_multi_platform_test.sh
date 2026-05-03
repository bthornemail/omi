#!/usr/bin/env sh
set -eu

ISO="${1:-build/omi.iso}"
OUT_DIR="${2:-build/qemu-platforms}"

if [ ! -f "$ISO" ]; then
    echo "missing iso: $ISO" >&2
    echo "run make iso first" >&2
    exit 1
fi

mkdir -p "$OUT_DIR"

run_platform() {
    name="$1"
    qemu_bin="$2"
    machine="$3"

    if ! command -v "$qemu_bin" >/dev/null 2>&1; then
        echo "SKIP $name: missing $qemu_bin"
        return 0
    fi

    echo "QEMU platform $name: $qemu_bin machine=$machine"
    OMI_QEMU_BIN="$qemu_bin" OMI_QEMU_MACHINE="$machine" \
        sh ./tools/qemu_foundation_test.sh "$ISO" "$OUT_DIR/$name.log"
}

run_platform "x86_64-pc" "qemu-system-x86_64" "pc"
run_platform "x86_64-q35" "qemu-system-x86_64" "q35"
run_platform "i386-pc" "qemu-system-i386" "pc"
run_platform "i386-q35" "qemu-system-i386" "q35"

echo "QEMU multi-platform foundation vectors verified"
