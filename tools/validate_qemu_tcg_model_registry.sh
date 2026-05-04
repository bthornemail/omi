#!/usr/bin/env sh
set -eu

ISO="${1:-build/omi.iso}"
OUT="${2:-build/qemu_tcg_model_registry.log}"

OMI_QEMU_ACCEL=tcg sh ./tools/validate_qemu_model_registry.sh "$ISO" "$OUT"

if ! grep -Fx "MODEL_REGISTRY_QEMU_BEGIN" "${OUT}.normalized" >/dev/null; then
    echo "TCG model registry court missing registry begin line" >&2
    exit 1
fi

echo "QEMU TCG model registry court verified: $OUT"
