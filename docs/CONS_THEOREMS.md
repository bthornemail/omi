# CONS Theorems

## T1 - Closure

For every adjacency pressure, resolution must terminate as exactly one of:

- stable CONS binding
- NULL collapse
- transient oscillation deferred to the next BOM tick

## T2 - Replay

Given the same memory image, BOM tick, and rewrite rules, CONS resolution must
produce the same graph structure across runs.

## T3 - Projection Non-Authority

No polyform projection may introduce graph truth that cannot be reconstructed
from OMI-GRAPH state.
