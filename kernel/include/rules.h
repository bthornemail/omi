#ifndef OMI_RULES_H
#define OMI_RULES_H

#include <stddef.h>
#include <stdint.h>

#include "graph.h"

#define OMI_MAX_CONS_EDGES 64u
#define OMI_MAX_CONS_REGIONS 64u
#define OMI_MAX_SYMBOLS 64u

typedef struct omi_edge {
    uint32_t a;
    uint32_t b;
} omi_edge_t;

typedef struct omi_cons_region {
    uint32_t start;
    uint32_t length;
    uint8_t value;
} omi_cons_region_t;

typedef struct omi_symbol_entry {
    uint32_t region_start;
    uint32_t region_len;
    uint32_t orbit_id;
    uint8_t value;
} omi_symbol_entry_t;

typedef struct omi_symbol_table {
    omi_symbol_entry_t entries[OMI_MAX_SYMBOLS];
    uint32_t count;
} omi_symbol_table_t;

typedef struct omi_rules_summary {
    uint32_t bindings;
    uint32_t nulls;
    uint32_t transients;
} omi_rules_summary_t;

typedef struct omi_rules_state {
    omi_rules_summary_t summary;
    uint32_t start_addr;
    uint32_t last_addr;
    uint32_t steps;
    uint32_t orbit_closed;
    uint32_t orbit_id;
    omi_edge_t cons_edges[OMI_MAX_CONS_EDGES];
    uint32_t cons_edge_count;
    omi_cons_region_t regions[OMI_MAX_CONS_REGIONS];
    uint32_t region_count;
} omi_rules_state_t;

void omi_rules_evaluate(omi_memory_view_t memory,
                        uint32_t start_addr,
                        uint32_t max_steps,
                        omi_rules_state_t *out,
                        uint32_t (*bom)(uint32_t));

int omi_rules_summary_equal(const omi_rules_summary_t *a, const omi_rules_summary_t *b);
uint32_t omi_extract_cons_regions(omi_memory_view_t memory,
                                  omi_cons_region_t *out,
                                  uint32_t max_regions);
void omi_symbols_from_regions(const omi_cons_region_t *regions,
                              uint32_t region_count,
                              uint32_t orbit_id,
                              omi_symbol_table_t *symbols);
int omi_apply_split_rewrite(omi_memory_view_t memory, const omi_symbol_table_t *symbols);

#endif
