#include "../include/cons.h"

omi_cons_resolution_t omi_resolve_adjacency(uint8_t left, uint8_t right)
{
    if (left == 0x00 || right == 0x00) {
        return OMI_CONS_NULL_COLLAPSE;
    }

    if (left == right) {
        return OMI_CONS_BINDING;
    }

    return OMI_CONS_TRANSIENT;
}
