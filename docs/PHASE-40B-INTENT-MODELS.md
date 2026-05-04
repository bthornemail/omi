# Phase 40B: Intent Models

Status: IMPLEMENTED as declarative request parsing and event selection.

Intents select legal projection paths. They do not execute, render, load,
decode, or mutate directly.

Required intent declarations live in `intents/` and cover inspect, render depth,
relation query, carrier scan, hot-plug, texture, diagram, comparison, and synset
requests.

Implementation:

- `userspace/include/omi_intent_model.h`
- `userspace/runtime/omi_intent_model.c`
- `tests/intent_model_test.c`
- `make intent-model-test`

Root law: intent selects a legal projection path. Intent does not execute the
path directly.
