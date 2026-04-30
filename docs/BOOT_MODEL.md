# Boot Model

The first OMI boot target is deliberately small: QEMU loads a flat memory image,
the kernel treats every byte as graph material, and the runtime advances state
only at BOM tick boundaries.

## Phase 1 Target

1. Build `vm_image/omi.img` from deterministic seed material.
2. Load the Multiboot2 kernel and `omi.img` module into an emulated machine.
3. Initialize the BOM clock to `0`.
4. Interpret every byte as a NULL graph node.
5. Run one bounded CONS resolution pass.
6. Emit serial tick summaries and halt after a bounded run.

## Why QEMU

QEMU gives OMI a formal machine boundary before real hardware exists. The QEMU
command line defines the machine, the image defines initial memory, and replay
validation checks whether graph evolution is deterministic.

## Phase 1 Build Interface

- `make image` creates the flat graph image.
- `make kernel` builds the freestanding Multiboot2 kernel.
- `make iso` packages the kernel and graph image with GRUB.
- `make run` boots the ISO in QEMU and prints serial output.
- `make replay` validates the host-side BOM/CONS model against the same image.
