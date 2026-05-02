# Implementation Audit: Phases 20-29

Status: PASS with documented follow-ups.

Scope: current dirty working tree, Phases 20-29 only.

Audit date: 2026-05-02.

## Executive Status

The Phase 20-29 observer/projection/pre-OS stack is implemented as an
observer-only lane over the sealed runtime boundary:

```text
ESC -> Gamma -> GAUGE_APPLY
trace = Gamma o ESC
projection = H(trace) or pi(trace / CONS structure)
projection does not feed back into Gamma
```

Verification commands run during this audit:

| Command | Result |
|---------|--------|
| `make bitwise-test` | PASS |
| `make pre-os-test` | PASS |
| `make build/gauge_replay` | PASS, target up to date |
| `./build/gauge_replay` | PASS, ended `STATUS: SEALED` |
| `make test` | PASS |
| `make replay` | PASS, ended `VALID STATE` and `replay deterministic` |
| `git status --short` | PASS as inspection; confirms audit covers dirty tree |
| `rg -n "decode_header_v2\|gauge_step\|gauge_lookup\|gauge_apply\|TOPOLOGY_DESCRIPTOR\|pre-os-test" ...` | PASS as inspection |

No BLOCKER findings were found for Phases 20-29.

## Phase Evidence Matrix

| Phase | Invariant | Implementation evidence | Documentation evidence | Verification | Status |
|-------|-----------|-------------------------|------------------------|--------------|--------|
| 20 Header Algebra | `header = H(trace)` is public and observer-only | `omi_header_v2_t` and `decode_header_v2()` in `kernel/include/gauge.h`; implementation in `kernel/runtime/gauge_stepper.c` | `org/PHASE-20-HEADER-ALGEBRA.org`, L4/L6/L10 links | `./build/gauge_replay` Phase 20 checks | PASS |
| 21 Aegean Header Plane | Aegean is classification/display metadata, not evaluator state | `polyform/encoding/aegean.{h,c}` | `org/PHASE-21-AEGEAN-HEADER-PLANE.org` | `./build/gauge_replay` Phase 21 checks | PASS |
| 22 Braille Resolution Plane | Braille is dense dot-mask/body projection only | `polyform/encoding/braille.{h,c}` | `org/PHASE-22-BRAILLE-RESOLUTION-PLANE.org` | `./build/gauge_replay` Phase 22 checks | PASS |
| 23 Projection Composition Address | Aegean/Braille composition yields observer address and witness only | `polyform/encoding/projection_address.{h,c}` | `org/PHASE-23-PROJECTION-COMPOSITION-ADDRESS.org` | `./build/gauge_replay` Phase 23 checks | PASS |
| 24 Pre-List Geometry Boot Plane | Geometry declares observer records; CONS/list/ASCII-initiation classifications do not execute | `polyform/geometry/omi_geometry.{h,c}` | `org/PHASE-24-OMI-LISP-PRE-LIST-GEOMETRY.org` | `./build/gauge_replay` Phase 24 checks | PASS |
| 25 Topological Digit Derivation | Digits are topology/recursion descriptors, not primitive numbers | `OMI_GEOMETRY_ASCII_TOPOLOGY_DESCRIPTOR` in geometry API and replay checks | `org/PHASE-25-TOPOLOGICAL-DIGIT-DERIVATION-LAW.org`, `docs/PHASE-25-TOPOLOGICAL-DIGITS.md` | `./build/gauge_replay` ASCII role checks | PASS |
| 26 Projection Lens Space | Topology, position, geometry, and address are lenses over CONS structure | documentation-only phase | `org/PHASE-26-PROJECTION-LENS-SPACE.org`, `docs/CORE-PRINCIPLE.md`, `docs/LEXICON.omi` | doc/link inspection | PASS |
| 27 Pre-OS Measurement Machine | Hidden structure -> measurement -> first visible digit outputs | documentation-only phase plus test coverage through pre-OS suite | `org/PHASE-27-PRE-OS-MEASUREMENT-MACHINE.org`, `docs/PRE-OS-MEASUREMENT-MACHINE.md` | `make pre-os-test` | PASS |
| 28 Canonical Encoding Law | Deterministic non-causal projections over CONS structure; bitwise kernel law implemented and verified | `kernel/bitwise_kernel.omi`, `kernel/include/bitwise_kernel.h`, `kernel/runtime/bitwise_kernel.c`, `tests/bitwise_kernel_test.c` | `org/PHASE-28-CANONICAL-ENCODING-LAW.org`, `docs/CANONICAL-ENCODING-LAW.md` | `make bitwise-test` | PASS |
| 29 Pre-OS Canonical Measurement Law | Bytes canonical; replay deterministic; projection derives visibility | documentation-only root law plus pre-OS suite | `org/PHASE-29-PRE-OS-CANONICAL-MEASUREMENT-LAW.org`, `docs/PRE-OS-CANONICAL-MEASUREMENT-LAW.md` | `make pre-os-test`, `make replay` | PASS |

## Public Interface Audit

`decode_header_v2`
: Public in `kernel/include/gauge.h` and implemented in
  `kernel/runtime/gauge_stepper.c`. The header comment explicitly says it is
  observer-only and must never feed `gauge_step`, `gauge_lookup`, or
  `gauge_apply`. `tools/gauge_replay.c` and `tests/pre_os_measurement_test.c`
  call it only after execution has produced resolved trace bytes.

Aegean classifier
: `omi_aegean_classify()` classifies normative Aegean code points into
  separator/check-mark, number, and weight/measure rows. It returns projection
  metadata and is only linked into replay/test observer paths.

Braille classifier
: `omi_braille_classify()` maps Braille code points to dot mask, dot count,
  resolution row, and class. It is only used as projection metadata.

Projection address composition
: `omi_projection_address_compose()` combines Aegean and Braille projection
  records into `observer_address` and `witness`. It is linked into
  `gauge_replay` only and does not feed runtime authority.

Geometry helpers
: `omi_geometry_ascii_initiation()` classifies `0x30` and `0x39` as
  `OMI_GEOMETRY_ASCII_TOPOLOGY_DESCRIPTOR`. CONS-line, metric-line, polygon,
  and surface helpers build deterministic observer records.

Pre-OS test target
: `make pre-os-test` builds `tests/pre_os_measurement_test.c` against the
  existing gauge runtime and generated gauge table. It verifies canonical bytes,
  deterministic replay, non-causal projection, first visible digit outputs, and
  same-seed/same-tick synchronization by replay.

Bitwise kernel API
: `kernel/include/bitwise_kernel.h` exposes `delta8`, `fano_tick`,
  `sonar_tick`, and `kernel_tick`. `kernel/bitwise_kernel.omi` is the canonical
  law surface; `kernel/runtime/bitwise_kernel.c` is the C implementation.
  `make bitwise-test` verifies deterministic delta replay, Fano one-hot ring
  rotation, Sonar 60-tick wraparound, and master tick advancement.

## Causal Boundary Audit

The execution authority path remains:

```text
gauge_step(...)
  -> escape_step(...)
  -> gauge_header_decode(...)
  -> gauge_lookup(resolved_byte)
  -> gauge_apply(state, op)
```

Findings:

- `decode_header_v2()` is not called from `gauge_step`, `gauge_lookup`, or
  `gauge_apply`.
- Aegean, Braille, projection address, and geometry helpers are not called from
  `kernel/runtime/gauge_stepper.c`.
- `tools/gauge_replay.c` uses projection helpers after or alongside replay for
  reporting and verification.
- `tests/pre_os_measurement_test.c` uses `decode_header_v2()` to derive a local
  observer digit after running bytes through `gauge_step`.
- The Makefile links projection modules into `gauge_replay` and links only
  `aegean.c` plus runtime pieces into `pre_os_measurement_test`, because
  `decode_header_v2()` depends on `omi_encode_aegean()`.

Conclusion: no Phase 20-29 projection output currently feeds Gamma authority.

## Documentation Alignment Audit

Aligned documents:

- `docs/CORE-PRINCIPLE.md` names CONS algebra and projection lenses.
- `docs/PRE-OS-MEASUREMENT-MACHINE.md` states the pre-OS measurement machine.
- `docs/CANONICAL-ENCODING-LAW.md` states deterministic non-causal projections.
- `docs/PRE-OS-CANONICAL-MEASUREMENT-LAW.md` is the normalized root law.
- `docs/LEXICON.omi` defines pre-OS measurement, projection lens, canonical
  encoding law, and topological digit derivation.
- `org/L10-organization.org` links Phase 20 through Phase 29 in the organization
  trie.

Aligned vocabulary:

```text
digits are measurement/topology outputs
digits are not primitive numbers
numbers are optional projection-specific interpretations
projection does not modify canonical byte structure
```

The audit found no remaining Phase 20-29 documentation that treats
`0x30..0x39` as primitive numeric authority.

## Findings And Follow-Ups

BLOCKER: none.

WARNING: Dirty tree is the audit baseline.
: Evidence: `git status --short` reports modified tracked files and new
  untracked phase/projection files. This is expected by the requested audit
  scope, but the audit should be regenerated after staging or committing if a
  release artifact is needed.

FOLLOW-UP: Pre-OS digit projection test uses a local observer projection.
: Evidence: `tests/pre_os_measurement_test.c` maps `decode_header_v2().witness`
  into `0x30..0x3F` for the first-visible-output axiom. Next action: promote a
  named `pi_D` observer API only if more tools need the same projection.

FOLLOW-UP: Superseded Phase 24 doc remains present.
: Evidence: both `org/PHASE-24-OMI-LISP-GEOMETRY-DECLARATION-PLANE.org` and
  `org/PHASE-24-OMI-LISP-PRE-LIST-GEOMETRY.org` exist. L10 points to the
  revised pre-list geometry document. Next action: either keep the old file as
  historical context with a superseded banner or remove it in a documentation
  cleanup pass.

## Verification Log

Commands run for this audit:

```bash
git status --short
rg -n "decode_header_v2|gauge_step|gauge_lookup|gauge_apply|TOPOLOGY_DESCRIPTOR|pre-os-test" kernel polyform tools tests docs org Makefile
make bitwise-test
make pre-os-test
make build/gauge_replay
./build/gauge_replay
make test
make replay
```

Observed results:

- `make bitwise-test`: pass, ended `ALL PHASE 28 TESTS PASSED`.
- `make pre-os-test`: all five pre-OS axioms verified.
- `make build/gauge_replay`: pass, target up to date.
- `./build/gauge_replay`: pass, ended `OMI GAUGE VERSION 0.1`, `STATUS:
  SEALED`, `OMI HALT`.
- `make test`: pass, ran boot, graph, cons, BOM, and rules tests.
- `make replay`: pass, ended `VALID STATE` and `replay deterministic`.

## Audit Conclusion

Phases 20-29 are coherently documented and implemented as an observer/projection
stack over the sealed ESC/Gamma/GAUGE boundary. Runtime authority remains with
ESC-resolved bytes, Gamma lookup, and GAUGE_APPLY. Header, Aegean, Braille,
composition, geometry, digit, lens, and pre-OS measurement layers are
observer-only in the current implementation.

## Phase 30 Integration Addendum

Status: PASS.

Phase 30 adds an OSI projection bridge over the verified Phase 28 bitwise
kernel state.

Evidence:

- `kernel/osi_projection.omi` defines the canonical OSI projection bridge.
- `kernel/include/osi_projection.h` exposes `omi_osi_layer_t`,
  `omi_osi_source_t`, `omi_osi_projection_t`, and `omi_project_osi_layer`.
- `kernel/runtime/osi_projection.c` implements deterministic layer projections.
- `tests/osi_projection_test.c` verifies deterministic stack projection,
  non-causality, visible presentation output, and derived simplex class.
- `docs/PHASE-30-OSI-PROJECTION-INTEGRATION-LAW.md` documents the bridge.

Boundary result:

```text
omi_project_osi_layer reads kernel_state_t
omi_project_osi_layer does not call kernel_tick
omi_project_osi_layer does not call gauge_lookup
omi_project_osi_layer does not call gauge_apply
omi_project_osi_layer does not mutate kernel_state_t
```

Verification:

```bash
make osi-test
```

Observed result: pass, ended `ALL PHASE 30 TESTS PASSED`.
