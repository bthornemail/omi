#!/usr/bin/env sh
set -eu

ISO="${1:-build/omi.iso}"
RUNS="${2:-5}"
OUT_DIR="${3:-build/stress}"

if [ ! -f "$ISO" ]; then
    echo "missing iso: $ISO" >&2
    echo "run make iso first" >&2
    exit 1
fi

case "$RUNS" in
    ''|*[!0-9]*)
        echo "stress run count must be a positive integer: $RUNS" >&2
        exit 1
        ;;
esac

if [ "$RUNS" -lt 1 ]; then
    echo "stress run count must be at least 1" >&2
    exit 1
fi

mkdir -p "$OUT_DIR"

i=1
while [ "$i" -le "$RUNS" ]; do
    echo "stress run $i/$RUNS: QEMU foundation witness"
    sh ./tools/qemu_foundation_test.sh "$ISO" "$OUT_DIR/qemu_foundation_$i.log"

    echo "stress run $i/$RUNS: host replay witness"
    ./build/replay_validator vm_image/omi.img 3 > "$OUT_DIR/replay_$i.log"

    if ! grep -Fx "VALID STATE" "$OUT_DIR/replay_$i.log" >/dev/null; then
        echo "stress replay run $i did not reach VALID STATE" >&2
        echo "captured output: $OUT_DIR/replay_$i.log" >&2
        exit 1
    fi

    if ! grep -Fx "replay deterministic" "$OUT_DIR/replay_$i.log" >/dev/null; then
        echo "stress replay run $i did not prove deterministic replay" >&2
        echo "captured output: $OUT_DIR/replay_$i.log" >&2
        exit 1
    fi

    i=$((i + 1))
done

echo "stress test passed: $RUNS QEMU foundation runs and $RUNS replay runs"
