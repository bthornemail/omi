# Phase 40E: Declarative Surface Integration

Status: IMPLEMENTED as a no-app integration proof.

Phase 40E proves the pre-application surface:

```text
intent.render-near
-> event.render-request
-> VFS model projection path
-> lazy FS/GS/RS/US projection
-> texture trace
-> diagram trace
-> polyform render trace
```

No application model is involved. The test verifies that handles remain lazy and
`expansion_count` stays zero.

Implementation:

- `tests/declarative_surface_test.c`
- `make declarative-surface-test`

Root law: before OMI OS has applications, it has declarative surfaces. Apps are
later compositions of events, intents, textures, diagrams, carriers, VFS views,
and lazy model projections.
