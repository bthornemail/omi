#include "../include/bom.h"
#include "../include/bitwise_kernel.h"
#include "../include/graph.h"
#include "../include/model_registry.h"
#include "../include/mmio_device_court.h"
#include "../include/page_court.h"
#include "../include/multiboot2.h"
#include "../include/osi_projection.h"
#include "../include/rules.h"
#include "../include/serial.h"
#include "../../polyform/include/polyform_block.h"

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
        omi_serial_write_string(": id=");
        omi_serial_write_hex32(symbol->symbol_id);
        omi_serial_write_string(" content=");
        omi_serial_write_hex32(symbol->content_hash);
        omi_serial_write_string(" orbit=");
        omi_serial_write_hex32(symbol->orbit_id);
        omi_serial_write_string(" start=");
        omi_serial_write_hex32(symbol->region_start);
        omi_serial_write_string(" len=");
        omi_serial_write_u32(symbol->region_len);
        omi_serial_write_string(" value=");
        omi_serial_write_hex32(symbol->value);
        omi_serial_write_string("\n");

        if (symbol->reused) {
            omi_serial_write_string("REUSE DETECTED content=");
            omi_serial_write_hex32(symbol->content_hash);
            omi_serial_write_string("\n");
        }
    }

    if (symbols && symbols->count > limit) {
        omi_serial_write_string("SYMBOL ... remaining=");
        omi_serial_write_u32(symbols->count - limit);
        omi_serial_write_string("\n");
    }
}

static void print_rule_table(void)
{
    omi_serial_write_string("RULE TABLE count=");
    omi_serial_write_u32(omi_rewrite_rule_count());
    omi_serial_write_string("\n");

    for (uint32_t i = 0; i < omi_rewrite_rule_count(); i++) {
        const omi_rewrite_rule_t *rule = omi_find_rewrite_rule((omi_rewrite_id_t)(i + 1u));
        if (!rule) {
            continue;
        }

        omi_serial_write_string("RULE ");
        omi_serial_write_u32((uint32_t)rule->id);
        omi_serial_write_string(": ");
        omi_serial_write_string(rule->name);
        omi_serial_write_string(" min_region_len=");
        omi_serial_write_u32(rule->min_region_len);
        omi_serial_write_string("\n");
    }
}

static void print_diagnostic_table(void)
{
    omi_serial_write_string("DIAGNOSTIC TABLE count=");
    omi_serial_write_u32(omi_diagnostic_rule_count());
    omi_serial_write_string("\n");

    for (uint32_t i = 1; i <= omi_diagnostic_rule_count(); i++) {
        const omi_diagnostic_rule_t *rule = omi_find_diagnostic_rule((omi_diagnostic_id_t)i);
        if (!rule) {
            continue;
        }

        omi_serial_write_string("DIAG ");
        omi_serial_write_u32((uint32_t)rule->id);
        omi_serial_write_string(": ");
        omi_serial_write_string(rule->severity == OMI_DIAGNOSTIC_VIOLATION ? "violation " : "warning ");
        omi_serial_write_string(rule->name);
        omi_serial_write_string("\n");
    }
}

static void print_diagnostic_report(const omi_diagnostic_report_t *report)
{
    for (uint32_t i = 0; report && i < report->count; i++) {
        const omi_diagnostic_result_t *result = &report->results[i];
        if (!result->rule) {
            continue;
        }

        omi_serial_write_string(result->rule->severity == OMI_DIAGNOSTIC_VIOLATION ? "VIOLATION " : "WARNING ");
        omi_serial_write_string(result->rule->name);
        omi_serial_write_string(" subject=");
        omi_serial_write_hex32(result->subject);
        omi_serial_write_string("\n");
    }

    if (omi_diagnostic_report_valid(report)) {
        omi_serial_write_string("VALID STATE\n");
    } else {
        omi_serial_write_string("OMI INVALID STATE\n");
    }
}

static void qemu_debug_exit(void)
{
    __asm__ volatile("outb %0, %1" : : "a"((uint8_t)0x10), "Nd"((uint16_t)0x00f4));
}

static void print_phase28_qemu(uint32_t tick, const kernel_state_t *state)
{
    omi_serial_write_string("PHASE28_QEMU tick=");
    omi_serial_write_u32(tick);
    omi_serial_write_string(" K=");
    omi_serial_write_hex8(state->K);
    omi_serial_write_string(" fano=");
    omi_serial_write_hex8(state->fano);
    omi_serial_write_string(" sonar_hi=");
    omi_serial_write_hex32(state->sonar.hi);
    omi_serial_write_string(" sonar_lo=");
    omi_serial_write_hex32(state->sonar.lo);
    omi_serial_write_string("\n");
}

static void print_phase30_qemu(uint32_t layer, const omi_osi_projection_t *projection)
{
    omi_serial_write_string("PHASE30_QEMU layer=");
    omi_serial_write_u32(layer);
    omi_serial_write_string(" digit=");
    omi_serial_write_hex8(projection->visible_digit);
    omi_serial_write_string(" address=");
    omi_serial_write_hex32(projection->address);
    omi_serial_write_string(" simplex=");
    omi_serial_write_u32(projection->simplex_class);
    omi_serial_write_string("\n");
}

static void print_polyform_block_qemu(const polyform_block_t *block)
{
    const polyform_block_fields_t *fields = &block->fields;

    omi_serial_write_string("POLYFORM_BLOCK tick=");
    omi_serial_write_u32((uint32_t)fields->tick);
    omi_serial_write_string(" K=");
    omi_serial_write_hex8(fields->K);
    omi_serial_write_string(" fano=");
    omi_serial_write_hex8(fields->fano);
    omi_serial_write_string(" sonar_hi=");
    omi_serial_write_hex32(fields->sonar.hi);
    omi_serial_write_string(" sonar_lo=");
    omi_serial_write_hex32(fields->sonar.lo);
    omi_serial_write_string(" digit=");
    omi_serial_write_hex8(fields->digit);
    omi_serial_write_string(" witness=");
    omi_serial_write_hex32(block->witness);
    omi_serial_write_string("\n");
}

static void print_foundation_qemu_proof(void)
{
    kernel_state_t state = {
        .K = 0x00u,
        .fano = 0x01u,
        .sonar = { .lo = 0x00000001u, .hi = 0x00000000u },
        .GS = OMI_BITWISE_KERNEL_GS
    };

    omi_serial_write_string("FOUNDATION_QEMU_BEGIN\n");
    for (uint32_t tick = 0; tick <= 5u; tick++) {
        print_phase28_qemu(tick, &state);
        if (tick < 5u) {
            kernel_tick(&state);
        }
    }

    for (uint32_t tick = 5u; tick < 11u; tick++) {
        kernel_tick(&state);
    }

    omi_osi_projection_t osi_stack[OMI_POLYFORM_OSI_LAYER_COUNT] = {{0}};
    for (uint32_t layer = OMI_OSI_PHYSICAL; layer <= OMI_OSI_APPLICATION; layer++) {
        osi_stack[layer - 1u] = omi_project_osi_layer(&state, 11u, (omi_osi_layer_t)layer);
        print_phase30_qemu(layer, &osi_stack[layer - 1u]);
    }

    polyform_block_t block = polyform_block_from_state(&state, 11u, osi_stack);
    print_polyform_block_qemu(&block);
    omi_serial_write_string("FOUNDATION_QEMU_END\n");
}

void omi_kernel_entry(uint32_t magic, uint32_t info_addr)
{
    omi_serial_init();

    omi_serial_write_string("OMI BOOT\n");
    print_foundation_qemu_proof();
    omi_emit_model_registry_witness();
    omi_emit_page_court_witness();
    omi_emit_mmio_device_court_witness();
    omi_serial_write_string("OMI PHASE 6 CONTENT-ADDRESSABLE SYMBOL FIELD\n");
    omi_serial_write_string("multiboot magic=");
    omi_serial_write_hex32(magic);
    omi_serial_write_string(" info=");
    omi_serial_write_hex32(info_addr);
    omi_serial_write_string("\n");

    omi_memory_view_t memory = find_graph_module(magic, info_addr);
    omi_serial_write_string("graph bytes=");
    omi_serial_write_size(memory.len);
    omi_serial_write_string("\n");
    print_rule_table();
    print_diagnostic_table();

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
            omi_symbols_from_regions(current.regions, current.region_count, memory, current.orbit_id, &symbols);
            print_symbols(&symbols);
        }

        if (step > 0 && omi_rules_summary_equal(&previous.summary, &current.summary)) {
            const omi_rewrite_rule_t *rule = omi_first_rewrite_rule();
            uint32_t symbol_index = 0;
            if (rewrites < OMI_MAX_REWRITE_PASSES &&
                omi_apply_rewrite_rule(memory, &symbols, rule, &symbol_index)) {
                omi_serial_write_string("REWRITE rule=");
                omi_serial_write_string(rule->name);
                omi_serial_write_string(" symbol_id=");
                omi_serial_write_hex32(symbols.entries[symbol_index].symbol_id);
                omi_serial_write_string("\n");
                rewrites++;
                previous = (omi_rules_state_t){0};
                addr = OMI_ORBIT_SEED;
                continue;
            }

            omi_serial_write_string("OMI STABLE FIXPOINT\n");
            omi_diagnostic_report_t report;
            omi_evaluate_diagnostics(&current, &report);
            print_diagnostic_report(&report);
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
