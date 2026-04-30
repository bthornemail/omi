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
