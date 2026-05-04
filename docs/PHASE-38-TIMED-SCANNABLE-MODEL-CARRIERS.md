# Phase 38: Timed Scannable Model Carriers

Status: IMPLEMENTED as canonical carrier payload decoders.

Phase 38 makes OMI OS scannable without trusting images. It operates on
canonical carrier payload structs and declaration text buffers; image
recognition, SVG rendering, and barcode image decoding are future phases.

## Carrier Timing Law

```text
Barcode carriers do not define timing authority.
They carry timing receipts.
The OMI runtime owns timing.
The carrier frame declares which timing layer it projects.
```

Carrier roles:

| Carrier | Role | Timing receipt |
|---------|------|----------------|
| Code16K | master / sequence timing carrier | `5040 / 60 / 16 / 8 / 7` |
| Aztec | object / global frame carrier | `360` |
| MaxiCode | public canvas / logistics carrier | `240` |
| BeeCode | query / rule selector | 15-bit selector only |

BeeCode does not carry resolution timing. It selects a query or rule inside a
timing-bearing context.

The public header pins these constants:

```c
#define OMI_TIMING_MASTER_5040 5040u
#define OMI_TIMING_PRIVATE_60 60u
#define OMI_TIMING_OPERATOR_16 16u
#define OMI_TIMING_KERNEL_8 8u
#define OMI_TIMING_FANO_7 7u
#define OMI_TIMING_GLOBAL_360 360u
#define OMI_TIMING_PUBLIC_240 240u
#define OMI_BEECODE_MAX_15BIT 32767u
```

## Source Spec Normalization

The legacy barcode sources are retained under `docs/temp/` and normalized into
the OMI carrier model:

- `docs/temp/USS-16K.pdf`: Code16K is a stacked, multi-row ASCII symbology, so
  OMI uses it as the ordered timing-stack receipt carrier.
- `docs/temp/Aztec.US5591956A.pdf`: Aztec is normalized as the layered object
  root/global frame carrier.
- `docs/temp/MaxiCode.US4998010.pdf`: MaxiCode is normalized as the
  polygonal/hexagonal public canvas and logistics receipt carrier.
- `docs/temp/BeeTag.pone.0136487.pdf`: BeeCode/BeeTag is normalized as a compact
  query/rule identity selector. Its 15-bit identity range is preserved for
  selector values `0..32767`.

The old Barcode Trinity does not become a separate authority plane. It becomes
the scannable input surface for the declarative OS.

## Pipeline

```text
carrier payload
-> validate receipt
-> optional declaration text
-> Phase 37 loader
-> overlay registry
-> VFS
-> lazy projection
```

A carrier is a receipt or payload wrapper, not authority by itself. Declaration
registration is only performed through the Phase 37 hot-plug loader.

## Implementation Surface

- Public API: `userspace/include/omi_carrier_decode.h`
- Runtime: `userspace/runtime/omi_carrier_decode.c`
- Host test: `tests/carrier_decode_test.c`
- Make target: `make carrier-decode-test`

## Verified Properties

- Code16K validates `5040, 60, 16, 8, 7`
- invalid Code16K operator period `15` rejects
- Aztec validates global period `360`
- MaxiCode validates public period `240`
- BeeCode accepts selector `32767` and rejects `32768`
- combined trailer carrier frame produces a stable receipt hash
- declaration payloads register only through the Phase 37 overlay loader
- carrier decode does not mutate the boot registry, mounted handles, or lazy
  expansion state

## Root Statement

Phase 37 made OMI OS dynamically declarative. Phase 38 makes it scannable. A
scanned carrier does not become an executable object. It decodes into a
timing/model/query receipt, then passes through the same validation and
hot-plug path as declaration text.
