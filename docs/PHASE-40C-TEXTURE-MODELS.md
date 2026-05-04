# Phase 40C: Texture Models

Status: IMPLEMENTED as texture declaration parsing and deterministic texture
projection traces.

Textures bind material and pattern projections to model parts. They may enrich
rendering, but they do not define structure and do not mutate model handles.

Required trailer textures live in `textures/`:

- `texture.aluminum-panel`
- `texture.black-rubber-wheel`
- `texture.red-reflector`
- `texture.orange-safety-triangle`
- `texture.black-corner-block`
- `texture.stainless-tow-arm`
- `texture.barcode-ink`

Implementation:

- `userspace/include/omi_texture_model.h`
- `userspace/runtime/omi_texture_model.c`
- `tests/texture_model_test.c`
- `make texture-model-test`

Root law: texture is a surface projection over a model part. Texture may enrich
rendering. Texture may not define structure.
