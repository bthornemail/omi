#include "../include/bom.h"
#include "../include/graph.h"

omi_status_t omi_vm_tick(omi_memory_view_t memory, omi_bom_clock_t *clock)
{
    if (!clock) {
        return OMI_ERR_INVALID_STATE;
    }

    omi_invert_byte_order(memory);
    omi_bom_advance(clock);
    return OMI_OK;
}
