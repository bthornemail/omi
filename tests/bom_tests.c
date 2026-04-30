#include "../kernel/include/bom.h"
#include "../kernel/include/graph.h"
#include <assert.h>

int main(void)
{
    uint8_t bytes[] = {1, 2, 3, 4};
    omi_memory_view_t memory = {.bytes = bytes, .len = sizeof(bytes)};
    omi_invert_byte_order(memory);
    assert(bytes[0] == 4);
    assert(bytes[1] == 3);
    assert(bytes[2] == 2);
    assert(bytes[3] == 1);

    assert(omi_bom_permute(0x00000001u) == 0xe6466666u);
    assert(omi_bom_permute(0x00000001u) == omi_bom_permute(0x00000001u));
    assert(omi_bom_orbit_hash(0x00000001u, 4u) == omi_bom_orbit_hash(0x00000001u, 4u));
    assert(omi_bom_orbit_hash(0x00000001u, 4u) != omi_bom_orbit_hash(0x00000002u, 4u));
    return 0;
}
