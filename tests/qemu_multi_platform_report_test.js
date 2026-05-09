const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const validatorPath = path.join(__dirname, "..", "tools", "validate_qemu_multi_platform_report.mjs");

function sampleReport() {
  return {
    run_id: "qemu-multi-platform-fixture",
    host: {
      hostname: "fixture-host",
      platform: "linux",
      arch: "x64",
      release: "fixture"
    },
    timestamp: "2026-05-09T00:00:00.000Z",
    authority_boundary: {
      qemu: "adapter-not-authority",
      tcg: "portability-witness-not-performance-authority",
      raw_image: "carrier-not-authority",
      authority: "canonical-declarations-plus-receipts"
    },
    lanes: [
      {
        qemu_binary: "qemu-system-x86_64",
        machine: "pc",
        architecture: "x86_64",
        accelerator: "tcg",
        target: "qemu-foundation-x86_64-pc",
        elapsed_ms: 12,
        status: "PASS",
        witness_summary: "pass: foundation witness verified",
        fallback_used: false
      },
      {
        qemu_binary: "qemu-system-riscv64",
        machine: "virt",
        architecture: "riscv64",
        accelerator: "tcg",
        target: "riscv-qemu-foundation-test",
        elapsed_ms: 0,
        status: "SKIP",
        witness_summary: "skip: missing RISC-V toolchain",
        fallback_used: false
      },
      {
        qemu_binary: "fixture",
        machine: "fixture",
        architecture: "fixture",
        accelerator: "fixture",
        target: "fixture-report-validation",
        elapsed_ms: 1,
        status: "PASS",
        witness_summary: "pass: fixture fallback explicitly used",
        fallback_used: true
      }
    ],
    report_receipt: 0
  };
}

(async function main() {
  const validator = await import(pathToFileURL(validatorPath).href);

  function finalizedSample() {
    return validator.finalizeReport(sampleReport());
  }

  function expectInvalid(report, message) {
    assert.throws(() => validator.validateReport(report), new RegExp(message));
  }

  console.log("Testing QEMU multi-platform report validator");
  console.log("===========================================\n");

  console.log("Testing valid report fixture");
  const report = finalizedSample();
  const result = validator.validateReport(report);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.lane_count, 3);
  assert.strictEqual(result.pass_count, 2);
  assert.strictEqual(result.skip_count, 1);
  assert.strictEqual(result.fail_count, 0);
  assert.strictEqual(result.report_receipt, report.report_receipt);
  console.log("  OK valid report fixture validates with stable receipt\n");

  console.log("Testing tamper detection");
  const tampered = finalizedSample();
  tampered.lanes[0].status = "FAIL";
  tampered.lanes[0].witness_summary = "fail: tampered after receipt";
  expectInvalid(tampered, "invalid-report-receipt");
  console.log("  OK tampered report receipt is rejected\n");

  console.log("Testing missing field rejection");
  const missing = finalizedSample();
  delete missing.lanes[0].qemu_binary;
  missing.report_receipt = validator.computeReportReceipt(missing);
  expectInvalid(missing, "lane-0-missing-qemu_binary");
  console.log("  OK missing lane fields are rejected\n");

  console.log("Testing explicit skip summaries");
  const badSkip = finalizedSample();
  badSkip.lanes[1].witness_summary = "missing RISC-V toolchain";
  badSkip.report_receipt = validator.computeReportReceipt(badSkip);
  expectInvalid(badSkip, "lane-1-skip-without-summary");
  console.log("  OK skipped lanes must name skip explicitly\n");

  console.log("Testing CLI validator");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omi-qemu-report-"));
  const reportPath = path.join(tmpDir, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(finalizedSample(), null, 2) + "\n");
  const cli = require("child_process").spawnSync(
    process.execPath,
    [validatorPath, reportPath],
    { encoding: "utf8" }
  );
  assert.strictEqual(cli.status, 0, cli.stderr);
  assert.ok(cli.stdout.includes("QEMU multi-platform report valid"));
  console.log("  OK CLI validator accepts fixture report\n");

  console.log("===========================================");
  console.log("ALL QEMU MULTI-PLATFORM REPORT TESTS PASSED");
}()).catch((error) => {
  console.error(error);
  process.exit(1);
});
