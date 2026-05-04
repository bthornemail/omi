#!/usr/bin/env sh
set -eu

ISO="${1:-build/omi.iso}"
OUT="${2:-build/qemu_tcg_foundation.log}"
WITNESS_TOOL="${3:-build/polyform_witness_recompute}"

OMI_QEMU_ACCEL=tcg sh ./tools/qemu_foundation_test.sh "$ISO" "$OUT" "$WITNESS_TOOL"

if ! grep -Fx "FOUNDATION_QEMU_BEGIN" "${OUT}.normalized" >/dev/null; then
    echo "TCG foundation court missing foundation begin line" >&2
    exit 1
fi

echo "QEMU TCG foundation court verified: $OUT"
