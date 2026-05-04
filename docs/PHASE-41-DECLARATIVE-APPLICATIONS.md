# Phase 41: Declarative Applications as Models

Status: IMPLEMENTED as application declarations plus a composition runtime.

Phase 41 adds applications after the declarative surface is already proven.
Applications do not invent behavior. They compose existing surfaces:

- intents
- events
- VFS paths
- lazy projections
- textures
- diagram templates
- carrier receipts
- render traces

## Required Apps

`app.trailer-inspector`
: Accepts `model.trailer.wike-ebike-cargo`, defaults to
  `intent.inspect-model` and `inspect`, and exposes form, function, render,
  carrier, texture, diagram, and interaction surfaces.

`app.world-browser`
: Accepts `world.cargo-yard-demo`, defaults to `intent.render-middle` and
  `middle`, and exposes objects, interactions, render, carrier, and diagram
  surfaces.

## Implementation Surface

- Declarations: `apps/trailer-inspector.omilisp`,
  `apps/world-browser.omilisp`
- Public API: `userspace/include/omi_app_model.h`
- Runtime: `userspace/runtime/omi_app_model.c`
- Host test: `tests/app_model_test.c`
- Make target: `make app-model-test`

## Verified Properties

- app declarations parse deterministically
- trailer inspector selects the trailer handle
- world browser selects the cargo-yard world handle
- app render requests use the Phase 39 renderer path
- app projection requests use the Phase 35 lazy evaluator path
- app event requests use the Phase 40A event model path
- app intent requests use the Phase 40B intent model path
- app texture requests use the Phase 40C texture model path
- app diagram requests use the Phase 40D diagram template path
- repeated app requests produce identical receipts
- app requests do not set `handle.expanded`
- app requests do not increment `expansion_count`

## Root Statement

Phase 40 proved the declarative surface. Phase 41 makes applications
declarations over that surface.

An OMI app is not an executable first. It is a model that composes intents,
events, projections, textures, diagrams, carriers, and render traces over other
models.

The app does not own truth. The app requests views.
