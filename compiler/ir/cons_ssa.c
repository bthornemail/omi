#include <stdint.h>

uint32_t omi_cons_ssa_value(uint16_t cons_id, uint16_t version)
{
    return ((uint32_t)cons_id << 16) | version;
}
