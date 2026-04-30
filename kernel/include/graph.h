#ifndef OMI_GRAPH_H
#define OMI_GRAPH_H

#include <stddef.h>
#include <stdint.h>

typedef enum omi_node_class {
    OMI_NODE_NULL = 0,
    OMI_NODE_CANDIDATE = 1,
    OMI_NODE_CONTROL = 2,
    OMI_NODE_HYBRID = 3
} omi_node_class_t;

typedef struct omi_memory_view {
    uint8_t *bytes;
    size_t len;
} omi_memory_view_t;

typedef struct omi_cons_summary {
    size_t null_collapses;
    size_t bindings;
    size_t transients;
} omi_cons_summary_t;

omi_node_class_t omi_classify_byte(uint8_t byte);
void omi_invert_byte_order(omi_memory_view_t memory);
omi_cons_summary_t omi_compute_cons_summary(omi_memory_view_t memory);

#endif
