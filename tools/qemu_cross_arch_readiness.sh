#!/usr/bin/env sh
set -eu

check_qemu() {
    name="$1"
    qemu_bin="$2"
    machine="$3"

    if ! command -v "$qemu_bin" >/dev/null 2>&1; then
        echo "QEMU_CROSS_ARCH name=$name qemu=$qemu_bin machine=$machine status=MISSING_QEMU"
        return 1
    fi

    if "$qemu_bin" -machine help 2>/dev/null | awk '{print $1}' | grep -Fx "$machine" >/dev/null; then
        echo "QEMU_CROSS_ARCH name=$name qemu=$qemu_bin machine=$machine status=QEMU_READY boot=NEEDS_ARCH_ENTRY"
        return 0
    fi

    echo "QEMU_CROSS_ARCH name=$name qemu=$qemu_bin machine=$machine status=MISSING_MACHINE"
    return 1
}

missing=0

check_qemu "riscv32-virt" "qemu-system-riscv32" "virt" || missing=1
check_qemu "riscv64-virt" "qemu-system-riscv64" "virt" || missing=1
check_qemu "armv7-virt" "qemu-system-arm" "virt" || missing=1
check_qemu "aarch64-virt" "qemu-system-aarch64" "virt" || missing=1
check_qemu "esp32-s3-xtensa" "qemu-system-xtensa" "esp32s3" || missing=1

if command -v qemu-system-riscv32 >/dev/null 2>&1; then
    echo "QEMU_CROSS_ARCH name=esp32-c3-riscv32 qemu=qemu-system-riscv32 machine=virt status=QEMU_READY boot=NEEDS_ESP32C3_BOARD_OR_RISCV_ENTRY"
else
    echo "QEMU_CROSS_ARCH name=esp32-c3-riscv32 qemu=qemu-system-riscv32 machine=virt status=MISSING_QEMU"
    missing=1
fi

if [ "$missing" -ne 0 ]; then
    exit 1
fi

echo "QEMU cross-architecture binaries are present; OMI non-x86 boot entries are pending"
