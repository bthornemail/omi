#include "../include/bom.h"

omi_tick_t omi_interrupt_bom_tick(omi_bom_clock_t *clock)
{
    return omi_bom_advance(clock);
}
