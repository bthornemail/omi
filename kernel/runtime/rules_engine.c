#include "../include/rules.h"

#include "../include/bom.h"
#include "../include/cons.h"

extern const omi_rewrite_rule_t omi_rewrite_rules[];
extern const uint32_t omi_rewrite_rules_count;

static void record_cons_edge(omi_rules_state_t *state, uint32_t a, uint32_t b)
{
    if (state->cons_edge_count >= OMI_MAX_CONS_EDGES) {
        return;
    }

    state->cons_edges[state->cons_edge_count++] = (omi_edge_t){.a = a, .b = b};
}

void omi_rules_evaluate(omi_memory_view_t memory,
                        uint32_t start_addr,
                        uint32_t max_steps,
                        omi_rules_state_t *out,
                        uint32_t (*bom)(uint32_t))
{
    if (!out) {
        return;
    }

    *out = (omi_rules_state_t){
        .start_addr = start_addr,
        .last_addr = start_addr,
        .steps = 0,
        .orbit_closed = 0,
        .orbit_id = 0,
        .cons_edge_count = 0,
        .region_count = 0,
    };

    if (!memory.bytes || memory.len == 0 || !bom || max_steps == 0) {
        return;
    }

    uint32_t addr = start_addr;
    uint32_t size = (uint32_t)memory.len;

    for (uint32_t i = 0; i < max_steps; i++) {
        uint32_t next = bom(addr);
        uint32_t a_index = addr % size;
        uint32_t b_index = next % size;
        uint8_t a = memory.bytes[a_index];
        uint8_t b = memory.bytes[b_index];

        switch (omi_resolve_adjacency(a, b)) {
        case OMI_CONS_NULL_COLLAPSE:
            out->summary.nulls++;
            break;
        case OMI_CONS_BINDING:
            out->summary.bindings++;
            record_cons_edge(out, a_index, b_index);
            break;
        case OMI_CONS_TRANSIENT:
            out->summary.transients++;
            break;
        }

        out->steps++;
        out->last_addr = next;
        addr = next;

        if (addr == start_addr) {
            out->orbit_closed = 1;
            break;
        }
    }

    out->orbit_id = omi_bom_orbit_hash(start_addr, out->steps);
    out->region_count = omi_extract_cons_regions(memory, out->regions, OMI_MAX_CONS_REGIONS);
}

int omi_rules_summary_equal(const omi_rules_summary_t *a, const omi_rules_summary_t *b)
{
    return a && b &&
           a->bindings == b->bindings &&
           a->nulls == b->nulls &&
           a->transients == b->transients;
}

uint32_t omi_extract_cons_regions(omi_memory_view_t memory,
                                  omi_cons_region_t *out,
                                  uint32_t max_regions)
{
    if (!memory.bytes || memory.len < 2 || !out || max_regions == 0) {
        return 0;
    }

    uint32_t count = 0;
    uint32_t i = 0;
    uint32_t len = (uint32_t)memory.len;

    while (i < len) {
        uint8_t value = memory.bytes[i];
        uint32_t start = i;

        if (value == 0x00) {
            i++;
            continue;
        }

        while (i < len && memory.bytes[i] == value) {
            i++;
        }

        if (i - start >= 2u) {
            out[count++] = (omi_cons_region_t){
                .start = start,
                .length = i - start,
                .value = value,
            };
            if (count == max_regions) {
                return count;
            }
        }
    }

    return count;
}

void omi_symbols_from_regions(const omi_cons_region_t *regions,
                              uint32_t region_count,
                              uint32_t orbit_id,
                              omi_symbol_table_t *symbols)
{
    if (!symbols) {
        return;
    }

    symbols->count = 0;
    if (!regions) {
        return;
    }

    uint32_t limit = region_count < OMI_MAX_SYMBOLS ? region_count : OMI_MAX_SYMBOLS;
    for (uint32_t i = 0; i < limit; i++) {
        symbols->entries[i] = (omi_symbol_entry_t){
            .region_start = regions[i].start,
            .region_len = regions[i].length,
            .orbit_id = orbit_id,
            .value = regions[i].value,
        };
        symbols->count++;
    }
}

int omi_apply_split_rewrite(omi_memory_view_t memory, const omi_symbol_table_t *symbols)
{
    uint32_t ignored = 0;
    return omi_apply_rewrite_rule(memory, symbols, omi_find_rewrite_rule(OMI_REWRITE_SPLIT_REGION), &ignored);
}

const omi_rewrite_rule_t *omi_find_rewrite_rule(omi_rewrite_id_t id)
{
    for (uint32_t i = 0; i < omi_rewrite_rules_count; i++) {
        if (omi_rewrite_rules[i].id == id) {
            return &omi_rewrite_rules[i];
        }
    }

    return 0;
}

const omi_rewrite_rule_t *omi_first_rewrite_rule(void)
{
    return omi_rewrite_rules_count > 0 ? &omi_rewrite_rules[0] : 0;
}

uint32_t omi_rewrite_rule_count(void)
{
    return omi_rewrite_rules_count;
}

int omi_apply_rewrite_rule(omi_memory_view_t memory,
                           const omi_symbol_table_t *symbols,
                           const omi_rewrite_rule_t *rule,
                           uint32_t *symbol_index)
{
    if (!memory.bytes || !symbols || symbols->count == 0 || !rule) {
        return 0;
    }

    if (rule->id != OMI_REWRITE_SPLIT_REGION) {
        return 0;
    }

    for (uint32_t i = 0; i < symbols->count; i++) {
        const omi_symbol_entry_t *symbol = &symbols->entries[i];
        if (symbol->region_len < rule->min_region_len) {
            continue;
        }

        uint32_t split_at = symbol->region_start + (symbol->region_len / 2u);
        if (split_at >= memory.len) {
            continue;
        }

        uint8_t value = memory.bytes[split_at];
        memory.bytes[split_at] = value == 0xffu ? 0x01u : (uint8_t)(value + 1u);
        if (symbol_index) {
            *symbol_index = i;
        }
        return 1;
    }

    return 0;
}
