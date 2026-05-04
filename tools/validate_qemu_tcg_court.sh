#!/usr/bin/env sh
set -eu

ISO="${1:-build/omi.iso}"
OUT="${2:-build/qemu_tcg_court.log}"
WITNESS_TOOL="${3:-build/polyform_witness_recompute}"
NORM="${OUT}.normalized"

mkdir -p "$(dirname "$OUT")"

./tools/qemu_tcg_run.sh "$ISO" > "$OUT"
tr -d '\r' < "$OUT" > "$NORM"

require_line() {
    if ! grep -Fx "$1" "$NORM" >/dev/null; then
        echo "missing expected QEMU TCG court line:" >&2
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
require_line "MODEL_REGISTRY_QEMU_BEGIN"
require_line "MODEL_QEMU object=model.trailer.wike-ebike-cargo fs=1 gs=9 rs=29 us=76 authority=declaration-trace"
require_line "WORLD_QEMU world=world.cargo-yard-demo fs=1 gs=3 rs=7 us=22 objects=3 interactions=3"
require_line "WORLD_QEMU relation=hitch-link.001 source=bicycle.001.hitch target=trailer.001.tow-arm"
require_line "WORLD_QEMU relation=load-support.001 source=cargo.001.mass target=trailer.001.panel.floor"
require_line "WORLD_QEMU relation=rolling.001 source=bicycle.001.forward-motion target=trailer.001.motion"
require_line "MODEL_QEMU projection=far depth=FS.GS"
require_line "MODEL_QEMU projection=middle depth=FS.GS.RS"
require_line "MODEL_QEMU projection=near depth=FS.GS.RS.US"
require_line "MODEL_QEMU projection=inspect depth=full-trace"
require_line "MODEL_REGISTRY_QEMU_END"
require_line "VALID STATE"
require_line "OMI HALT"

foundation_line=$(grep -nFx "FOUNDATION_QEMU_BEGIN" "$NORM" | head -n 1 | cut -d: -f1)
foundation_end=$(grep -nFx "FOUNDATION_QEMU_END" "$NORM" | head -n 1 | cut -d: -f1)
registry_line=$(grep -nFx "MODEL_REGISTRY_QEMU_BEGIN" "$NORM" | head -n 1 | cut -d: -f1)
registry_end=$(grep -nFx "MODEL_REGISTRY_QEMU_END" "$NORM" | head -n 1 | cut -d: -f1)
valid_line=$(grep -nFx "VALID STATE" "$NORM" | head -n 1 | cut -d: -f1)
halt_line=$(grep -nFx "OMI HALT" "$NORM" | head -n 1 | cut -d: -f1)

if [ "$foundation_line" -ge "$foundation_end" ] ||
   [ "$foundation_end" -ge "$registry_line" ] ||
   [ "$registry_line" -ge "$registry_end" ] ||
   [ "$registry_end" -ge "$valid_line" ] ||
   [ "$valid_line" -ge "$halt_line" ]; then
    echo "QEMU TCG court witness ordering failed" >&2
    echo "captured output: $OUT" >&2
    exit 1
fi

block_line=$(grep -F "POLYFORM_BLOCK tick=11" "$NORM" | head -n 1)
boot_witness=$(printf '%s\n' "$block_line" | sed -n 's/.*witness=\(0x[0-9a-fA-F]*\).*/\1/p')
recomputed_witness=$("$WITNESS_TOOL" 11)

if [ "$boot_witness" != "$recomputed_witness" ]; then
    echo "TCG court polyform witness mismatch:" >&2
    echo "boot=$boot_witness recomputed=$recomputed_witness" >&2
    echo "captured output: $OUT" >&2
    exit 1
fi

echo "QEMU TCG portability court verified: $OUT"
