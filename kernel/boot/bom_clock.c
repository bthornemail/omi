#include "../include/bom.h"

void omi_bom_init(omi_bom_clock_t *clock)
{
    if (clock) {
        clock->tick = 0;
        lc_init(&clock->semantic_clock);
    }
}

omi_tick_t omi_bom_advance(omi_bom_clock_t *clock)
{
    if (!clock) {
        return 0;
    }

    clock->tick += 1;
    lc_step(&clock->semantic_clock, 1u);
    return clock->tick;
}
