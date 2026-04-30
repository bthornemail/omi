# Graph Memory Spec

This document defines the first flat memory representation for OMI-GRAPH.

## Byte Classes

- `0x00`: NULL node
- `0x01..0x7f`: candidate graph node
- `0x80..0xbf`: control code
- `0xc0..0xff`: hybrid byte-node

## Snapshot Requirements

A valid snapshot must include:

- raw memory bytes
- BOM tick number
- rewrite rule version
- deterministic checksum

## Phase 1 CONS Resolution

The first vertical slice evaluates memory as adjacent byte pairs:

- equal adjacent non-zero bytes produce a CONS binding
- any pair containing `0x00` produces NULL collapse
- unequal non-zero pairs produce transient oscillation

This rule is intentionally byte-sized and deterministic so the QEMU kernel and
host replay validator can share one ABI before a wider graph encoding exists.

## Open Questions

- node width after the first byte-only prototype
- canonical edge serialization
- whether control codes should live in-band or in a protected graph region
