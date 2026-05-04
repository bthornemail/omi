#!/usr/bin/env sh
set -eu

ISO="${1:-build/omi.iso}"

OMI_QEMU_ACCEL=tcg ./tools/qemu_run.sh "$ISO"
