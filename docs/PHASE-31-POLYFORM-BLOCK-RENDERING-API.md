# Phase 31: Polyform Block Rendering API

Status: IMPLEMENTED as host observer API.

Phase 31 defines the polyform block as the canonical rendering witness derived
from existing Phase 28, Phase 29, and Phase 30 state.

## Law

```text
polyform_block = f(Phase28 state, Phase29 digit, Phase30 OSI projections)
witness = hash(canonical block fields)
renderer(block) = projection
```

No renderer is authoritative. Text, Braille, SVG, Aegean, Braille occupancy,
geometry, and OSI addresses are views over one block.

## Implementation Surface

- Public API: `polyform/include/polyform_block.h`
- Block construction: `polyform/src/polyform_block.c`
- Canonical witness: `polyform/src/polyform_witness.c`
- Render projections:
  - `polyform/src/render_text.c`
  - `polyform/src/render_braille.c`
  - `polyform/src/render_svg.c`
- Executable witness: `polyform/tests/polyform_block_test.c`
- Make target: `make polyform-test`

## Authority Boundary

The block is derived from existing runtime state. Phase 31 does not introduce a
new kernel law, does not call GAUGE, and does not mutate `kernel_state_t`.

The witness hashes canonical block fields explicitly, field by field, rather
than hashing struct padding or renderer output. This keeps the witness stable
across host architectures and future execution hosts.

## Verified Properties

- same Phase 28 state and Phase 30 stack produce the same block
- same block produces the same witness
- renderers do not change the witness
- same block emits identical text, Braille, and SVG projections
- block fields match the pinned Phase 30 QEMU vectors at tick 11

## Current Witness

`make polyform-test` derives the tick-11 proof state, reconstructs the seven OSI
projections, materializes a `polyform_block_t`, and renders text, Braille, and
SVG from the same block.
