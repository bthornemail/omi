#ifndef OMI_BOM_H
#define OMI_BOM_H

#include "omi.h"

typedef struct omi_bom_clock {
    omi_tick_t tick;
} omi_bom_clock_t;

void omi_bom_init(omi_bom_clock_t *clock);
omi_tick_t omi_bom_advance(omi_bom_clock_t *clock);
uint32_t omi_bom_permute(uint32_t addr);
uint32_t omi_bom_orbit_hash(uint32_t start_addr, uint32_t steps);

#endif
