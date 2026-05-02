# OMI Session Export Reconciliation

Status: reconciliation note for local session exports.

## Export lanes

`session-ses_21da.md` records the documentation branch for the OMI 10-layer
OSI/S-P-O model. Its materialized artifacts are the tracked `org/` tree and
`README-UPDATE.md`.

`session-ses_21f7.md` records the later gauge execution branch for Phase 19A
and Phase 19B. Its materialized artifacts are the gauge table, ESC/gauge/trace
runtime files, and gauge replay path.

## Current repository classification

Tracked and already present:

- `session-ses_21da.md`
- `session-ses_21f7.md`
- `README-UPDATE.md`
- `org/`
- `docs/GAUGE_TABLE.omi`
- `kernel/include/gauge.h`
- `kernel/include/escape.h`
- `kernel/include/trace.h`
- `kernel/runtime/gauge_stepper.c`
- `kernel/runtime/escape.c`
- `kernel/runtime/trace.c`
- `tools/gauge_extract.c`
- `tools/gauge_replay.c`

New in this reconciliation pass:

- `docs/SESSION_RECONCILIATION.md`

## Transcript mismatch repaired

The Phase 19B export claimed that gauge replay builds with a resolved-byte
output from `gauge_step`. The implementation and replay tool already used that
shape, but `kernel/include/gauge.h` still exposed the older prototype.

The public gauge interface now matches the Phase 19A/19B boundary:

- `gauge_lookup(byte)` evaluates Γ over the ESC-resolved byte only.
- `gauge_step(..., op_out, resolved_out)` exposes the resolved byte to replay.
- Header decode remains observer-only and does not feed back into Γ or
  `gauge_apply`.

## Preserved boundaries

The Phase 6 kernel/replay path remains the baseline runtime lane. Gauge Phase
19A/19B is kept as a separate integration track until it is explicitly promoted
into the kernel boot path.

The OSI/S-P-O export remains a documentation lane. It should be reviewed and
adopted separately from gauge runtime changes.
