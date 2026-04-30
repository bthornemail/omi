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
    return 0;
}
