# Foundation Audit: Pre-OS OSI Chain

Status: PROVEN BY QEMU RUNTIME for the current implementation.

Scope:

```text
Phase 28 bitwise kernel
  -> Phase 29 pre-OS canonical measurement law
  -> Phase 30 OSI projection bridge
```

Audit date: 2026-05-02.

## Acceptance Statement

A conforming OMI foundation can replay deterministic kernel state, measure it
into visible digit outputs, and project it through all seven OSI layers without
allowing any projection to mutate canonical state or feed execution authority.

This audit verifies that statement for the current working tree. The primary
foundation witness is `make qemu-foundation-test`, which boots the actual
kernel under QEMU, captures serial output, and asserts exact pinned Phase 28
and Phase 30 vectors. Host executables remain useful secondary witnesses, but
they are not the foundation proof by themselves.

The full regression gate is:

```bash
make full-test
```

Future phases must keep this gate passing before they can claim the foundation
boundary remains sealed. `make foundation-proof` is an alias for the same full
gate.

The gate is split into three explicit tiers:

- `make unit-test`: host unit witnesses for graph/runtime behavior and Phase
  28/29/30 laws, plus cross-architecture endian profiles
- `make e2e-test`: QEMU foundation boot, GAUGE replay witness, and replay
  validator, including the supported x86 QEMU platform matrix, RISC-V vector
  boot, and remaining non-x86 QEMU readiness checks
- `make stress-test`: repeated QEMU foundation and replay validation

## Chain Proof

### Phase 28: Bitwise Kernel

Law:

```text
K' = ROTL(K, 1) XOR ROTL(K, 3) XOR ROTR(K, 2) XOR GS
K  = K' & 0xFF
```

Evidence:

- Constitutional surface: `kernel/bitwise_kernel.omi`
- Public API: `kernel/include/bitwise_kernel.h`
- Runtime implementation: `kernel/runtime/bitwise_kernel.c`
- Executable witness: `tests/bitwise_kernel_test.c`
- QEMU runtime surface: `kernel/boot/entry.c`
- QEMU exact-vector validator: `tools/qemu_foundation_test.sh`
- Make target: `make bitwise-test`
- Runtime proof target: `make qemu-foundation-test`

Verified properties:

- `delta8` is deterministic.
- Fano clock cycles as a 7-bit one-hot ring.
- Sonar clock wraps after 60 ticks.
- `kernel_tick` advances `K`, Fano, and Sonar.

Observed command result:

```text
make bitwise-test -> ALL PHASE 28 TESTS PASSED
make qemu-foundation-test -> QEMU foundation runtime vectors verified
```

Pinned QEMU vectors:

```text
PHASE28_QEMU tick=0 K=0x00 fano=0x01 sonar_hi=0x00000000 sonar_lo=0x00000001
PHASE28_QEMU tick=1 K=0x1d fano=0x02 sonar_hi=0x00000000 sonar_lo=0x00000002
PHASE28_QEMU tick=2 K=0x88 fano=0x04 sonar_hi=0x00000000 sonar_lo=0x00000004
PHASE28_QEMU tick=3 K=0x6a fano=0x08 sonar_hi=0x00000000 sonar_lo=0x00000008
PHASE28_QEMU tick=4 K=0x00 fano=0x10 sonar_hi=0x00000000 sonar_lo=0x00000010
PHASE28_QEMU tick=5 K=0x1d fano=0x20 sonar_hi=0x00000000 sonar_lo=0x00000020
```

### Phase 29: Pre-OS Canonical Measurement Law

Law:

```text
Bytes are canonical.
Replay is deterministic.
Everything visible is derived by projection.
```

Evidence:

- Root law: `docs/PRE-OS-CANONICAL-MEASUREMENT-LAW.md`
- Phase doc: `org/PHASE-29-PRE-OS-CANONICAL-MEASUREMENT-LAW.org`
- Executable witness: `tests/pre_os_measurement_test.c`
- QEMU runtime witness: `make qemu-foundation-test`
- Make target: `make pre-os-test`

Verified properties:

- Same bytes produce the same trace and final state.
- Replay is deterministic across identical runs.
- Header/digit projection is non-causal.
- Structural bytes can be measured into `0x30..0x3F`.
- Same seed bytes and tick count synchronize by replay.

Observed command result:

```text
make pre-os-test -> OMI Pre-OS Canonical Measurement Law holds.
```

### Phase 30: OSI Projection Bridge

Law:

```text
state_t = phase28_tick(seed, t)
OSI_layer_n(state_t) = projection_n(state_t)
projection_n must not mutate state_t
```

Evidence:

- Constitutional surface: `kernel/osi_projection.omi`
- Public API: `kernel/include/osi_projection.h`
- Runtime implementation: `kernel/runtime/osi_projection.c`
- Executable witness: `tests/osi_projection_test.c`
- QEMU runtime surface: `kernel/boot/entry.c`
- QEMU exact-vector validator: `tools/qemu_foundation_test.sh`
- Make target: `make osi-test`
- Runtime proof target: `make qemu-foundation-test`

Verified properties:

- Same seed/tick produces the same OSI projection stack.
- Every OSI layer projection is deterministic.
- OSI projection is non-causal.
- Presentation emits `0x30..0x3F`.
- Simplex class is derived from source state and tick.

Observed command result:

```text
make osi-test -> ALL PHASE 30 TESTS PASSED
make qemu-foundation-test -> QEMU foundation runtime vectors verified
```

Pinned QEMU vectors at tick 11:

```text
PHASE30_QEMU layer=1 digit=0x31 address=0x000aaa81 simplex=1
PHASE30_QEMU layer=2 digit=0x3d address=0x0e04f67d simplex=2
PHASE30_QEMU layer=3 digit=0x3c address=0x391b204c simplex=3
PHASE30_QEMU layer=4 digit=0x33 address=0x36932ba3 simplex=4
PHASE30_QEMU layer=5 digit=0x30 address=0xaf66ca00 simplex=5
PHASE30_QEMU layer=6 digit=0x3c address=0x7ceb7cac simplex=6
PHASE30_QEMU layer=7 digit=0x3f address=0xa944551f simplex=7
```

## Authority Boundary Proof

Phase 30 projection reads Phase 28 state, but does not advance it.

The canonical boundary is:

```text
canonical replay = authority
projection = observer
OSI = lens stack
```

Inspection evidence:

- `kernel/osi_projection.omi` declares `must-not (call kernel_tick)`,
  `must-not (call gauge_lookup)`, and `must-not (call gauge_apply)`.
- `kernel/runtime/osi_projection.c` implements `omi_project_osi_layer` without
  calling `kernel_tick`, `gauge_lookup`, or `gauge_apply`.
- `tests/osi_projection_test.c` verifies `kernel_state_t` is unchanged after
  projecting all seven layers.
- `kernel/boot/entry.c` calls `kernel_tick` only to advance the Phase 28
  runtime vector before projection, then calls `omi_project_osi_layer` as an
  observer and serializes its output. Projection output is not fed back into
  `kernel_tick`, GAUGE, or ESC.
- `kernel/runtime/gauge_stepper.c` keeps GAUGE authority in
  `escape_step -> gauge_lookup(resolved_byte) -> gauge_apply(state, op)`.

Therefore Phase 30 does not become a new authority path.

## Full Verification Ladder

Commands run:

```bash
make full-test
```

Observed results:

| Command | Result |
|---------|--------|
| `make qemu-foundation-test` | PASS, booted QEMU and verified exact pinned Phase 28/30 serial vectors |
| `make osi-test` | PASS, ended `ALL PHASE 30 TESTS PASSED` |
| `make bitwise-test` | PASS, ended `ALL PHASE 28 TESTS PASSED` |
| `make pre-os-test` | PASS, ended `OMI Pre-OS Canonical Measurement Law holds.` |
| `make build/gauge_replay` | PASS, target up to date |
| `./build/gauge_replay` | PASS, ended `STATUS: SEALED` and `OMI HALT` |
| `make test` | PASS |
| `make replay` | PASS, ended `VALID STATE` and `replay deterministic` |

## Conclusion

The complete foundation chain is implemented and verified:

```text
Phase 28 bitwise kernel
  -> deterministic replay state
Phase 29 pre-OS measurement law
  -> visible digit measurement
Phase 30 OSI projection bridge
  -> seven non-causal OSI lenses
```

The OSI model is now represented as a lens stack over canonical replay, not as
a stack of independent authorities. The sealed GAUGE path remains intact. The
foundation proof is no longer a range check or a host-only shape check: QEMU
boots the kernel and the validator asserts concrete serial vectors emitted by
the runtime.
