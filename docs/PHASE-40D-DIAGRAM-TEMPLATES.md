# Phase 40D: Diagram Template Models

Status: IMPLEMENTED as reusable diagram template declarations and deterministic
diagram traces.

Diagram templates are visual proof grammars. They are not apps and not
authority.

Template declarations live in `diagrams/`:

- `diagram.angle-trisection`
- `diagram.double-cube-distance`
- `diagram.carry-lookahead-adder`
- `diagram.genaille-division-rods`
- `diagram.karnaugh-map-torus`
- `diagram.qpbo-graph`
- `diagram.smith-chart`

The SVG examples in `docs/temp/` are reference inputs for these templates, not
canonical model authority.

Implementation:

- `userspace/include/omi_diagram_template.h`
- `userspace/runtime/omi_diagram_template.c`
- `tests/diagram_template_test.c`
- `make diagram-template-test`

Root law: a diagram template is a reusable projection grammar over model input,
layout, primitive basis, timing, and proof/readout policy.
