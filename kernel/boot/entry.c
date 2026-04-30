#include "../include/bom.h"
#include "../include/graph.h"
#include "../include/multiboot2.h"
#include "../include/serial.h"

static uint8_t fallback_memory[16] = {
    0x11, 0x11, 0x00, 0x33, 0x22, 0x22, 0x44, 0x45,
    0x00, 0x00, 0x7f, 0x7f, 0x01, 0x02, 0x80, 0x80,
};

static uintptr_t align8(uintptr_t value)
{
    return (value + 7u) & ~(uintptr_t)7u;
}

static omi_memory_view_t find_graph_module(uint32_t magic, uint32_t info_addr)
{
    if (magic != OMI_MULTIBOOT2_BOOTLOADER_MAGIC || info_addr == 0) {
        return (omi_memory_view_t){.bytes = fallback_memory, .len = sizeof(fallback_memory)};
    }

    uint32_t total_size = *(uint32_t *)(uintptr_t)info_addr;
    uintptr_t cursor = (uintptr_t)info_addr + 8u;
    uintptr_t end = (uintptr_t)info_addr + total_size;

    while (cursor + sizeof(omi_multiboot_tag_t) <= end) {
        omi_multiboot_tag_t *tag = (omi_multiboot_tag_t *)cursor;
        if (tag->type == OMI_MULTIBOOT2_TAG_TYPE_END) {
            break;
        }

        if (tag->type == OMI_MULTIBOOT2_TAG_TYPE_MODULE) {
            omi_multiboot_tag_module_t *module = (omi_multiboot_tag_module_t *)tag;
            if (module->mod_end > module->mod_start) {
                return (omi_memory_view_t){
                    .bytes = (uint8_t *)(uintptr_t)module->mod_start,
                    .len = (size_t)(module->mod_end - module->mod_start),
                };
            }
        }

        cursor = align8(cursor + tag->size);
    }

    return (omi_memory_view_t){.bytes = fallback_memory, .len = sizeof(fallback_memory)};
}

static void print_summary(omi_tick_t tick, omi_memory_view_t memory)
{
    omi_cons_summary_t summary = omi_compute_cons_summary(memory);

    omi_serial_write_string("BOM tick ");
    omi_serial_write_u32((uint32_t)tick);
    omi_serial_write_string(": bytes=");
    omi_serial_write_size(memory.len);
    omi_serial_write_string(" bindings=");
    omi_serial_write_size(summary.bindings);
    omi_serial_write_string(" null=");
    omi_serial_write_size(summary.null_collapses);
    omi_serial_write_string(" transient=");
    omi_serial_write_size(summary.transients);
    omi_serial_write_string("\n");
}

static void qemu_debug_exit(void)
{
    __asm__ volatile("outb %0, %1" : : "a"((uint8_t)0x10), "Nd"((uint16_t)0x00f4));
}

void omi_kernel_entry(uint32_t magic, uint32_t info_addr)
{
    omi_bom_clock_t clock;
    omi_bom_init(&clock);
    omi_serial_init();

    omi_serial_write_string("OMI BOOT\n");
    omi_serial_write_string("multiboot magic=");
    omi_serial_write_hex32(magic);
    omi_serial_write_string(" info=");
    omi_serial_write_hex32(info_addr);
    omi_serial_write_string("\n");

    omi_memory_view_t memory = find_graph_module(magic, info_addr);

    print_summary(clock.tick, memory);
    for (int i = 0; i < 3; i++) {
        omi_invert_byte_order(memory);
        omi_bom_advance(&clock);
        print_summary(clock.tick, memory);
    }

    omi_serial_write_string("OMI HALT\n");
    qemu_debug_exit();
}
