#!/usr/bin/env sh
set -eu

ISO="${1:-build/omi.iso}"
OUT="${2:-build/qemu_model_trace.log}"

sh ./tools/validate_qemu_model_registry.sh "$ISO" "$OUT"
