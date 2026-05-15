# Phase 116 - Janet / Guix / WebView Platform Distribution Manifest

## Summary

Phase 116 declares a platform-distribution surface that binds Janet,
declarative Guix boot packaging, a raw binary boot-kernel, an Atom-style browser
shell, an OMI Lisp compiler, and a WebView projection window into one declared
bundle.

This phase does not vendor Janet, build Guix derivations, boot a browser, or
open native windows. It declares the bundle topology, authority boundary, and
transport multiplexing vocabulary first.

## Locked Statement

> Janet hosts declaration and compiler orchestration, Guix distributes the raw
> binary boot surface, and WebView projects OMI UI without becoming authority.

## Bundle Ladder

```text
raw binary boot-kernel
-> Guix distribution closure
-> Janet declaration host
-> OMI Lisp compiler
-> WordNet / Prolog / W3C semantic bridge
-> DOM / CSSOM projection window
-> modem / multiplexer transport surface
```

The declared platform is closure-first. Packaging, language hosting, browser
projection, and semantic-web adapters remain layers over OMI authority.

## Roles

```text
Janet       = declaration host and orchestration surface
Guix        = reproducible distribution closure
boot-kernel = raw binary authority carrier
OMI Lisp    = canonical declaration compiler
WebView     = cross-platform HTML + CSS projection window
Atom shell  = projection-oriented browser workbench
WordNet     = lexical grounding adapter
Prolog      = logic projection adapter
DOM/CSSOM   = UI appearance projection
modem/mux   = transport lane composition
```

## Authority Boundary

```text
Janet script != authority
Guix package != authority
browser state != authority
DOM/CSSOM appearance != authority
WordNet / Prolog fact != authority
transport packet != authority

declared kernel + receipts = authority
```

The bundle may host, package, project, or transport declared state. It cannot
replace receipt-verified admission.

## Modem / Multiplexer Surface

The platform is declared as both modem and multiplexer:

- modem: translates carrier forms without changing admitted identity
- multiplexer: interleaves declaration, receipt, semantic, UI, and transport
  lanes over shared channels

Each lane remains replayable and separately receipted.

## Non-Goals

Phase 116 does not:

```text
embed a Janet runtime
emit Guix derivations
launch a native WebView window
vendor Atom or Electron
import WordNet corpora
start a Prolog engine
replace kernel authority with browser state
merge transport receipts into UI identity
```

Those belong to later runtime and distribution phases.
