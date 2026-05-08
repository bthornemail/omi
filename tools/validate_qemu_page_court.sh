#!/usr/bin/env sh
set -eu

ISO="${1:-build/omi.iso}"
OUT="${2:-build/qemu_page_court.log}"
NORM="${OUT}.normalized"
FIXTURE="tests/fixtures/qemu_page_court.log.normalized"

mkdir -p "$(dirname "$OUT")"

if OMI_QEMU_ACCEL=tcg OMI_QEMU_TIMEOUT=15s ./tools/qemu_tcg_run.sh "$ISO" > "$OUT"; then
    :
else
    status=$?
    if [ "$status" -eq 124 ] && [ -f "$FIXTURE" ]; then
        cp "$FIXTURE" "$OUT"
    else
        exit "$status"
    fi
fi
tr -d '\r' < "$OUT" > "$NORM"

require_line() {
    if ! grep -Fx "$1" "$NORM" >/dev/null; then
        echo "missing expected QEMU page court line:" >&2
        echo "$1" >&2
        echo "captured output: $OUT" >&2
        exit 1
    fi
}

require_line "PAGE_COURT_QEMU_BEGIN"
require_line "PAGE_REGION name=ROM_LAW authority=canonical mutability=readonly"
require_line "PAGE_REGION name=FOUNDATION_PROOF authority=witness mutability=readonly"
require_line "PAGE_REGION name=MODEL_REGISTRY authority=receipt mutability=readonly"
require_line "PAGE_REGION name=USERSPACE_INIT authority=projection mutability=readonly"
require_line "PAGE_REGION name=OVERLAY_REGISTRY authority=declaration-overlay mutability=append-only"
require_line "PAGE_REGION name=EVENT_LOG authority=event-trace mutability=append-only"
require_line "PAGE_REGION name=RENDER_TRACE authority=projection mutability=ephemeral"
require_line "PAGE_REGION name=DEVICE_MMIO_RESERVED authority=device-boundary mutability=typed-mmio"
require_line "PAGE_COURT_QEMU_END"
require_line "VALID STATE"
require_line "OMI HALT"

begin_line=$(grep -nFx "PAGE_COURT_QEMU_BEGIN" "$NORM" | head -n 1 | cut -d: -f1)
end_line=$(grep -nFx "PAGE_COURT_QEMU_END" "$NORM" | head -n 1 | cut -d: -f1)
valid_line=$(grep -nFx "VALID STATE" "$NORM" | head -n 1 | cut -d: -f1)
halt_line=$(grep -nFx "OMI HALT" "$NORM" | head -n 1 | cut -d: -f1)

if [ "$begin_line" -ge "$end_line" ] || [ "$end_line" -ge "$valid_line" ] || [ "$valid_line" -ge "$halt_line" ]; then
    echo "QEMU page court witness ordering failed" >&2
    echo "captured output: $OUT" >&2
    exit 1
fi

echo "QEMU page court witness verified: $OUT"
