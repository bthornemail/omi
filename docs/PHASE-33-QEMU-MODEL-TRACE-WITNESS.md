# Phase 33: QEMU Model Trace Witness

Status: SUPERSEDED by `PHASE-33-QEMU-MODEL-REGISTRY.md`.

This document records the compatibility trace witness. The hardened Phase 33
surface is the model registry:

```text
docs/PHASE-33-QEMU-MODEL-REGISTRY.md
```

`model_trace` and `qemu-model-test` remain compatibility wrappers. New work
should use `model_registry`, `make model-registry-test`, and
`make qemu-model-registry-test`.

The model is still not a mesh. The model is still not the renderer. The model
is a replayable FS/GS/RS/US declaration whose render depths and interactions can
be pinned as serial witnesses.

The original trace witness used `MODEL_QEMU_BEGIN` / `MODEL_QEMU_END`. The
hardened registry witness uses `MODEL_REGISTRY_QEMU_BEGIN` /
`MODEL_REGISTRY_QEMU_END` and includes the trailer model authority receipt.

Verification compatibility:

```sh
make qemu-model-test
```

This delegates to the registry validator.
