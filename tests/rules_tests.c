#include "../kernel/include/bom.h"
#include "../kernel/include/rules.h"
#include <assert.h>

int main(void)
{
    uint8_t bytes[] = {
        0x11, 0x11, 0x00, 0x33, 0x22, 0x22, 0x44, 0x45,
        0x11, 0x11, 0x00, 0x33, 0x22, 0x22, 0x44, 0x45,
    };
    omi_memory_view_t memory = {.bytes = bytes, .len = sizeof(bytes)};
    omi_rules_state_t state;

    omi_rules_evaluate(memory, 0x00000001u, 16u, &state, omi_bom_permute);

    assert(state.steps == 16);
    assert(state.summary.bindings + state.summary.nulls + state.summary.transients == 16);
    assert(state.cons_edge_count <= 64);
    assert(state.region_count > 0);
    assert(state.orbit_id == omi_bom_orbit_hash(0x00000001u, state.steps));

    omi_rules_summary_t same = state.summary;
    assert(omi_rules_summary_equal(&state.summary, &same));

    same.transients++;
    assert(!omi_rules_summary_equal(&state.summary, &same));

    omi_symbol_table_t symbols;
    omi_symbols_from_regions(state.regions, state.region_count, memory, state.orbit_id, &symbols);
    assert(symbols.count == state.region_count || symbols.count == OMI_MAX_SYMBOLS);
    assert(symbols.count > 0);
    assert(symbols.entries[0].content_hash ==
           omi_symbol_content_hash(memory, symbols.entries[0].region_start, symbols.entries[0].region_len));
    assert(symbols.entries[0].symbol_id ==
           omi_symbol_id(symbols.entries[0].content_hash, symbols.entries[0].orbit_id));

    int saw_reuse = 0;
    for (uint32_t i = 0; i < symbols.count; i++) {
        if (symbols.entries[i].reused) {
            saw_reuse = 1;
        }
    }
    assert(saw_reuse);

    const omi_rewrite_rule_t *rule = omi_first_rewrite_rule();
    uint32_t symbol_index = 99;
    uint8_t before = bytes[symbols.entries[0].region_start + (symbols.entries[0].region_len / 2u)];
    assert(omi_rewrite_rule_count() == 1);
    assert(rule);
    assert(rule->id == OMI_REWRITE_SPLIT_REGION);
    assert(rule->min_region_len == 2);
    assert(omi_apply_rewrite_rule(memory, &symbols, rule, &symbol_index) == 1);
    assert(symbol_index == 0);
    assert(bytes[symbols.entries[0].region_start + (symbols.entries[0].region_len / 2u)] != before);

    assert(omi_diagnostic_rule_count() == 3);
    assert(omi_find_diagnostic_rule(OMI_DIAGNOSTIC_NULL_CONS));
    assert(omi_find_diagnostic_rule(OMI_DIAGNOSTIC_NULL_EDGE));
    assert(omi_find_diagnostic_rule(OMI_DIAGNOSTIC_TRANSIENT_PRESSURE));

    omi_diagnostic_report_t report;
    omi_evaluate_diagnostics(&state, &report);
    assert(report.violations == 0);
    assert(report.warnings == 1);
    assert(omi_diagnostic_report_valid(&report));
    return 0;
}
