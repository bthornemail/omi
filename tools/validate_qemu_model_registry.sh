#!/usr/bin/env sh
set -eu

ISO="${1:-build/omi.iso}"
OUT="${2:-build/qemu_model_registry.log}"
NORM="${OUT}.normalized"

mkdir -p "$(dirname "$OUT")"

./tools/qemu_run.sh "$ISO" > "$OUT"
tr -d '\r' < "$OUT" > "$NORM"

require_line() {
    if ! grep -Fx "$1" "$NORM" >/dev/null; then
        echo "missing expected QEMU model registry line:" >&2
        echo "$1" >&2
        echo "captured output: $OUT" >&2
        exit 1
    fi
}

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

echo "QEMU model registry witness verified: $OUT"
