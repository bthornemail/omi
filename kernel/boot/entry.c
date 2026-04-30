#include "../include/bom.h"
#include "../include/graph.h"
#include "../include/multiboot2.h"
#include "../include/rules.h"
#include "../include/serial.h"

#define OMI_ORBIT_SEED 0x00000001u
#define OMI_ORBIT_WINDOW 64u
#define OMI_MAX_ORBIT_STEPS 1024u
#define OMI_MAX_REWRITE_PASSES 1u
#define OMI_SYMBOL_TRACE_LIMIT 4u

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

static void print_orbit_step(uint32_t step, uint32_t addr, const omi_rules_state_t *state)
{
    omi_serial_write_string("STEP ");
    omi_serial_write_u32(step);
    omi_serial_write_string(": addr=");
    omi_serial_write_hex32(addr);
    omi_serial_write_string(" steps=");
    omi_serial_write_u32(state->steps);
    omi_serial_write_string(" bindings=");
    omi_serial_write_u32(state->summary.bindings);
    omi_serial_write_string(" null=");
    omi_serial_write_u32(state->summary.nulls);
    omi_serial_write_string(" transient=");
    omi_serial_write_u32(state->summary.transients);
    omi_serial_write_string(" cons_edges=");
    omi_serial_write_u32(state->cons_edge_count);
    omi_serial_write_string(" regions=");
    omi_serial_write_u32(state->region_count);
    omi_serial_write_string(" orbit=");
    omi_serial_write_hex32(state->orbit_id);
    omi_serial_write_string("\n");
}

static void print_symbols(const omi_symbol_table_t *symbols)
{
    uint32_t limit = symbols && symbols->count < OMI_SYMBOL_TRACE_LIMIT ? symbols->count : OMI_SYMBOL_TRACE_LIMIT;

    omi_serial_write_string("SYMBOL TABLE count=");
    omi_serial_write_u32(symbols ? symbols->count : 0u);
    omi_serial_write_string("\n");

    for (uint32_t i = 0; symbols && i < limit; i++) {
        const omi_symbol_entry_t *symbol = &symbols->entries[i];
        omi_serial_write_string("SYMBOL ");
        omi_serial_write_u32(i);
        omi_serial_write_string(": start=");
        omi_serial_write_hex32(symbol->region_start);
        omi_serial_write_string(" len=");
        omi_serial_write_u32(symbol->region_len);
        omi_serial_write_string(" value=");
        omi_serial_write_hex32(symbol->value);
        omi_serial_write_string(" orbit=");
        omi_serial_write_hex32(symbol->orbit_id);
        omi_serial_write_string("\n");
    }

    if (symbols && symbols->count > limit) {
        omi_serial_write_string("SYMBOL ... remaining=");
        omi_serial_write_u32(symbols->count - limit);
        omi_serial_write_string("\n");
    }
}

static void qemu_debug_exit(void)
{
    __asm__ volatile("outb %0, %1" : : "a"((uint8_t)0x10), "Nd"((uint16_t)0x00f4));
}

void omi_kernel_entry(uint32_t magic, uint32_t info_addr)
{
    omi_serial_init();

    omi_serial_write_string("OMI BOOT\n");
    omi_serial_write_string("OMI PHASE 3 SYMBOLIC REWRITE FIELD\n");
    omi_serial_write_string("multiboot magic=");
    omi_serial_write_hex32(magic);
    omi_serial_write_string(" info=");
    omi_serial_write_hex32(info_addr);
    omi_serial_write_string("\n");

    omi_memory_view_t memory = find_graph_module(magic, info_addr);
    omi_serial_write_string("graph bytes=");
    omi_serial_write_size(memory.len);
    omi_serial_write_string("\n");

    uint32_t addr = OMI_ORBIT_SEED;
    omi_rules_state_t previous = {0};
    omi_rules_state_t current = {0};
    omi_symbol_table_t symbols = {0};
    uint32_t rewrites = 0;

    for (uint32_t step = 0; step < OMI_MAX_ORBIT_STEPS; step++) {
        omi_rules_evaluate(memory, addr, OMI_ORBIT_WINDOW, &current, omi_bom_permute);
        print_orbit_step(step, addr, &current);

        if (current.region_count > 0) {
            omi_serial_write_string("CONS REGION FORMED size=");
            omi_serial_write_u32(current.region_count);
            omi_serial_write_string("\n");
            omi_symbols_from_regions(current.regions, current.region_count, current.orbit_id, &symbols);
            print_symbols(&symbols);
        }

        if (step > 0 && omi_rules_summary_equal(&previous.summary, &current.summary)) {
            if (rewrites < OMI_MAX_REWRITE_PASSES && omi_apply_split_rewrite(memory, &symbols)) {
                omi_serial_write_string("REWRITE: split(symbol=0)\n");
                rewrites++;
                previous = (omi_rules_state_t){0};
                addr = OMI_ORBIT_SEED;
                continue;
            }

            omi_serial_write_string("OMI STABLE FIXPOINT\n");
            break;
        }

        if (current.orbit_closed) {
            omi_serial_write_string("OMI ORBIT CLOSED\n");
            break;
        }

        previous = current;
        addr = omi_bom_permute(addr);
    }

    omi_serial_write_string("OMI HALT\n");
    qemu_debug_exit();
}
