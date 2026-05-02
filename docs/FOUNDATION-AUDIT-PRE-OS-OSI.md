# Foundation Audit: Pre-OS OSI Chain

Status: PROVEN for the current implementation.

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

This audit verifies that statement for the current working tree.

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
- Make target: `make bitwise-test`

Verified properties:

- `delta8` is deterministic.
- Fano clock cycles as a 7-bit one-hot ring.
- Sonar clock wraps after 60 ticks.
- `kernel_tick` advances `K`, Fano, and Sonar.

Observed command result:

```text
make bitwise-test -> ALL PHASE 28 TESTS PASSED
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
- Make target: `make osi-test`

Verified properties:

- Same seed/tick produces the same OSI projection stack.
- Every OSI layer projection is deterministic.
- OSI projection is non-causal.
- Presentation emits `0x30..0x3F`.
- Simplex class is derived from source state and tick.

Observed command result:

```text
make osi-test -> ALL PHASE 30 TESTS PASSED
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
- `kernel/runtime/gauge_stepper.c` keeps GAUGE authority in
  `escape_step -> gauge_lookup(resolved_byte) -> gauge_apply(state, op)`.

Therefore Phase 30 does not become a new authority path.

## Full Verification Ladder

Commands run:

```bash
make osi-test
make bitwise-test
make pre-os-test
make build/gauge_replay
./build/gauge_replay
make test
make replay
```

Observed results:

| Command | Result |
|---------|--------|
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
a stack of independent authorities. The sealed GAUGE path remains intact.
