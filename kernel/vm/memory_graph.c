#include "../include/graph.h"
#include "../include/cons.h"

omi_node_class_t omi_classify_byte(uint8_t byte)
{
    if (byte == 0x00) {
        return OMI_NODE_NULL;
    }
    if (byte <= 0x7f) {
        return OMI_NODE_CANDIDATE;
    }
    if (byte <= 0xbf) {
        return OMI_NODE_CONTROL;
    }
    return OMI_NODE_HYBRID;
}

void omi_invert_byte_order(omi_memory_view_t memory)
{
    if (!memory.bytes || memory.len < 2) {
        return;
    }

    for (size_t i = 0, j = memory.len - 1; i < j; i++, j--) {
        uint8_t tmp = memory.bytes[i];
        memory.bytes[i] = memory.bytes[j];
        memory.bytes[j] = tmp;
    }
}

omi_cons_summary_t omi_compute_cons_summary(omi_memory_view_t memory)
{
    omi_cons_summary_t summary = {
        .null_collapses = 0,
        .bindings = 0,
        .transients = 0,
    };

    if (!memory.bytes || memory.len < 2) {
        return summary;
    }

    for (size_t i = 0; i + 1 < memory.len; i += 2) {
        switch (omi_resolve_adjacency(memory.bytes[i], memory.bytes[i + 1])) {
        case OMI_CONS_NULL_COLLAPSE:
            summary.null_collapses++;
            break;
        case OMI_CONS_BINDING:
            summary.bindings++;
            break;
        case OMI_CONS_TRANSIENT:
            summary.transients++;
            break;
        }
    }

    return summary;
}
