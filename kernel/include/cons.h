#ifndef OMI_CONS_H
#define OMI_CONS_H

#include "graph.h"

typedef enum omi_cons_resolution {
    OMI_CONS_NULL_COLLAPSE = 0,
    OMI_CONS_BINDING = 1,
    OMI_CONS_TRANSIENT = 2
} omi_cons_resolution_t;

omi_cons_resolution_t omi_resolve_adjacency(uint8_t left, uint8_t right);

#endif
