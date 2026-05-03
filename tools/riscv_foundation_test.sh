#!/usr/bin/env sh
set -eu

ELF="${1:-build-riscv/omi-riscv.elf}"
OUT="${2:-build-riscv/riscv_foundation.log}"
WITNESS_TOOL="${3:-build/polyform_witness_recompute}"
NORM="${OUT}.normalized"

mkdir -p "$(dirname "$OUT")"

sh ./riscv/run_qemu.sh "$ELF" > "$OUT"
tr -d '\r' < "$OUT" > "$NORM"

require_line() {
    if ! grep -Fx "$1" "$NORM" >/dev/null; then
        echo "missing expected RISC-V foundation line:" >&2
        echo "$1" >&2
        echo "captured output: $OUT" >&2
        exit 1
    fi
}

require_line "FOUNDATION_QEMU_BEGIN"
require_line "PHASE28_QEMU tick=0 K=0x00 fano=0x01 sonar_hi=0x00000000 sonar_lo=0x00000001"
require_line "PHASE28_QEMU tick=1 K=0x1d fano=0x02 sonar_hi=0x00000000 sonar_lo=0x00000002"
require_line "PHASE28_QEMU tick=2 K=0x88 fano=0x04 sonar_hi=0x00000000 sonar_lo=0x00000004"
require_line "PHASE28_QEMU tick=3 K=0x6a fano=0x08 sonar_hi=0x00000000 sonar_lo=0x00000008"
require_line "PHASE28_QEMU tick=4 K=0x00 fano=0x10 sonar_hi=0x00000000 sonar_lo=0x00000010"
require_line "PHASE28_QEMU tick=5 K=0x1d fano=0x20 sonar_hi=0x00000000 sonar_lo=0x00000020"
require_line "PHASE30_QEMU layer=1 digit=0x31 address=0x000aaa81 simplex=1"
require_line "PHASE30_QEMU layer=2 digit=0x3d address=0x0e04f67d simplex=2"
require_line "PHASE30_QEMU layer=3 digit=0x3c address=0x391b204c simplex=3"
require_line "PHASE30_QEMU layer=4 digit=0x33 address=0x36932ba3 simplex=4"
require_line "PHASE30_QEMU layer=5 digit=0x30 address=0xaf66ca00 simplex=5"
require_line "PHASE30_QEMU layer=6 digit=0x3c address=0x7ceb7cac simplex=6"
require_line "PHASE30_QEMU layer=7 digit=0x3f address=0xa944551f simplex=7"
require_line "POLYFORM_BLOCK tick=11 K=0x6a fano=0x10 sonar_hi=0x00000000 sonar_lo=0x00000800 digit=0x3c witness=0x77e53ee5"
require_line "FOUNDATION_QEMU_END"

BLOCK_LINE=$(grep -F "POLYFORM_BLOCK tick=11" "$NORM" | head -n 1)
BOOT_WITNESS=$(printf '%s\n' "$BLOCK_LINE" | sed -n 's/.*witness=\(0x[0-9a-fA-F]*\).*/\1/p')
RECOMPUTED_WITNESS=$("$WITNESS_TOOL" 11)

if [ "$BOOT_WITNESS" != "$RECOMPUTED_WITNESS" ]; then
    echo "RISC-V polyform witness mismatch:" >&2
    echo "boot=$BOOT_WITNESS recomputed=$RECOMPUTED_WITNESS" >&2
    echo "captured output: $OUT" >&2
    exit 1
fi

echo "RISC-V foundation runtime vectors and polyform block verified: $OUT"
