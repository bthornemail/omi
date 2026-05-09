CC ?= cc
CFLAGS ?= -std=c11 -Wall -Wextra -Werror -Ikernel/include
KERNEL_CFLAGS := -std=c11 -Wall -Wextra -Werror -Ikernel/include -m32 -ffreestanding -fno-pic -fno-stack-protector -fno-builtin -nostdlib
KERNEL_ASFLAGS := -m32
KERNEL_LDFLAGS := -m elf_i386 -nostdlib -T kernel/linker.ld
BUILD_DIR := build
ISO_ROOT := $(BUILD_DIR)/iso
KERNEL_ELF := $(BUILD_DIR)/omi-kernel.elf
OMI_ISO := $(BUILD_DIR)/omi.iso
STRESS_RUNS ?= 5
RISCV_PREFIX ?= riscv64-unknown-elf-
RISCV_CC := $(RISCV_PREFIX)gcc
RISCV_OBJCOPY := $(RISCV_PREFIX)objcopy
RISCV_BUILD_DIR := build-riscv
RISCV_ELF := $(RISCV_BUILD_DIR)/omi-riscv.elf
RISCV_BIN := $(RISCV_BUILD_DIR)/omi-riscv.bin
RISCV_CFLAGS := -std=c11 -Wall -Wextra -Werror -Ikernel/include -march=rv64imac_zicsr -mabi=lp64 -mcmodel=medany -ffreestanding -fno-builtin -nostdlib

.PHONY: all test unit-test e2e-test stress-test qemu-platform-test qemu-cross-arch-readiness qemu-multi-platform-court qemu-multi-platform-report-test riscv-image riscv-run riscv-qemu-foundation-test polyform-test model-test model-registry-test user-init-test lazy-eval-test model-vfs-test hotplug-model-test carrier-decode-test polyform-render-test polyform-coordinate-test scope-multigraph-test event-model-test intent-model-test texture-model-test diagram-template-test declarative-surface-test app-model-test device-model-test event-packet-test esp32-witness-test workbench-test workbench-edit-test workbench-merge-test workbench-sync-test workbench-file-sync-test workbench-barcode-sync-test workbench-esp32-sync-test workbench-org-test workbench-diagram-tangle-test workbench-diagram-renderer-test workbench-polyform-coordinate-test workbench-scope-multigraph-test workbench-composer-test workbench-composer-package-test workbench-package-trust-test workbench-geometric-reconciliation-test workbench-view-switcher-test workbench-animation-timeline-test workbench-fractal-subchart-test workbench-cube-differential-test workbench-barcode-template-composition-test workbench-composition-trust-test workbench-composition-bundle-test workbench-stream-declaration-test workbench-stream-projection-test workbench-stream-overlay-test workbench-stream-overlay-package-test workbench-omilisp-declaration-test workbench-spom-triangulation-test workbench-omi-self-declaration-test workbench-polyform-cons-reconstruction-test workbench-orientation-incidence-blackboard-test workbench-network-runtime-resolver-test workbench-runtime-channel-manifest-test workbench-distributed-adapter-transport-registry-test workbench-raw-binary-decentralized-lattice-test workbench-raw-binary-chunk-index-test workbench-boundary-geometry-constitution-test workbench-omi-observer-lattice-sitter-test workbench-wordnet-prolog-semantic-grounding-test workbench-omi-transmutator-roundtrip-test workbench-block-image-test workbench-block-image-projection-test workbench-narrative-timeline-test workbench-gpu-projection-test workbench-webgl-runtime-test workbench-webgl-preview-test workbench-gles-runtime-test workbench-opengl-runtime-test workbench-graphics-equivalence-test workbench-visual-equivalence-test qemu-model-test qemu-model-registry-test qemu-tcg-foundation-test qemu-tcg-model-registry-test qemu-tcg-court qemu-page-court-test qemu-mmio-device-court-test qemu-portable-test full-test image kernel iso run replay rules gauge-replay-test platform-endian-test pre-os-test bitwise-test osi-test qemu-foundation-test foundation-proof clean

all: test image replay kernel iso

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(RISCV_BUILD_DIR):
	mkdir -p $(RISCV_BUILD_DIR)

$(BUILD_DIR)/boot_tests: tests/boot_tests.c kernel/boot/bom_clock.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD_DIR)/graph_tests: tests/graph_tests.c kernel/vm/memory_graph.c kernel/vm/cons_engine.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD_DIR)/cons_tests: tests/cons_tests.c kernel/vm/cons_engine.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD_DIR)/bom_tests: tests/bom_tests.c kernel/vm/memory_graph.c kernel/vm/cons_engine.c kernel/runtime/bom.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD_DIR)/platform_endian_test: tests/platform_endian_test.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD_DIR)/model_trace_test: tests/model_trace_test.c models/trailer/wike-ebike-cargo-trailer.alist models/world/cargo-yard-demo.alist | $(BUILD_DIR)
	$(CC) $(CFLAGS) tests/model_trace_test.c -o $@

$(BUILD_DIR)/model_registry.o: kernel/runtime/model_registry.c kernel/include/model_registry.h kernel/include/serial.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c kernel/runtime/model_registry.c -o $@

$(BUILD_DIR)/model_registry_test: tests/model_registry_test.c $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) tests/model_registry_test.c $(BUILD_DIR)/model_registry.o -o $@

$(BUILD_DIR)/omi_user_init.o: userspace/runtime/omi_user_init.c userspace/include/omi_user_init.h kernel/include/model_registry.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_user_init.c -o $@

$(BUILD_DIR)/user_init_test: tests/user_init_test.c $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/user_init_test.c $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o -o $@

$(BUILD_DIR)/omi_lazy_eval.o: userspace/runtime/omi_lazy_eval.c userspace/include/omi_lazy_eval.h userspace/include/omi_user_init.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_lazy_eval.c -o $@

$(BUILD_DIR)/lazy_eval_test: tests/lazy_eval_test.c $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/lazy_eval_test.c $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o -o $@

$(BUILD_DIR)/omi_model_vfs.o: userspace/runtime/omi_model_vfs.c userspace/include/omi_model_vfs.h userspace/include/omi_lazy_eval.h userspace/include/omi_user_init.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_model_vfs.c -o $@

$(BUILD_DIR)/omi_model_loader.o: userspace/runtime/omi_model_loader.c userspace/include/omi_model_loader.h userspace/include/omi_user_init.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_model_loader.c -o $@

$(BUILD_DIR)/model_vfs_test: tests/model_vfs_test.c $(BUILD_DIR)/omi_model_vfs.o $(BUILD_DIR)/omi_model_loader.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/model_vfs_test.c $(BUILD_DIR)/omi_model_vfs.o $(BUILD_DIR)/omi_model_loader.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o -o $@

$(BUILD_DIR)/hotplug_model_loader_test: tests/hotplug_model_loader_test.c $(BUILD_DIR)/omi_model_loader.o $(BUILD_DIR)/omi_model_vfs.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/hotplug_model_loader_test.c $(BUILD_DIR)/omi_model_loader.o $(BUILD_DIR)/omi_model_vfs.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o -o $@

$(BUILD_DIR)/omi_carrier_decode.o: userspace/runtime/omi_carrier_decode.c userspace/include/omi_carrier_decode.h userspace/include/omi_model_loader.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_carrier_decode.c -o $@

$(BUILD_DIR)/carrier_decode_test: tests/carrier_decode_test.c $(BUILD_DIR)/omi_carrier_decode.o $(BUILD_DIR)/omi_model_loader.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/carrier_decode_test.c $(BUILD_DIR)/omi_carrier_decode.o $(BUILD_DIR)/omi_model_loader.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o -o $@

$(BUILD_DIR)/omi_polyform_renderer.o: userspace/runtime/omi_polyform_renderer.c userspace/include/omi_polyform_renderer.h userspace/include/omi_carrier_decode.h userspace/include/omi_model_vfs.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_polyform_renderer.c -o $@

$(BUILD_DIR)/polyform_renderer_test: tests/polyform_renderer_test.c $(BUILD_DIR)/omi_polyform_renderer.o $(BUILD_DIR)/omi_carrier_decode.o $(BUILD_DIR)/omi_model_vfs.o $(BUILD_DIR)/omi_model_loader.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/polyform_renderer_test.c $(BUILD_DIR)/omi_polyform_renderer.o $(BUILD_DIR)/omi_carrier_decode.o $(BUILD_DIR)/omi_model_vfs.o $(BUILD_DIR)/omi_model_loader.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o -o $@

$(BUILD_DIR)/omi_polyform_coordinate.o: userspace/runtime/omi_polyform_coordinate.c userspace/include/omi_polyform_coordinate.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_polyform_coordinate.c -o $@

$(BUILD_DIR)/polyform_coordinate_test: tests/polyform_coordinate_test.c $(BUILD_DIR)/omi_polyform_coordinate.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/polyform_coordinate_test.c $(BUILD_DIR)/omi_polyform_coordinate.o -lm -o $@

$(BUILD_DIR)/omi_scope_multigraph.o: userspace/runtime/omi_scope_multigraph.c userspace/include/omi_scope_multigraph.h userspace/include/omi_polyform_coordinate.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_scope_multigraph.c -o $@

$(BUILD_DIR)/scope_multigraph_test: tests/scope_multigraph_test.c $(BUILD_DIR)/omi_scope_multigraph.o $(BUILD_DIR)/omi_polyform_coordinate.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/scope_multigraph_test.c $(BUILD_DIR)/omi_scope_multigraph.o $(BUILD_DIR)/omi_polyform_coordinate.o -lm -o $@

$(BUILD_DIR)/omi_event_model.o: userspace/runtime/omi_event_model.c userspace/include/omi_event_model.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_event_model.c -o $@

$(BUILD_DIR)/event_model_test: tests/event_model_test.c $(BUILD_DIR)/omi_event_model.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/event_model_test.c $(BUILD_DIR)/omi_event_model.o -o $@

$(BUILD_DIR)/omi_event_packet.o: userspace/runtime/omi_event_packet.c userspace/include/omi_event_packet.h userspace/include/omi_carrier_decode.h userspace/include/omi_event_model.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_event_packet.c -o $@

$(BUILD_DIR)/event_packet_test: tests/event_packet_test.c $(BUILD_DIR)/omi_event_packet.o $(BUILD_DIR)/omi_event_model.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/event_packet_test.c $(BUILD_DIR)/omi_event_packet.o $(BUILD_DIR)/omi_event_model.o -o $@

$(BUILD_DIR)/omi_esp32_witness.o: userspace/runtime/omi_esp32_witness.c userspace/include/omi_esp32_witness.h userspace/include/omi_event_packet.h userspace/include/omi_event_model.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_esp32_witness.c -o $@

$(BUILD_DIR)/esp32_witness_test: tests/esp32_witness_test.c $(BUILD_DIR)/omi_esp32_witness.o $(BUILD_DIR)/omi_event_packet.o $(BUILD_DIR)/omi_event_model.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/esp32_witness_test.c $(BUILD_DIR)/omi_esp32_witness.o $(BUILD_DIR)/omi_event_packet.o $(BUILD_DIR)/omi_event_model.o -o $@

$(BUILD_DIR)/omi_intent_model.o: userspace/runtime/omi_intent_model.c userspace/include/omi_intent_model.h userspace/include/omi_event_model.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_intent_model.c -o $@

$(BUILD_DIR)/intent_model_test: tests/intent_model_test.c $(BUILD_DIR)/omi_intent_model.o $(BUILD_DIR)/omi_event_model.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/intent_model_test.c $(BUILD_DIR)/omi_intent_model.o $(BUILD_DIR)/omi_event_model.o -o $@

$(BUILD_DIR)/omi_texture_model.o: userspace/runtime/omi_texture_model.c userspace/include/omi_texture_model.h userspace/include/omi_lazy_eval.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_texture_model.c -o $@

$(BUILD_DIR)/texture_model_test: tests/texture_model_test.c $(BUILD_DIR)/omi_texture_model.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/texture_model_test.c $(BUILD_DIR)/omi_texture_model.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o -o $@

$(BUILD_DIR)/omi_diagram_template.o: userspace/runtime/omi_diagram_template.c userspace/include/omi_diagram_template.h userspace/include/omi_lazy_eval.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_diagram_template.c -o $@

$(BUILD_DIR)/diagram_template_test: tests/diagram_template_test.c $(BUILD_DIR)/omi_diagram_template.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/diagram_template_test.c $(BUILD_DIR)/omi_diagram_template.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o -o $@

$(BUILD_DIR)/declarative_surface_test: tests/declarative_surface_test.c $(BUILD_DIR)/omi_intent_model.o $(BUILD_DIR)/omi_event_model.o $(BUILD_DIR)/omi_texture_model.o $(BUILD_DIR)/omi_diagram_template.o $(BUILD_DIR)/omi_polyform_renderer.o $(BUILD_DIR)/omi_carrier_decode.o $(BUILD_DIR)/omi_model_vfs.o $(BUILD_DIR)/omi_model_loader.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/declarative_surface_test.c $(BUILD_DIR)/omi_intent_model.o $(BUILD_DIR)/omi_event_model.o $(BUILD_DIR)/omi_texture_model.o $(BUILD_DIR)/omi_diagram_template.o $(BUILD_DIR)/omi_polyform_renderer.o $(BUILD_DIR)/omi_carrier_decode.o $(BUILD_DIR)/omi_model_vfs.o $(BUILD_DIR)/omi_model_loader.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o -o $@

$(BUILD_DIR)/omi_app_model.o: userspace/runtime/omi_app_model.c userspace/include/omi_app_model.h userspace/include/omi_diagram_template.h userspace/include/omi_intent_model.h userspace/include/omi_model_vfs.h userspace/include/omi_polyform_renderer.h userspace/include/omi_texture_model.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_app_model.c -o $@

$(BUILD_DIR)/app_model_test: tests/app_model_test.c $(BUILD_DIR)/omi_app_model.o $(BUILD_DIR)/omi_intent_model.o $(BUILD_DIR)/omi_event_model.o $(BUILD_DIR)/omi_texture_model.o $(BUILD_DIR)/omi_diagram_template.o $(BUILD_DIR)/omi_polyform_renderer.o $(BUILD_DIR)/omi_carrier_decode.o $(BUILD_DIR)/omi_model_vfs.o $(BUILD_DIR)/omi_model_loader.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/app_model_test.c $(BUILD_DIR)/omi_app_model.o $(BUILD_DIR)/omi_intent_model.o $(BUILD_DIR)/omi_event_model.o $(BUILD_DIR)/omi_texture_model.o $(BUILD_DIR)/omi_diagram_template.o $(BUILD_DIR)/omi_polyform_renderer.o $(BUILD_DIR)/omi_carrier_decode.o $(BUILD_DIR)/omi_model_vfs.o $(BUILD_DIR)/omi_model_loader.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o -o $@

$(BUILD_DIR)/omi_device_model.o: userspace/runtime/omi_device_model.c userspace/include/omi_device_model.h userspace/include/omi_event_model.h userspace/include/omi_user_init.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include -c userspace/runtime/omi_device_model.c -o $@

$(BUILD_DIR)/device_model_test: tests/device_model_test.c $(BUILD_DIR)/omi_device_model.o $(BUILD_DIR)/omi_event_model.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/device_model_test.c $(BUILD_DIR)/omi_device_model.o $(BUILD_DIR)/omi_event_model.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o -o $@

$(BUILD_DIR)/rules_tests: tests/rules_tests.c kernel/runtime/rules_engine.c kernel/runtime/bom.c kernel/vm/cons_engine.c $(BUILD_DIR)/rewrite_table.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) tests/rules_tests.c kernel/runtime/rules_engine.c kernel/runtime/bom.c kernel/vm/cons_engine.c $(BUILD_DIR)/rewrite_table.o -o $@

$(BUILD_DIR)/image_builder: tools/image_builder.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD_DIR)/rules_extract: tools/rules_extract.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD_DIR)/gauge_extract: tools/gauge_extract.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD_DIR)/gauge_table.c: docs/GAUGE_TABLE.omi $(BUILD_DIR)/gauge_extract | $(BUILD_DIR)
	./$(BUILD_DIR)/gauge_extract docs/GAUGE_TABLE.omi $@

$(BUILD_DIR)/gauge_table.o: $(BUILD_DIR)/gauge_table.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILD_DIR)/gauge_replay: tools/gauge_replay.c kernel/runtime/gauge_stepper.c kernel/runtime/escape.c kernel/runtime/trace.c polyform/encoding/aegean.c polyform/encoding/braille.c polyform/encoding/projection_address.c polyform/geometry/omi_geometry.c $(BUILD_DIR)/gauge_table.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) tools/gauge_replay.c kernel/runtime/gauge_stepper.c kernel/runtime/escape.c kernel/runtime/trace.c polyform/encoding/aegean.c polyform/encoding/braille.c polyform/encoding/projection_address.c polyform/geometry/omi_geometry.c $(BUILD_DIR)/gauge_table.o -o $@

$(BUILD_DIR)/pre_os_measurement_test: tests/pre_os_measurement_test.c kernel/runtime/gauge_stepper.c kernel/runtime/escape.c kernel/runtime/trace.c polyform/encoding/aegean.c $(BUILD_DIR)/gauge_table.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) tests/pre_os_measurement_test.c kernel/runtime/gauge_stepper.c kernel/runtime/escape.c kernel/runtime/trace.c polyform/encoding/aegean.c $(BUILD_DIR)/gauge_table.o -o $@

$(BUILD_DIR)/bitwise_kernel.o: kernel/runtime/bitwise_kernel.c kernel/include/bitwise_kernel.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c kernel/runtime/bitwise_kernel.c -o $@

$(BUILD_DIR)/bitwise_kernel_test: tests/bitwise_kernel_test.c $(BUILD_DIR)/bitwise_kernel.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) tests/bitwise_kernel_test.c $(BUILD_DIR)/bitwise_kernel.o -o $@

$(BUILD_DIR)/osi_projection.o: kernel/runtime/osi_projection.c kernel/include/osi_projection.h kernel/include/bitwise_kernel.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c kernel/runtime/osi_projection.c -o $@

$(BUILD_DIR)/osi_projection_test: tests/osi_projection_test.c $(BUILD_DIR)/osi_projection.o $(BUILD_DIR)/bitwise_kernel.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) tests/osi_projection_test.c $(BUILD_DIR)/osi_projection.o $(BUILD_DIR)/bitwise_kernel.o -o $@

$(BUILD_DIR)/polyform_block.o: polyform/src/polyform_block.c polyform/include/polyform_block.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Ipolyform/include -c polyform/src/polyform_block.c -o $@

$(BUILD_DIR)/polyform_witness.o: polyform/src/polyform_witness.c polyform/src/polyform_witness.h polyform/include/polyform_block.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Ipolyform/include -c polyform/src/polyform_witness.c -o $@

$(BUILD_DIR)/polyform_render.o: polyform/src/polyform_render.c polyform/include/polyform_block.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Ipolyform/include -c polyform/src/polyform_render.c -o $@

$(BUILD_DIR)/render_text.o: polyform/src/render_text.c polyform/include/polyform_block.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Ipolyform/include -c polyform/src/render_text.c -o $@

$(BUILD_DIR)/render_block_header.o: polyform/src/render_block_header.c polyform/include/polyform_block.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Ipolyform/include -c polyform/src/render_block_header.c -o $@

$(BUILD_DIR)/render_braille.o: polyform/src/render_braille.c polyform/include/polyform_block.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Ipolyform/include -c polyform/src/render_braille.c -o $@

$(BUILD_DIR)/render_svg.o: polyform/src/render_svg.c polyform/include/polyform_block.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Ipolyform/include -c polyform/src/render_svg.c -o $@

$(BUILD_DIR)/polyform_block_test: polyform/tests/polyform_block_test.c $(BUILD_DIR)/polyform_block.o $(BUILD_DIR)/polyform_witness.o $(BUILD_DIR)/polyform_render.o $(BUILD_DIR)/render_text.o $(BUILD_DIR)/render_block_header.o $(BUILD_DIR)/render_braille.o $(BUILD_DIR)/render_svg.o $(BUILD_DIR)/bitwise_kernel.o $(BUILD_DIR)/osi_projection.o polyform/encoding/aegean.c polyform/encoding/braille.c polyform/encoding/projection_address.c polyform/geometry/omi_geometry.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Ipolyform/include polyform/tests/polyform_block_test.c $(BUILD_DIR)/polyform_block.o $(BUILD_DIR)/polyform_witness.o $(BUILD_DIR)/polyform_render.o $(BUILD_DIR)/render_text.o $(BUILD_DIR)/render_block_header.o $(BUILD_DIR)/render_braille.o $(BUILD_DIR)/render_svg.o $(BUILD_DIR)/bitwise_kernel.o $(BUILD_DIR)/osi_projection.o polyform/encoding/aegean.c polyform/encoding/braille.c polyform/encoding/projection_address.c polyform/geometry/omi_geometry.c -o $@

$(BUILD_DIR)/polyform_witness_recompute: tools/polyform_witness_recompute.c $(BUILD_DIR)/polyform_block.o $(BUILD_DIR)/polyform_witness.o $(BUILD_DIR)/bitwise_kernel.o $(BUILD_DIR)/osi_projection.o polyform/encoding/aegean.c polyform/encoding/braille.c polyform/encoding/projection_address.c polyform/geometry/omi_geometry.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Ipolyform/include tools/polyform_witness_recompute.c $(BUILD_DIR)/polyform_block.o $(BUILD_DIR)/polyform_witness.o $(BUILD_DIR)/bitwise_kernel.o $(BUILD_DIR)/osi_projection.o polyform/encoding/aegean.c polyform/encoding/braille.c polyform/encoding/projection_address.c polyform/geometry/omi_geometry.c -o $@

$(RISCV_BUILD_DIR)/boot.o: riscv/boot.S | $(RISCV_BUILD_DIR)
	$(RISCV_CC) $(RISCV_CFLAGS) -c $< -o $@

$(RISCV_BUILD_DIR)/entry.o: riscv/entry.c kernel/include/bitwise_kernel.h kernel/include/osi_projection.h | $(RISCV_BUILD_DIR)
	$(RISCV_CC) $(RISCV_CFLAGS) -c riscv/entry.c -o $@

$(RISCV_BUILD_DIR)/bitwise_kernel.o: kernel/runtime/bitwise_kernel.c kernel/include/bitwise_kernel.h | $(RISCV_BUILD_DIR)
	$(RISCV_CC) $(RISCV_CFLAGS) -c kernel/runtime/bitwise_kernel.c -o $@

$(RISCV_BUILD_DIR)/osi_projection.o: kernel/runtime/osi_projection.c kernel/include/osi_projection.h kernel/include/bitwise_kernel.h | $(RISCV_BUILD_DIR)
	$(RISCV_CC) $(RISCV_CFLAGS) -c kernel/runtime/osi_projection.c -o $@

$(RISCV_BUILD_DIR)/freestanding.o: kernel/runtime/freestanding.c | $(RISCV_BUILD_DIR)
	$(RISCV_CC) $(RISCV_CFLAGS) -c kernel/runtime/freestanding.c -o $@

$(RISCV_BUILD_DIR)/polyform_block.o: polyform/src/polyform_block.c polyform/include/polyform_block.h | $(RISCV_BUILD_DIR)
	$(RISCV_CC) $(RISCV_CFLAGS) -c polyform/src/polyform_block.c -o $@

$(RISCV_BUILD_DIR)/polyform_witness.o: polyform/src/polyform_witness.c polyform/src/polyform_witness.h polyform/include/polyform_block.h | $(RISCV_BUILD_DIR)
	$(RISCV_CC) $(RISCV_CFLAGS) -c polyform/src/polyform_witness.c -o $@

$(RISCV_BUILD_DIR)/aegean.o: polyform/encoding/aegean.c polyform/encoding/aegean.h | $(RISCV_BUILD_DIR)
	$(RISCV_CC) $(RISCV_CFLAGS) -c polyform/encoding/aegean.c -o $@

$(RISCV_BUILD_DIR)/braille.o: polyform/encoding/braille.c polyform/encoding/braille.h | $(RISCV_BUILD_DIR)
	$(RISCV_CC) $(RISCV_CFLAGS) -c polyform/encoding/braille.c -o $@

$(RISCV_BUILD_DIR)/projection_address.o: polyform/encoding/projection_address.c polyform/encoding/projection_address.h | $(RISCV_BUILD_DIR)
	$(RISCV_CC) $(RISCV_CFLAGS) -c polyform/encoding/projection_address.c -o $@

$(RISCV_BUILD_DIR)/omi_geometry.o: polyform/geometry/omi_geometry.c polyform/geometry/omi_geometry.h | $(RISCV_BUILD_DIR)
	$(RISCV_CC) $(RISCV_CFLAGS) -c polyform/geometry/omi_geometry.c -o $@

$(RISCV_ELF): $(RISCV_BUILD_DIR)/boot.o $(RISCV_BUILD_DIR)/entry.o $(RISCV_BUILD_DIR)/bitwise_kernel.o $(RISCV_BUILD_DIR)/osi_projection.o $(RISCV_BUILD_DIR)/freestanding.o $(RISCV_BUILD_DIR)/polyform_block.o $(RISCV_BUILD_DIR)/polyform_witness.o $(RISCV_BUILD_DIR)/aegean.o $(RISCV_BUILD_DIR)/braille.o $(RISCV_BUILD_DIR)/projection_address.o $(RISCV_BUILD_DIR)/omi_geometry.o riscv/linker.ld
	$(RISCV_CC) $(RISCV_CFLAGS) -T riscv/linker.ld $(RISCV_BUILD_DIR)/boot.o $(RISCV_BUILD_DIR)/entry.o $(RISCV_BUILD_DIR)/bitwise_kernel.o $(RISCV_BUILD_DIR)/osi_projection.o $(RISCV_BUILD_DIR)/freestanding.o $(RISCV_BUILD_DIR)/polyform_block.o $(RISCV_BUILD_DIR)/polyform_witness.o $(RISCV_BUILD_DIR)/aegean.o $(RISCV_BUILD_DIR)/braille.o $(RISCV_BUILD_DIR)/projection_address.o $(RISCV_BUILD_DIR)/omi_geometry.o -o $@

$(RISCV_BIN): $(RISCV_ELF)
	$(RISCV_OBJCOPY) -O binary $< $@

gauge: $(BUILD_DIR)/gauge_table.c

$(BUILD_DIR)/rewrite_table.c: docs/RULES.omi $(BUILD_DIR)/rules_extract | $(BUILD_DIR)
	./$(BUILD_DIR)/rules_extract docs/RULES.omi $@

$(BUILD_DIR)/rewrite_table.o: $(BUILD_DIR)/rewrite_table.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILD_DIR)/rewrite_table.kernel.o: $(BUILD_DIR)/rewrite_table.c | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

rules: $(BUILD_DIR)/rewrite_table.c

$(BUILD_DIR)/replay_validator: tools/replay_validator.c kernel/boot/bom_clock.c kernel/vm/memory_graph.c kernel/vm/cons_engine.c kernel/runtime/bom.c kernel/runtime/rules_engine.c $(BUILD_DIR)/rewrite_table.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) tools/replay_validator.c kernel/boot/bom_clock.c kernel/vm/memory_graph.c kernel/vm/cons_engine.c kernel/runtime/bom.c kernel/runtime/rules_engine.c $(BUILD_DIR)/rewrite_table.o -o $@

$(BUILD_DIR)/boot.o: kernel/boot/boot.S | $(BUILD_DIR)
	$(CC) $(KERNEL_ASFLAGS) -c $< -o $@

$(BUILD_DIR)/entry.o: kernel/boot/entry.c kernel/include/model_registry.h kernel/include/page_court.h kernel/include/mmio_device_court.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

$(BUILD_DIR)/bom_clock.kernel.o: kernel/boot/bom_clock.c | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

$(BUILD_DIR)/memory_graph.kernel.o: kernel/vm/memory_graph.c | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

$(BUILD_DIR)/cons_engine.kernel.o: kernel/vm/cons_engine.c | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

$(BUILD_DIR)/serial.kernel.o: kernel/runtime/serial.c | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

$(BUILD_DIR)/page_court.kernel.o: kernel/runtime/page_court.c kernel/include/page_court.h kernel/include/serial.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c kernel/runtime/page_court.c -o $@

$(BUILD_DIR)/mmio_device_court.kernel.o: kernel/runtime/mmio_device_court.c kernel/include/mmio_device_court.h kernel/include/serial.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c kernel/runtime/mmio_device_court.c -o $@

$(BUILD_DIR)/event_packet.kernel.o: kernel/runtime/event_packet.c kernel/include/event_packet.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c kernel/runtime/event_packet.c -o $@

$(BUILD_DIR)/bom.kernel.o: kernel/runtime/bom.c | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

$(BUILD_DIR)/rules_engine.kernel.o: kernel/runtime/rules_engine.c | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

$(BUILD_DIR)/bitwise_kernel.kernel.o: kernel/runtime/bitwise_kernel.c kernel/include/bitwise_kernel.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c kernel/runtime/bitwise_kernel.c -o $@

$(BUILD_DIR)/osi_projection.kernel.o: kernel/runtime/osi_projection.c kernel/include/osi_projection.h kernel/include/bitwise_kernel.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c kernel/runtime/osi_projection.c -o $@

$(BUILD_DIR)/freestanding.kernel.o: kernel/runtime/freestanding.c | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c kernel/runtime/freestanding.c -o $@

$(BUILD_DIR)/model_trace.kernel.o: kernel/runtime/model_trace.c kernel/include/model_trace.h kernel/include/model_registry.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c kernel/runtime/model_trace.c -o $@

$(BUILD_DIR)/model_registry.kernel.o: kernel/runtime/model_registry.c kernel/include/model_registry.h kernel/include/serial.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c kernel/runtime/model_registry.c -o $@

$(BUILD_DIR)/polyform_block.kernel.o: polyform/src/polyform_block.c polyform/include/polyform_block.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c polyform/src/polyform_block.c -o $@

$(BUILD_DIR)/polyform_witness.kernel.o: polyform/src/polyform_witness.c polyform/src/polyform_witness.h polyform/include/polyform_block.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c polyform/src/polyform_witness.c -o $@

$(BUILD_DIR)/aegean.kernel.o: polyform/encoding/aegean.c polyform/encoding/aegean.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c polyform/encoding/aegean.c -o $@

$(BUILD_DIR)/braille.kernel.o: polyform/encoding/braille.c polyform/encoding/braille.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c polyform/encoding/braille.c -o $@

$(BUILD_DIR)/projection_address.kernel.o: polyform/encoding/projection_address.c polyform/encoding/projection_address.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c polyform/encoding/projection_address.c -o $@

$(BUILD_DIR)/omi_geometry.kernel.o: polyform/geometry/omi_geometry.c polyform/geometry/omi_geometry.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c polyform/geometry/omi_geometry.c -o $@

$(KERNEL_ELF): $(BUILD_DIR)/boot.o $(BUILD_DIR)/entry.o $(BUILD_DIR)/bom_clock.kernel.o $(BUILD_DIR)/memory_graph.kernel.o $(BUILD_DIR)/cons_engine.kernel.o $(BUILD_DIR)/serial.kernel.o $(BUILD_DIR)/bom.kernel.o $(BUILD_DIR)/rules_engine.kernel.o $(BUILD_DIR)/bitwise_kernel.kernel.o $(BUILD_DIR)/osi_projection.kernel.o $(BUILD_DIR)/freestanding.kernel.o $(BUILD_DIR)/model_registry.kernel.o $(BUILD_DIR)/page_court.kernel.o $(BUILD_DIR)/mmio_device_court.kernel.o $(BUILD_DIR)/event_packet.kernel.o $(BUILD_DIR)/model_trace.kernel.o $(BUILD_DIR)/polyform_block.kernel.o $(BUILD_DIR)/polyform_witness.kernel.o $(BUILD_DIR)/aegean.kernel.o $(BUILD_DIR)/braille.kernel.o $(BUILD_DIR)/projection_address.kernel.o $(BUILD_DIR)/omi_geometry.kernel.o $(BUILD_DIR)/rewrite_table.kernel.o kernel/linker.ld
	ld $(KERNEL_LDFLAGS) $(BUILD_DIR)/boot.o $(BUILD_DIR)/entry.o $(BUILD_DIR)/bom_clock.kernel.o $(BUILD_DIR)/memory_graph.kernel.o $(BUILD_DIR)/cons_engine.kernel.o $(BUILD_DIR)/serial.kernel.o $(BUILD_DIR)/bom.kernel.o $(BUILD_DIR)/rules_engine.kernel.o $(BUILD_DIR)/bitwise_kernel.kernel.o $(BUILD_DIR)/osi_projection.kernel.o $(BUILD_DIR)/freestanding.kernel.o $(BUILD_DIR)/model_registry.kernel.o $(BUILD_DIR)/page_court.kernel.o $(BUILD_DIR)/mmio_device_court.kernel.o $(BUILD_DIR)/event_packet.kernel.o $(BUILD_DIR)/model_trace.kernel.o $(BUILD_DIR)/polyform_block.kernel.o $(BUILD_DIR)/polyform_witness.kernel.o $(BUILD_DIR)/aegean.kernel.o $(BUILD_DIR)/braille.kernel.o $(BUILD_DIR)/projection_address.kernel.o $(BUILD_DIR)/omi_geometry.kernel.o $(BUILD_DIR)/rewrite_table.kernel.o -o $@

test: $(BUILD_DIR)/boot_tests $(BUILD_DIR)/graph_tests $(BUILD_DIR)/cons_tests $(BUILD_DIR)/bom_tests $(BUILD_DIR)/rules_tests
	./$(BUILD_DIR)/boot_tests
	./$(BUILD_DIR)/graph_tests
	./$(BUILD_DIR)/cons_tests
	./$(BUILD_DIR)/bom_tests
	./$(BUILD_DIR)/rules_tests

image: $(BUILD_DIR)/image_builder
	./$(BUILD_DIR)/image_builder vm_image/omi.img 4096 phase1

replay: image $(BUILD_DIR)/replay_validator
	./$(BUILD_DIR)/replay_validator vm_image/omi.img 3

gauge-replay-test: $(BUILD_DIR)/gauge_replay
	./$(BUILD_DIR)/gauge_replay

pre-os-test: $(BUILD_DIR)/pre_os_measurement_test
	./$(BUILD_DIR)/pre_os_measurement_test

bitwise-test: $(BUILD_DIR)/bitwise_kernel_test
	./$(BUILD_DIR)/bitwise_kernel_test

osi-test: $(BUILD_DIR)/osi_projection_test
	./$(BUILD_DIR)/osi_projection_test

platform-endian-test: $(BUILD_DIR)/platform_endian_test
	./$(BUILD_DIR)/platform_endian_test

polyform-test: $(BUILD_DIR)/polyform_block_test
	./$(BUILD_DIR)/polyform_block_test

model-test: $(BUILD_DIR)/model_trace_test
	./$(BUILD_DIR)/model_trace_test

model-registry-test: $(BUILD_DIR)/model_registry_test
	./$(BUILD_DIR)/model_registry_test

user-init-test: $(BUILD_DIR)/user_init_test
	./$(BUILD_DIR)/user_init_test

lazy-eval-test: $(BUILD_DIR)/lazy_eval_test
	./$(BUILD_DIR)/lazy_eval_test

model-vfs-test: $(BUILD_DIR)/model_vfs_test
	./$(BUILD_DIR)/model_vfs_test

hotplug-model-test: $(BUILD_DIR)/hotplug_model_loader_test
	./$(BUILD_DIR)/hotplug_model_loader_test

carrier-decode-test: $(BUILD_DIR)/carrier_decode_test
	./$(BUILD_DIR)/carrier_decode_test

polyform-render-test: $(BUILD_DIR)/polyform_renderer_test
	./$(BUILD_DIR)/polyform_renderer_test

polyform-coordinate-test: $(BUILD_DIR)/polyform_coordinate_test
	./$(BUILD_DIR)/polyform_coordinate_test

scope-multigraph-test: $(BUILD_DIR)/scope_multigraph_test
	./$(BUILD_DIR)/scope_multigraph_test

event-model-test: $(BUILD_DIR)/event_model_test
	./$(BUILD_DIR)/event_model_test

intent-model-test: $(BUILD_DIR)/intent_model_test
	./$(BUILD_DIR)/intent_model_test

texture-model-test: $(BUILD_DIR)/texture_model_test
	./$(BUILD_DIR)/texture_model_test

diagram-template-test: $(BUILD_DIR)/diagram_template_test
	./$(BUILD_DIR)/diagram_template_test

declarative-surface-test: $(BUILD_DIR)/declarative_surface_test
	./$(BUILD_DIR)/declarative_surface_test

app-model-test: $(BUILD_DIR)/app_model_test
	./$(BUILD_DIR)/app_model_test

device-model-test: $(BUILD_DIR)/device_model_test
	./$(BUILD_DIR)/device_model_test

event-packet-test: $(BUILD_DIR)/event_packet_test
	./$(BUILD_DIR)/event_packet_test

esp32-witness-test: $(BUILD_DIR)/esp32_witness_test
	./$(BUILD_DIR)/esp32_witness_test

workbench-test:
	node tests/workbench_model_roundtrip_test.js
	node tests/workbench_pointer_reference_test.js
	node tests/workbench_export_test.js

workbench-edit-test:
	node tests/workbench_edit_log_test.js

workbench-merge-test:
	node tests/workbench_edit_merge_test.js

workbench-sync-test:
	node tests/workbench_sync_packet_test.js

workbench-file-sync-test:
	node tests/workbench_file_sync_test.js

workbench-barcode-sync-test:
	node tests/workbench_barcode_sync_test.js

workbench-esp32-sync-test:
	node tests/workbench_esp32_sync_test.js

workbench-org-test:
	node tests/workbench_org_export_test.js
	node tests/workbench_org_babel_test.js
	node tests/workbench_noweb_tangle_test.js
	node tests/workbench_tramp_path_test.js

workbench-diagram-tangle-test:
	node tests/workbench_diagram_tangle_test.js

workbench-diagram-renderer-test:
	node tests/workbench_diagram_renderer_test.js

workbench-polyform-coordinate-test:
	node tests/workbench_polyform_coordinate_test.js

workbench-scope-multigraph-test:
	node tests/workbench_scope_multigraph_test.js

workbench-composer-test:
	node tests/workbench_composer_interface_test.js

workbench-composer-package-test:
	node tests/workbench_composer_package_test.js

workbench-package-trust-test:
	node tests/workbench_package_trust_test.js

workbench-geometric-reconciliation-test:
	node tests/workbench_geometric_reconciliation_test.js

workbench-view-switcher-test:
	node tests/workbench_view_switcher_test.js

workbench-animation-timeline-test:
	node tests/workbench_animation_timeline_test.js

workbench-fractal-subchart-test:
	node tests/workbench_fractal_subchart_unfolder_test.js

workbench-cube-differential-test:
	node tests/workbench_cube_differential_template_test.js

workbench-barcode-template-composition-test:
	node tests/workbench_barcode_template_composition_test.js

workbench-composition-trust-test:
	node tests/workbench_composition_trust_test.js

workbench-composition-bundle-test:
	node tests/workbench_composition_bundle_test.js

workbench-stream-declaration-test:
	node tests/workbench_stream_declaration_test.js

workbench-stream-projection-test:
	node tests/workbench_stream_projection_test.js

workbench-stream-overlay-test:
	node tests/workbench_stream_overlay_test.js

workbench-stream-overlay-package-test:
	node tests/workbench_stream_overlay_package_test.js

workbench-omilisp-declaration-test:
	node tests/workbench_omilisp_declaration_test.js

workbench-spom-triangulation-test:
	node tests/workbench_spom_triangulation_test.js

workbench-omi-self-declaration-test:
	node tests/workbench_omi_self_declaration_test.js

workbench-polyform-cons-reconstruction-test:
	node tests/workbench_polyform_cons_reconstruction_test.js

workbench-orientation-incidence-blackboard-test:
	node tests/workbench_orientation_incidence_blackboard_test.js

workbench-network-runtime-resolver-test:
	node tests/workbench_network_bootable_runtime_resolver_test.js

workbench-runtime-channel-manifest-test:
	node tests/workbench_runtime_channel_manifest_test.js

workbench-distributed-adapter-transport-registry-test:
	node tests/workbench_distributed_adapter_transport_registry_test.js

workbench-raw-binary-decentralized-lattice-test:
	node tests/workbench_raw_binary_decentralized_lattice_test.js

workbench-raw-binary-chunk-index-test:
	node tests/workbench_raw_binary_chunk_index_test.js

workbench-boundary-geometry-constitution-test:
	node tests/workbench_boundary_geometry_constitution_test.js

workbench-omi-observer-lattice-sitter-test:
	node tests/workbench_omi_observer_lattice_sitter_test.js

workbench-wordnet-prolog-semantic-grounding-test:
	node tests/workbench_wordnet_prolog_semantic_grounding_test.js

workbench-omi-transmutator-roundtrip-test:
	node tests/workbench_omi_transmutator_roundtrip_test.js

workbench-block-image-test:
	node tests/workbench_block_image_declaration_test.js

workbench-block-image-projection-test:
	node tests/workbench_block_image_projection_test.js

workbench-narrative-timeline-test:
	node tests/workbench_narrative_timeline_test.js

workbench-gpu-projection-test:
	node tests/workbench_gpu_projection_test.js

workbench-webgl-runtime-test:
	node tests/workbench_webgl_runtime_adapter_test.js

workbench-webgl-preview-test:
	node tests/workbench_webgl_canvas_preview_test.js

workbench-gles-runtime-test:
	node tests/workbench_gles_runtime_adapter_test.js

workbench-opengl-runtime-test:
	node tests/workbench_opengl_runtime_adapter_test.js

workbench-graphics-equivalence-test:
	node tests/workbench_graphics_backend_equivalence_test.js

workbench-visual-equivalence-test:
	node tests/workbench_visual_artifact_equivalence_test.js

kernel: $(KERNEL_ELF)

iso: image kernel
	rm -rf $(ISO_ROOT)
	mkdir -p $(ISO_ROOT)/boot/grub
	cp $(KERNEL_ELF) $(ISO_ROOT)/boot/omi-kernel.elf
	cp vm_image/omi.img $(ISO_ROOT)/boot/omi.img
	printf '%s\n' \
		'set timeout=0' \
		'set default=0' \
		'menuentry "OMI Phase 6" {' \
		'  multiboot2 /boot/omi-kernel.elf' \
		'  module2 /boot/omi.img omi.img' \
		'  boot' \
		'}' > $(ISO_ROOT)/boot/grub/grub.cfg
	grub-mkrescue -o $(OMI_ISO) $(ISO_ROOT) >/dev/null 2>&1

run: iso
	./tools/qemu_run.sh $(OMI_ISO)

qemu-foundation-test: iso $(BUILD_DIR)/polyform_witness_recompute
	sh ./tools/qemu_foundation_test.sh $(OMI_ISO) $(BUILD_DIR)/qemu_foundation.log $(BUILD_DIR)/polyform_witness_recompute

qemu-model-test: iso
	sh ./tools/validate_qemu_model_trace.sh $(OMI_ISO) $(BUILD_DIR)/qemu_model_trace.log

qemu-model-registry-test: iso
	sh ./tools/validate_qemu_model_registry.sh $(OMI_ISO) $(BUILD_DIR)/qemu_model_registry.log

qemu-tcg-foundation-test: iso $(BUILD_DIR)/polyform_witness_recompute
	sh ./tools/validate_qemu_tcg_foundation.sh $(OMI_ISO) $(BUILD_DIR)/qemu_tcg_foundation.log $(BUILD_DIR)/polyform_witness_recompute

qemu-tcg-model-registry-test: iso
	sh ./tools/validate_qemu_tcg_model_registry.sh $(OMI_ISO) $(BUILD_DIR)/qemu_tcg_model_registry.log

qemu-tcg-court: iso $(BUILD_DIR)/polyform_witness_recompute
	sh ./tools/validate_qemu_tcg_court.sh $(OMI_ISO) $(BUILD_DIR)/qemu_tcg_court.log $(BUILD_DIR)/polyform_witness_recompute

qemu-page-court-test: iso
	sh ./tools/validate_qemu_page_court.sh $(OMI_ISO) $(BUILD_DIR)/qemu_page_court.log

qemu-mmio-device-court-test: iso
	sh ./tools/validate_qemu_mmio_device_court.sh $(OMI_ISO) $(BUILD_DIR)/qemu_mmio_device_court.log

qemu-portable-test:
	$(MAKE) qemu-tcg-foundation-test
	$(MAKE) qemu-tcg-model-registry-test
	$(MAKE) qemu-tcg-court
	$(MAKE) qemu-page-court-test
	$(MAKE) qemu-mmio-device-court-test

qemu-platform-test: iso
	sh ./tools/qemu_multi_platform_test.sh $(OMI_ISO)

qemu-multi-platform-court: iso $(BUILD_DIR)/polyform_witness_recompute
	sh ./tools/qemu_multi_platform_court.sh $(OMI_ISO) $(BUILD_DIR)/qemu-multi-platform-court $(BUILD_DIR)/polyform_witness_recompute

qemu-multi-platform-report-test:
	node tests/qemu_multi_platform_report_test.js

qemu-cross-arch-readiness:
	sh ./tools/qemu_cross_arch_readiness.sh

riscv-image: $(RISCV_ELF) $(RISCV_BIN)

riscv-run: riscv-image
	sh ./riscv/run_qemu.sh $(RISCV_ELF)

riscv-qemu-foundation-test: riscv-image $(BUILD_DIR)/polyform_witness_recompute
	sh ./tools/riscv_foundation_test.sh $(RISCV_ELF) $(RISCV_BUILD_DIR)/riscv_foundation.log $(BUILD_DIR)/polyform_witness_recompute

unit-test:
	$(MAKE) test
	$(MAKE) bitwise-test
	$(MAKE) osi-test
	$(MAKE) pre-os-test
	$(MAKE) platform-endian-test
	$(MAKE) polyform-test
	$(MAKE) model-test
	$(MAKE) model-registry-test
	$(MAKE) user-init-test
	$(MAKE) lazy-eval-test
	$(MAKE) model-vfs-test
	$(MAKE) hotplug-model-test
	$(MAKE) carrier-decode-test
	$(MAKE) polyform-render-test
	$(MAKE) polyform-coordinate-test
	$(MAKE) scope-multigraph-test
	$(MAKE) event-model-test
	$(MAKE) intent-model-test
	$(MAKE) texture-model-test
	$(MAKE) diagram-template-test
	$(MAKE) declarative-surface-test
	$(MAKE) app-model-test
	$(MAKE) device-model-test
	$(MAKE) event-packet-test
	$(MAKE) esp32-witness-test
	$(MAKE) workbench-test
	$(MAKE) workbench-edit-test
	$(MAKE) workbench-merge-test
	$(MAKE) workbench-sync-test
	$(MAKE) workbench-file-sync-test
	$(MAKE) workbench-barcode-sync-test
	$(MAKE) workbench-esp32-sync-test
	$(MAKE) workbench-org-test
	$(MAKE) workbench-diagram-tangle-test
	$(MAKE) workbench-diagram-renderer-test
	$(MAKE) workbench-polyform-coordinate-test
	$(MAKE) workbench-scope-multigraph-test
	$(MAKE) workbench-composer-test
	$(MAKE) workbench-composer-package-test
	$(MAKE) workbench-package-trust-test
	$(MAKE) workbench-geometric-reconciliation-test
	$(MAKE) workbench-view-switcher-test
	$(MAKE) workbench-animation-timeline-test
	$(MAKE) workbench-fractal-subchart-test
	$(MAKE) workbench-cube-differential-test
	$(MAKE) workbench-barcode-template-composition-test
	$(MAKE) workbench-composition-trust-test
	$(MAKE) workbench-composition-bundle-test
	$(MAKE) workbench-stream-declaration-test
	$(MAKE) workbench-stream-projection-test
	$(MAKE) workbench-stream-overlay-test
	$(MAKE) workbench-stream-overlay-package-test
	$(MAKE) workbench-omilisp-declaration-test
	$(MAKE) workbench-spom-triangulation-test
	$(MAKE) workbench-omi-self-declaration-test
	$(MAKE) workbench-polyform-cons-reconstruction-test
	$(MAKE) workbench-orientation-incidence-blackboard-test
	$(MAKE) workbench-network-runtime-resolver-test
	$(MAKE) workbench-runtime-channel-manifest-test
	$(MAKE) workbench-distributed-adapter-transport-registry-test
	$(MAKE) workbench-raw-binary-decentralized-lattice-test
	$(MAKE) workbench-raw-binary-chunk-index-test
	$(MAKE) workbench-boundary-geometry-constitution-test
	$(MAKE) workbench-omi-observer-lattice-sitter-test
	$(MAKE) workbench-wordnet-prolog-semantic-grounding-test
	$(MAKE) workbench-omi-transmutator-roundtrip-test
	$(MAKE) workbench-block-image-test
	$(MAKE) workbench-block-image-projection-test
	$(MAKE) workbench-narrative-timeline-test
	$(MAKE) workbench-gpu-projection-test
	$(MAKE) workbench-webgl-runtime-test
	$(MAKE) workbench-webgl-preview-test
	$(MAKE) workbench-gles-runtime-test
	$(MAKE) workbench-opengl-runtime-test
	$(MAKE) workbench-graphics-equivalence-test
	$(MAKE) workbench-visual-equivalence-test
	$(MAKE) qemu-multi-platform-report-test
	$(MAKE) qemu-page-court-test
	$(MAKE) qemu-mmio-device-court-test

e2e-test:
	$(MAKE) qemu-foundation-test
	$(MAKE) qemu-platform-test
	$(MAKE) qemu-cross-arch-readiness
	$(MAKE) riscv-qemu-foundation-test
	$(MAKE) gauge-replay-test
	$(MAKE) replay

stress-test: iso $(BUILD_DIR)/replay_validator
	sh ./tools/stress_test.sh $(OMI_ISO) $(STRESS_RUNS)

full-test:
	$(MAKE) unit-test
	$(MAKE) e2e-test
	$(MAKE) stress-test

foundation-proof: full-test

clean:
	rm -rf $(BUILD_DIR) $(RISCV_BUILD_DIR)
