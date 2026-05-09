#!/usr/bin/env sh
set -u

ISO="${1:-build/omi.iso}"
OUT_DIR="${2:-build/qemu-multi-platform-court}"
WITNESS_TOOL="${3:-build/polyform_witness_recompute}"
REPORT_JSON="$OUT_DIR/report.json"
REPORT_MD="$OUT_DIR/report.md"
LANES_JSONL="$OUT_DIR/lanes.jsonl"

mkdir -p "$OUT_DIR/logs"
: > "$LANES_JSONL"

now_ms() {
    node -e 'process.stdout.write(String(Date.now()))'
}

json_string() {
    node -e 'process.stdout.write(JSON.stringify(process.argv[1] || ""))' "$1"
}

record_lane() {
    target="$1"
    qemu_binary="$2"
    machine="$3"
    architecture="$4"
    accelerator="$5"
    elapsed_ms="$6"
    status="$7"
    summary="$8"
    fallback_used="$9"

    fallback_json=false
    if [ "$fallback_used" = "true" ]; then
        fallback_json=true
    fi

    printf '{' >> "$LANES_JSONL"
    printf '"qemu_binary":%s,' "$(json_string "$qemu_binary")" >> "$LANES_JSONL"
    printf '"machine":%s,' "$(json_string "$machine")" >> "$LANES_JSONL"
    printf '"architecture":%s,' "$(json_string "$architecture")" >> "$LANES_JSONL"
    printf '"accelerator":%s,' "$(json_string "$accelerator")" >> "$LANES_JSONL"
    printf '"target":%s,' "$(json_string "$target")" >> "$LANES_JSONL"
    printf '"elapsed_ms":%s,' "$elapsed_ms" >> "$LANES_JSONL"
    printf '"status":%s,' "$(json_string "$status")" >> "$LANES_JSONL"
    printf '"witness_summary":%s,' "$(json_string "$summary")" >> "$LANES_JSONL"
    printf '"fallback_used":%s' "$fallback_json" >> "$LANES_JSONL"
    printf '}\n' >> "$LANES_JSONL"
}

run_command_lane() {
    target="$1"
    qemu_binary="$2"
    machine="$3"
    architecture="$4"
    accelerator="$5"
    log_name="$6"
    shift 6

    log_path="$OUT_DIR/logs/$log_name"
    start_ms="$(now_ms)"
    "$@" > "$log_path" 2>&1
    status_code=$?
    end_ms="$(now_ms)"
    elapsed_ms=$((end_ms - start_ms))

    if [ "$status_code" -eq 0 ]; then
        summary="pass: $target verified; log=$log_path"
        status="PASS"
    else
        summary="fail: $target exited $status_code; log=$log_path"
        status="FAIL"
    fi

    record_lane "$target" "$qemu_binary" "$machine" "$architecture" "$accelerator" "$elapsed_ms" "$status" "$summary" false
}

skip_lane() {
    target="$1"
    qemu_binary="$2"
    machine="$3"
    architecture="$4"
    accelerator="$5"
    summary="$6"
    record_lane "$target" "$qemu_binary" "$machine" "$architecture" "$accelerator" 0 "SKIP" "skip: $summary" false
}

run_qemu_foundation_lane() {
    target="$1"
    qemu_binary="$2"
    machine="$3"
    architecture="$4"

    if ! command -v "$qemu_binary" >/dev/null 2>&1; then
        skip_lane "$target" "$qemu_binary" "$machine" "$architecture" "tcg" "missing $qemu_binary"
        return
    fi

    log_name="$target.log"
    run_command_lane "$target" "$qemu_binary" "$machine" "$architecture" "tcg" "$log_name" \
        env OMI_QEMU_BIN="$qemu_binary" OMI_QEMU_MACHINE="$machine" OMI_QEMU_ACCEL=tcg \
        sh ./tools/qemu_foundation_test.sh "$ISO" "$OUT_DIR/logs/$target.serial.log" "$WITNESS_TOOL"
}

run_readiness_lane() {
    target="qemu-cross-arch-readiness"
    log_path="$OUT_DIR/logs/$target.log"
    start_ms="$(now_ms)"
    sh ./tools/qemu_cross_arch_readiness.sh > "$log_path" 2>&1
    status_code=$?
    end_ms="$(now_ms)"
    elapsed_ms=$((end_ms - start_ms))

    if [ "$status_code" -eq 0 ]; then
        record_lane "$target" "qemu-system-*" "readiness" "multi" "tcg" "$elapsed_ms" "PASS" "pass: cross-arch readiness verified; log=$log_path" false
    elif grep -q "status=missing" "$log_path"; then
        record_lane "$target" "qemu-system-*" "readiness" "multi" "tcg" "$elapsed_ms" "SKIP" "skip: one or more optional cross-arch QEMU binaries are missing; log=$log_path" false
    else
        record_lane "$target" "qemu-system-*" "readiness" "multi" "tcg" "$elapsed_ms" "FAIL" "fail: cross-arch readiness command exited $status_code; log=$log_path" false
    fi
}

if [ ! -f "$ISO" ]; then
    skip_lane "qemu-foundation-test" "qemu-system-x86_64" "pc" "x86_64" "tcg" "missing ISO $ISO; run make iso first"
else
    run_qemu_foundation_lane "qemu-foundation-x86_64-pc" "qemu-system-x86_64" "pc" "x86_64"
    run_qemu_foundation_lane "qemu-foundation-x86_64-q35" "qemu-system-x86_64" "q35" "x86_64"
    run_qemu_foundation_lane "qemu-foundation-i386-pc" "qemu-system-i386" "pc" "i386"
    run_qemu_foundation_lane "qemu-foundation-i386-q35" "qemu-system-i386" "q35" "i386"
fi

run_command_lane "platform-endian-test" "host" "host" "host" "host" "platform-endian-test.log" \
    make -s platform-endian-test

run_command_lane "workbench-raw-binary-chunk-index-test" "host" "host" "host" "host" "workbench-raw-binary-chunk-index-test.log" \
    make -s workbench-raw-binary-chunk-index-test

run_readiness_lane

if command -v "${RISCV_PREFIX:-riscv64-unknown-elf-}gcc" >/dev/null 2>&1 && command -v qemu-system-riscv64 >/dev/null 2>&1; then
    run_command_lane "riscv-qemu-foundation-test" "qemu-system-riscv64" "virt" "riscv64" "tcg" "riscv-qemu-foundation-test.log" \
        make -s riscv-qemu-foundation-test
else
    skip_lane "riscv-qemu-foundation-test" "qemu-system-riscv64" "virt" "riscv64" "tcg" "missing RISC-V toolchain or qemu-system-riscv64"
fi

node --input-type=module - "$LANES_JSONL" "$REPORT_JSON" "$REPORT_MD" <<'NODE'
import fs from "fs";
import os from "os";
import { finalizeReport } from "./tools/validate_qemu_multi_platform_report.mjs";

const [lanesPath, reportJsonPath, reportMdPath] = process.argv.slice(2);
const laneText = fs.readFileSync(lanesPath, "utf8").trim();
const lanes = laneText ? laneText.split(/\n+/).map((line) => JSON.parse(line)) : [];
const timestamp = new Date().toISOString();
const report = finalizeReport({
  run_id: `qemu-multi-platform-${timestamp.replace(/[^0-9A-Za-z]/g, "")}`,
  host: {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release()
  },
  timestamp,
  authority_boundary: {
    qemu: "adapter-not-authority",
    tcg: "portability-witness-not-performance-authority",
    raw_image: "carrier-not-authority",
    authority: "canonical-declarations-plus-receipts"
  },
  lanes,
  report_receipt: 0
});

fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2) + "\n");

const counts = lanes.reduce((acc, lane) => {
  acc[lane.status] = (acc[lane.status] || 0) + 1;
  return acc;
}, {});
const rows = lanes.map((lane) => {
  return `| ${lane.target} | ${lane.architecture} | ${lane.machine} | ${lane.accelerator} | ${lane.status} | ${lane.elapsed_ms} | ${lane.fallback_used} | ${lane.witness_summary.replace(/\|/g, "\\|")} |`;
}).join("\n");
const markdown = `# QEMU Multi-Platform Portability Court Report

Run: \`${report.run_id}\`

Receipt: \`${report.report_receipt}\`

Generated: \`${report.timestamp}\`

## Authority Boundary

QEMU is adapter, TCG is portability witness, raw image is carrier, and canonical declarations plus receipts remain authority.

## Summary

- PASS: ${counts.PASS || 0}
- FAIL: ${counts.FAIL || 0}
- SKIP: ${counts.SKIP || 0}

## Lanes

| Target | Architecture | Machine | Accelerator | Status | Elapsed ms | Fallback | Witness |
| --- | --- | --- | --- | --- | ---: | --- | --- |
${rows}
`;
fs.writeFileSync(reportMdPath, markdown);
NODE

node ./tools/validate_qemu_multi_platform_report.mjs "$REPORT_JSON"

if grep -q '"status":"FAIL"\|"status": "FAIL"' "$REPORT_JSON"; then
    echo "QEMU multi-platform court recorded failed lanes: $REPORT_JSON" >&2
    exit 1
fi

echo "QEMU multi-platform portability court report: $REPORT_JSON"
