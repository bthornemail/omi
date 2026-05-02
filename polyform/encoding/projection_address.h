#ifndef OMI_PROJECTION_ADDRESS_H
#define OMI_PROJECTION_ADDRESS_H

#include "aegean.h"
#include "braille.h"
#include <stdint.h>

typedef struct {
    omi_aegean_projection_t aegean;
    omi_braille_projection_t braille;
    uint32_t observer_address;
    uint32_t witness;
} omi_projection_address_t;

omi_projection_address_t omi_projection_address_compose(omi_aegean_projection_t aegean,
                                                        omi_braille_projection_t braille);

#endif
