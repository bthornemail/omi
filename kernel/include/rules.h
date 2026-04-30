#ifndef OMI_RULES_H
#define OMI_RULES_H

#include <stddef.h>
#include <stdint.h>

#include "graph.h"

#define OMI_MAX_CONS_EDGES 64u
#define OMI_MAX_CONS_REGIONS 64u
#define OMI_MAX_SYMBOLS 64u
#define OMI_MAX_DIAGNOSTIC_RESULTS 64u

typedef enum omi_rewrite_id {
    OMI_REWRITE_NONE = 0,
    OMI_REWRITE_SPLIT_REGION = 1
} omi_rewrite_id_t;

typedef struct omi_rewrite_rule {
    omi_rewrite_id_t id;
    const char *name;
    uint16_t min_region_len;
} omi_rewrite_rule_t;

typedef enum omi_diagnostic_severity {
    OMI_DIAGNOSTIC_VIOLATION = 1,
    OMI_DIAGNOSTIC_WARNING = 2
} omi_diagnostic_severity_t;

typedef enum omi_diagnostic_id {
    OMI_DIAGNOSTIC_NULL_CONS = 1,
    OMI_DIAGNOSTIC_NULL_EDGE = 2,
    OMI_DIAGNOSTIC_TRANSIENT_PRESSURE = 3
} omi_diagnostic_id_t;

typedef struct omi_diagnostic_rule {
    omi_diagnostic_id_t id;
    omi_diagnostic_severity_t severity;
    const char *name;
} omi_diagnostic_rule_t;

typedef struct omi_diagnostic_result {
    const omi_diagnostic_rule_t *rule;
    uint32_t subject;
} omi_diagnostic_result_t;

typedef struct omi_diagnostic_report {
    omi_diagnostic_result_t results[OMI_MAX_DIAGNOSTIC_RESULTS];
    uint32_t count;
    uint32_t violations;
    uint32_t warnings;
} omi_diagnostic_report_t;

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
    uint32_t content_hash;
    uint32_t symbol_id;
    uint8_t value;
    uint8_t reused;
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
                              omi_memory_view_t memory,
                              uint32_t orbit_id,
                              omi_symbol_table_t *symbols);
uint32_t omi_symbol_content_hash(omi_memory_view_t memory, uint32_t start, uint32_t len);
uint32_t omi_symbol_id(uint32_t content_hash, uint32_t orbit_id);
int omi_apply_split_rewrite(omi_memory_view_t memory, const omi_symbol_table_t *symbols);
const omi_rewrite_rule_t *omi_find_rewrite_rule(omi_rewrite_id_t id);
const omi_rewrite_rule_t *omi_first_rewrite_rule(void);
uint32_t omi_rewrite_rule_count(void);
int omi_apply_rewrite_rule(omi_memory_view_t memory,
                           const omi_symbol_table_t *symbols,
                           const omi_rewrite_rule_t *rule,
                           uint32_t *symbol_index);
const omi_diagnostic_rule_t *omi_find_diagnostic_rule(omi_diagnostic_id_t id);
uint32_t omi_diagnostic_rule_count(void);
void omi_evaluate_diagnostics(const omi_rules_state_t *state, omi_diagnostic_report_t *report);
int omi_diagnostic_report_valid(const omi_diagnostic_report_t *report);

#endif
