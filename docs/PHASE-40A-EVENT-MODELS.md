# Phase 40A: Event Models

Status: IMPLEMENTED as declaration parsing plus append-only event logs.

Events are source/target/relation/timing declarations. They are not callbacks
and they do not mutate models.

Required event declarations live in `events/`:

- `event.vfs-resolve`
- `event.lazy-project`
- `event.render-request`
- `event.carrier-scan`
- `event.model-hotplug`
- `event.pointer-select`
- `event.query-request`
- `event.texture-request`
- `event.diagram-request`

Implementation:

- `userspace/include/omi_event_model.h`
- `userspace/runtime/omi_event_model.c`
- `tests/event_model_test.c`
- `make event-model-test`

Root law: events declare observed or requested relations. Mutation, when later
allowed, must be represented as a new declaration appended to a log.
