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

.PHONY: all test unit-test e2e-test stress-test qemu-platform-test qemu-cross-arch-readiness riscv-image riscv-run riscv-qemu-foundation-test polyform-test model-test model-registry-test user-init-test lazy-eval-test model-vfs-test qemu-model-test qemu-model-registry-test full-test image kernel iso run replay rules gauge-replay-test platform-endian-test pre-os-test bitwise-test osi-test qemu-foundation-test foundation-proof clean

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

$(BUILD_DIR)/model_vfs_test: tests/model_vfs_test.c $(BUILD_DIR)/omi_model_vfs.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o | $(BUILD_DIR)
	$(CC) $(CFLAGS) -Iuserspace/include tests/model_vfs_test.c $(BUILD_DIR)/omi_model_vfs.o $(BUILD_DIR)/omi_lazy_eval.o $(BUILD_DIR)/omi_user_init.o $(BUILD_DIR)/model_registry.o -o $@

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

$(BUILD_DIR)/entry.o: kernel/boot/entry.c kernel/include/model_registry.h | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

$(BUILD_DIR)/bom_clock.kernel.o: kernel/boot/bom_clock.c | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

$(BUILD_DIR)/memory_graph.kernel.o: kernel/vm/memory_graph.c | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

$(BUILD_DIR)/cons_engine.kernel.o: kernel/vm/cons_engine.c | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

$(BUILD_DIR)/serial.kernel.o: kernel/runtime/serial.c | $(BUILD_DIR)
	$(CC) $(KERNEL_CFLAGS) -c $< -o $@

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

$(KERNEL_ELF): $(BUILD_DIR)/boot.o $(BUILD_DIR)/entry.o $(BUILD_DIR)/bom_clock.kernel.o $(BUILD_DIR)/memory_graph.kernel.o $(BUILD_DIR)/cons_engine.kernel.o $(BUILD_DIR)/serial.kernel.o $(BUILD_DIR)/bom.kernel.o $(BUILD_DIR)/rules_engine.kernel.o $(BUILD_DIR)/bitwise_kernel.kernel.o $(BUILD_DIR)/osi_projection.kernel.o $(BUILD_DIR)/freestanding.kernel.o $(BUILD_DIR)/model_registry.kernel.o $(BUILD_DIR)/model_trace.kernel.o $(BUILD_DIR)/polyform_block.kernel.o $(BUILD_DIR)/polyform_witness.kernel.o $(BUILD_DIR)/aegean.kernel.o $(BUILD_DIR)/braille.kernel.o $(BUILD_DIR)/projection_address.kernel.o $(BUILD_DIR)/omi_geometry.kernel.o $(BUILD_DIR)/rewrite_table.kernel.o kernel/linker.ld
	ld $(KERNEL_LDFLAGS) $(BUILD_DIR)/boot.o $(BUILD_DIR)/entry.o $(BUILD_DIR)/bom_clock.kernel.o $(BUILD_DIR)/memory_graph.kernel.o $(BUILD_DIR)/cons_engine.kernel.o $(BUILD_DIR)/serial.kernel.o $(BUILD_DIR)/bom.kernel.o $(BUILD_DIR)/rules_engine.kernel.o $(BUILD_DIR)/bitwise_kernel.kernel.o $(BUILD_DIR)/osi_projection.kernel.o $(BUILD_DIR)/freestanding.kernel.o $(BUILD_DIR)/model_registry.kernel.o $(BUILD_DIR)/model_trace.kernel.o $(BUILD_DIR)/polyform_block.kernel.o $(BUILD_DIR)/polyform_witness.kernel.o $(BUILD_DIR)/aegean.kernel.o $(BUILD_DIR)/braille.kernel.o $(BUILD_DIR)/projection_address.kernel.o $(BUILD_DIR)/omi_geometry.kernel.o $(BUILD_DIR)/rewrite_table.kernel.o -o $@

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

qemu-platform-test: iso
	sh ./tools/qemu_multi_platform_test.sh $(OMI_ISO)

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
