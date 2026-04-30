#include "../kernel/include/graph.h"
#include <assert.h>

int main(void)
{
    assert(omi_classify_byte(0x00) == OMI_NODE_NULL);
    assert(omi_classify_byte(0x01) == OMI_NODE_CANDIDATE);
    assert(omi_classify_byte(0x80) == OMI_NODE_CONTROL);
    assert(omi_classify_byte(0xc0) == OMI_NODE_HYBRID);

    uint8_t bytes[] = {0x11, 0x11, 0x00, 0x33, 0x44, 0x45};
    omi_cons_summary_t summary =
        omi_compute_cons_summary((omi_memory_view_t){.bytes = bytes, .len = sizeof(bytes)});
    assert(summary.bindings == 1);
    assert(summary.null_collapses == 1);
    assert(summary.transients == 1);
    return 0;
}
