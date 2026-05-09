# Phase 92 - QEMU Multi-Platform Portability Court

## Summary

Phase 92 tests portability of declared OMI witnesses across QEMU surfaces; it
does not make QEMU the authority.

This phase adds a report-generating court over the existing QEMU, endian, and
raw-binary witness targets. It records which portability lanes pass, fail, or
skip on the current host and emits deterministic JSON and Markdown reports.

## Authority Boundary

```text
QEMU is adapter, not authority.
TCG is portability witness, not performance authority.
Raw image is carrier, not authority.
Canonical declarations + receipts remain authority.
```

The court observes execution surfaces. It does not create a new kernel law,
declaration law, runtime resolver, network protocol, or performance benchmark.

## Court Inputs

Phase 92 reuses existing courts and scripts:

```text
qemu-foundation-test
qemu-platform-test
riscv-qemu-foundation-test
qemu-cross-arch-readiness
platform-endian-test
workbench-raw-binary-chunk-index-test
```

Those lanes already carry the meaningful witnesses. Phase 92 wraps them into a
single portability report instead of redefining their semantics.

## Report Shape

The JSON report contains:

```text
run_id
host
timestamp
lanes
report_receipt
```

Each lane contains:

```text
qemu_binary
machine
architecture
accelerator
target
elapsed_ms
status
witness_summary
fallback_used
```

`report_receipt` is computed over canonical JSON with the receipt field
excluded. The timestamp and elapsed time are observational metadata and do not
create correctness or performance claims.

## Lane Status

```text
PASS = lane executed and verified
FAIL = lane executed and failed
SKIP = host capability was unavailable
```

Failed lanes remain in the report. Skipped lanes must name the missing binary,
toolchain, or host capability. Fixture fallback must be explicit through
`fallback_used`.

## Non-Goals

Phase 92 does not:

```text
claim QEMU authority
claim TCG performance
open live peer networking
define QMP or vfio-user adapters
change raw-binary chunk receipts
replace existing QEMU foundation witnesses
```

## Locked Statement

> Phase 92 tests portability of declared OMI witnesses across QEMU surfaces; it
> does not make QEMU the authority.
