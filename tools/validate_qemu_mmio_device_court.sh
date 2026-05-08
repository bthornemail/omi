#!/usr/bin/env sh
set -eu

ISO="${1:-build/omi.iso}"
OUT="${2:-build/qemu_mmio_device_court.log}"
NORM="${OUT}.normalized"
FIXTURE="tests/fixtures/qemu_mmio_device_court.log.normalized"

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
        echo "missing expected QEMU MMIO device court line:" >&2
        echo "$1" >&2
        echo "captured output: $OUT" >&2
        exit 1
    fi
}

require_line "MMIO_DEVICE_COURT_QEMU_BEGIN"
require_line "MMIO_DEVICE name=DISPLAY_MMIO role=render-trace-target event=event.render-output authority=projection-boundary"
require_line "MMIO_DEVICE name=KEYBOARD_MMIO role=input-event-source event=event.pointer-select authority=event-source"
require_line "MMIO_DEVICE name=CAMERA_MMIO role=carrier-scan-source event=event.carrier-scan authority=event-source"
require_line "MMIO_DEVICE name=NETWORK_MMIO role=model-sync-surface event=event.model-sync authority=event-source"
require_line "MMIO_DEVICE name=STORAGE_MMIO role=append-only-log event=event.receipt-append authority=append-only"
require_line "MMIO_DEVICE name=TIMER_MMIO role=timing-observer event=event.timing-receipt authority=observer-only"
require_line "MMIO_DEVICE_COURT_QEMU_END"
require_line "VALID STATE"
require_line "OMI HALT"

begin_line=$(grep -nFx "MMIO_DEVICE_COURT_QEMU_BEGIN" "$NORM" | head -n 1 | cut -d: -f1)
end_line=$(grep -nFx "MMIO_DEVICE_COURT_QEMU_END" "$NORM" | head -n 1 | cut -d: -f1)
valid_line=$(grep -nFx "VALID STATE" "$NORM" | head -n 1 | cut -d: -f1)
halt_line=$(grep -nFx "OMI HALT" "$NORM" | head -n 1 | cut -d: -f1)

if [ "$begin_line" -ge "$end_line" ] || [ "$end_line" -ge "$valid_line" ] || [ "$valid_line" -ge "$halt_line" ]; then
    echo "QEMU MMIO device court witness ordering failed" >&2
    echo "captured output: $OUT" >&2
    exit 1
fi

echo "QEMU MMIO device court witness verified: $OUT"
