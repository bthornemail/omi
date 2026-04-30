#include "../kernel/include/cons.h"
#include <assert.h>

int main(void)
{
    assert(omi_resolve_adjacency(0x00, 0x01) == OMI_CONS_NULL_COLLAPSE);
    assert(omi_resolve_adjacency(0x22, 0x22) == OMI_CONS_BINDING);
    assert(omi_resolve_adjacency(0x22, 0x23) == OMI_CONS_TRANSIENT);
    return 0;
}
