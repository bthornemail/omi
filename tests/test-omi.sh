#!/bin/sh
set -eu

BIN="./build/omi-blob"
TMP="tests/roundtrip.tmp"
BLOB="tests/roundtrip.blob"
REC="tests/roundtrip.receipt"
DEC="tests/roundtrip.decoded"
MAP="tests/map.tmp"

cat > "$TMP" <<'OMI'
(omi
  (identity
    (sid derived-boundary)
    (title "Derived Boundary Example")
    (kind chronological.diametric.boundary))
  (ontology
    ((declarative epistemic systematic topological closure)
     .
     (definitive federated procedural chronological constructive)))
  (chronological
    ((subject . derived-boundary)
     (predicate . admitted-at)
     (object . ((tick . 360)
                (phase . 0000:0000:0000:0000:0000:0000:0000:0001)
                (operator . diametric)))
     (stdin . unary-metric)
     (stdout . barcode-boundary)
     (stderr . receipt-trace))))
OMI

"$BIN" encode "$TMP" "$BLOB" "$REC" >/dev/null
"$BIN" verify "$BLOB" >/dev/null
"$BIN" decode "$BLOB" "$DEC"

if ! cmp -s "$TMP" "$DEC"; then
    echo "roundtrip mismatch" >&2
    diff -u "$TMP" "$DEC" || true
    exit 1
fi

R1="$("$BIN" receipt "$TMP")"
R2="$(cat "$REC")"
if [ "$R1" != "$R2" ]; then
    echo "receipt mismatch: $R1 != $R2" >&2
    exit 1
fi

printf 'bad' >> "$BLOB"
if "$BIN" verify "$BLOB" >/dev/null 2>&1; then
    echo "corrupt blob was accepted" >&2
    exit 1
fi

"$BIN" map > "$MAP"
grep -q 'declarative -> application' "$MAP"
grep -q 'chronological -> modifier(transport,physical)' "$MAP"

rm -f "$TMP" "$BLOB" "$REC" "$DEC" "$MAP"
echo "all org-omi BLOB tests passed"
