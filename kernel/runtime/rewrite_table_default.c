#include "../include/rules.h"

const omi_rewrite_rule_t omi_rewrite_rules[] = {
    {
        .id = OMI_REWRITE_SPLIT_REGION,
        .name = "split_region",
        .min_region_len = 2,
    },
};

const uint32_t omi_rewrite_rules_count =
    (uint32_t)(sizeof(omi_rewrite_rules) / sizeof(omi_rewrite_rules[0]));

const omi_diagnostic_rule_t omi_diagnostic_rules[] = {
    {
        .id = OMI_DIAGNOSTIC_NULL_CONS,
        .severity = OMI_DIAGNOSTIC_VIOLATION,
        .name = "null_cons",
    },
    {
        .id = OMI_DIAGNOSTIC_NULL_EDGE,
        .severity = OMI_DIAGNOSTIC_VIOLATION,
        .name = "null_edge",
    },
    {
        .id = OMI_DIAGNOSTIC_TRANSIENT_PRESSURE,
        .severity = OMI_DIAGNOSTIC_WARNING,
        .name = "transient_pressure",
    },
};

const uint32_t omi_diagnostic_rules_count =
    (uint32_t)(sizeof(omi_diagnostic_rules) / sizeof(omi_diagnostic_rules[0]));
