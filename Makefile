CC ?= cc
CFLAGS ?= -std=c11 -Wall -Wextra -Werror -Ikernel/include
KERNEL_CFLAGS := -std=c11 -Wall -Wextra -Werror -Ikernel/include -m32 -ffreestanding -fno-pic -fno-stack-protector -fno-builtin -nostdlib
KERNEL_ASFLAGS := -m32
KERNEL_LDFLAGS := -m elf_i386 -nostdlib -T kernel/linker.ld
BUILD_DIR := build
ISO_ROOT := $(BUILD_DIR)/iso
KERNEL_ELF := $(BUILD_DIR)/omi-kernel.elf
OMI_ISO := $(BUILD_DIR)/omi.iso

.PHONY: all test image kernel iso run replay rules pre-os-test bitwise-test osi-test clean

all: test image replay kernel iso

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(BUILD_DIR)/boot_tests: tests/boot_tests.c kernel/boot/bom_clock.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD_DIR)/graph_tests: tests/graph_tests.c kernel/vm/memory_graph.c kernel/vm/cons_engine.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD_DIR)/cons_tests: tests/cons_tests.c kernel/vm/cons_engine.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD_DIR)/bom_tests: tests/bom_tests.c kernel/vm/memory_graph.c kernel/vm/cons_engine.c kernel/runtime/bom.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ -o $@

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

$(BUILD_DIR)/entry.o: kernel/boot/entry.c | $(BUILD_DIR)
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

$(KERNEL_ELF): $(BUILD_DIR)/boot.o $(BUILD_DIR)/entry.o $(BUILD_DIR)/bom_clock.kernel.o $(BUILD_DIR)/memory_graph.kernel.o $(BUILD_DIR)/cons_engine.kernel.o $(BUILD_DIR)/serial.kernel.o $(BUILD_DIR)/bom.kernel.o $(BUILD_DIR)/rules_engine.kernel.o $(BUILD_DIR)/rewrite_table.kernel.o kernel/linker.ld
	ld $(KERNEL_LDFLAGS) $(BUILD_DIR)/boot.o $(BUILD_DIR)/entry.o $(BUILD_DIR)/bom_clock.kernel.o $(BUILD_DIR)/memory_graph.kernel.o $(BUILD_DIR)/cons_engine.kernel.o $(BUILD_DIR)/serial.kernel.o $(BUILD_DIR)/bom.kernel.o $(BUILD_DIR)/rules_engine.kernel.o $(BUILD_DIR)/rewrite_table.kernel.o -o $@

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

pre-os-test: $(BUILD_DIR)/pre_os_measurement_test
	./$(BUILD_DIR)/pre_os_measurement_test

bitwise-test: $(BUILD_DIR)/bitwise_kernel_test
	./$(BUILD_DIR)/bitwise_kernel_test

osi-test: $(BUILD_DIR)/osi_projection_test
	./$(BUILD_DIR)/osi_projection_test

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

clean:
	rm -rf $(BUILD_DIR)
