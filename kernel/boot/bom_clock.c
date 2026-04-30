#include "../include/bom.h"

void omi_bom_init(omi_bom_clock_t *clock)
{
    if (clock) {
        clock->tick = 0;
    }
}

omi_tick_t omi_bom_advance(omi_bom_clock_t *clock)
{
    if (!clock) {
        return 0;
    }

    clock->tick += 1;
    return clock->tick;
}
