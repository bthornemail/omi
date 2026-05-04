# Phase 54 - OMI Polyform Coordinate Law

Phase 54 defines OMI-LISP structure as geometric coordinate depth.

FS, GS, RS, and US are not merely document hierarchy. They are the canonical
`x / y / z / w` coordinates of a polyform expression cell.

## Root Statement

OMI-LISP structure is geometric.

FS, GS, RS, and US are the `x / y / z / w` coordinates of a polyform
expression.

A polyform block is therefore a structural coordinate witness, not merely a
render primitive.

## Coordinate Law

- `FS -> x`
- `GS -> y`
- `RS -> z`
- `US -> w`

The same OMI path must always produce the same structural coordinates and the
same coordinate receipt.

Examples:

- `model.trailer.wike-ebike-cargo/motion/wheel.left`
- `model.trailer.wike-ebike-cargo/panels/panel.floor`
- `world.cargo-yard-demo/interactions/hitch-link.001`

## Polyform Coordinate Block

Each coordinate witness carries:

- `omi_path`
- `fs`
- `gs`
- `rs`
- `us`
- `x`
- `y`
- `z`
- `w`
- `basis`
- `degree`
- `sign`
- `depth`
- timing receipt
- receipt hash

This receipt is structural. Overlay projections do not change it.

## Timing Law

The Light Garden timing law is normalized as:

- `240` = public projective frame
- `60` = local/private sweep
- `16` = operator/control bank
- `7` = Fano selector
- `8` = byte/source-target cadence
- `5040` = master reconciliation period

These timing values are part of the coordinate witness. They are not renderer
state.

## Cons Geometry Law

The cons cell is treated as the minimal geometric closure:

- `car` = source/interior leg
- `cdr` = target/interior leg
- `cons` = boundary / hypotenuse / relation closure

From that closure:

- `tan = cdr / car`
- `cos = car / cons`
- `sin = cdr / cons`

This is an interpretive projection law over relation closure, not a claim that
renderer geometry becomes authority.

## Sexagesimal CONS Extrusion Closure

Phase 54 also defines a native measurement/readout layer for CONS extrusion
closure.

Each closure witness carries:

- signed delta between `car` and `cdr`
- `distance_squared`
- `distance_class`
- `sexagesimal_slot`
- `orientation4`
- `public_frame240`
- closure receipt hash
- roundtrip readout string

The first pinned closure schedule is:

- `sexagesimal_slot = (distance_class * 10) % 60`
- `public_frame240 = orientation4 * 60 + sexagesimal_slot`

Distance-class examples:

- `sqrt(1) -> class 1 -> slot 10`
- `sqrt(2) -> class 2 -> slot 20`
- `sqrt(3) -> class 3 -> slot 30`
- `sqrt(4) -> class 4 -> slot 40`
- `sqrt(5) -> class 5 -> slot 50`
- `sqrt(6) -> class 6 -> slot 0`

The roundtrip readout format is:

- `"orientation:slot"`
- example: `"2:40"`

Carrier-aligned `orientation4` is normalized as:

- `0 = Code16K`
- `1 = Aztec`
- `2 = MaxiCode`
- `3 = BeeCode`

This is a measurement and projection law. It does not make barcode carriers
structural authority.

### Reversal Law

Reversing a closure:

- preserves `distance_squared`
- preserves `distance_class`
- preserves `sexagesimal_slot`
- changes the signed deltas deterministically
- changes `orientation4` by carrier-aligned phase inversion
- changes `public_frame240` deterministically

The first pinned inversion rule is:

- `reversed.orientation4 = (orientation4 + 2) % 4`

## Overlay Law

Color, mesh, texture, shader, and type overlays are projections.

They may highlight or render structure, but they do not alter canonical
coordinates or the coordinate receipt.

## Acceptance Surface

`make polyform-coordinate-test` and
`make workbench-polyform-coordinate-test` prove:

- deterministic path-to-coordinate mapping
- timing constant validation
- deterministic cons geometry ratios
- deterministic sexagesimal closure witnesses
- overlay preservation of structural receipt
- workbench construction from canonical path lookup
