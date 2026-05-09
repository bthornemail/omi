#!/usr/bin/env node

import fs from "fs";

const REQUIRED_TOP_LEVEL = ["run_id", "host", "timestamp", "lanes", "report_receipt"];
const REQUIRED_LANE_FIELDS = [
  "qemu_binary",
  "machine",
  "architecture",
  "accelerator",
  "target",
  "elapsed_ms",
  "status",
  "witness_summary",
  "fallback_used"
];
const VALID_STATUS = new Set(["PASS", "FAIL", "SKIP"]);

function stableString(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableString).join(",") + "]";
  }
  return "{" + Object.keys(value).sort().map((key) => {
    return JSON.stringify(key) + ":" + stableString(value[key]);
  }).join(",") + "}";
}

function fnv1a(text) {
  let hash = 2166136261;
  const data = String(text || "");
  for (let i = 0; i < data.length; i += 1) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function receiptPayload(report) {
  const payload = clone(report);
  delete payload.report_receipt;
  return payload;
}

export function computeReportReceipt(report) {
  return fnv1a(stableString(receiptPayload(report)));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function validateReport(report) {
  REQUIRED_TOP_LEVEL.forEach((field) => {
    assert(Object.prototype.hasOwnProperty.call(report, field), `missing-${field}`);
  });

  assert(typeof report.run_id === "string" && report.run_id.length > 0, "invalid-run-id");
  assert(typeof report.host === "object" && report.host !== null, "invalid-host");
  assert(typeof report.timestamp === "string" && report.timestamp.length > 0, "invalid-timestamp");
  assert(Array.isArray(report.lanes), "invalid-lanes");
  assert(report.lanes.length > 0, "empty-lanes");

  report.lanes.forEach((lane, index) => {
    REQUIRED_LANE_FIELDS.forEach((field) => {
      assert(Object.prototype.hasOwnProperty.call(lane, field), `lane-${index}-missing-${field}`);
    });
    assert(VALID_STATUS.has(lane.status), `lane-${index}-invalid-status`);
    assert(Number.isFinite(Number(lane.elapsed_ms)) && Number(lane.elapsed_ms) >= 0, `lane-${index}-invalid-elapsed`);
    assert(typeof lane.witness_summary === "string" && lane.witness_summary.length > 0, `lane-${index}-missing-witness-summary`);
    assert(typeof lane.fallback_used === "boolean", `lane-${index}-invalid-fallback`);
    if (lane.status === "SKIP") {
      assert(lane.witness_summary.toLowerCase().includes("skip"), `lane-${index}-skip-without-summary`);
    }
    if (lane.status === "FAIL") {
      assert(lane.witness_summary.toLowerCase().includes("fail"), `lane-${index}-fail-without-summary`);
    }
  });

  const expected = computeReportReceipt(report);
  assert(Number(report.report_receipt) === expected, "invalid-report-receipt");
  return {
    ok: true,
    lane_count: report.lanes.length,
    pass_count: report.lanes.filter((lane) => lane.status === "PASS").length,
    fail_count: report.lanes.filter((lane) => lane.status === "FAIL").length,
    skip_count: report.lanes.filter((lane) => lane.status === "SKIP").length,
    report_receipt: expected
  };
}

export function finalizeReport(report) {
  const finalized = clone(report);
  finalized.report_receipt = computeReportReceipt(finalized);
  return finalized;
}

function usage() {
  console.error("usage: validate_qemu_multi_platform_report.mjs <report.json>");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const reportPath = process.argv[2];
  if (!reportPath) {
    usage();
    process.exit(2);
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const result = validateReport(report);
    console.log(`QEMU multi-platform report valid: lanes=${result.lane_count} pass=${result.pass_count} fail=${result.fail_count} skip=${result.skip_count} receipt=${result.report_receipt}`);
  } catch (error) {
    console.error(`invalid QEMU multi-platform report: ${error.message}`);
    process.exit(1);
  }
}
