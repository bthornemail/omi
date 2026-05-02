#ifndef OMI_OSI_PROJECTION_H
#define OMI_OSI_PROJECTION_H

#include <stdint.h>
#include "bitwise_kernel.h"

typedef enum {
    OMI_OSI_PHYSICAL = 1,
    OMI_OSI_DATALINK = 2,
    OMI_OSI_NETWORK = 3,
    OMI_OSI_TRANSPORT = 4,
    OMI_OSI_SESSION = 5,
    OMI_OSI_PRESENTATION = 6,
    OMI_OSI_APPLICATION = 7
} omi_osi_layer_t;

typedef struct {
    uint64_t tick;
    uint8_t kernel_state;
    uint8_t fano_state;
    sonar60_t sonar_state;
} omi_osi_source_t;

typedef struct {
    omi_osi_layer_t layer;
    uint8_t visible_digit;
    uint32_t address;
    uint8_t simplex_class;
} omi_osi_projection_t;

omi_osi_source_t omi_osi_source_from_kernel(const kernel_state_t *state, uint64_t tick);
omi_osi_projection_t omi_project_osi_layer(const kernel_state_t *state,
                                          uint64_t tick,
                                          omi_osi_layer_t layer);

#endif
