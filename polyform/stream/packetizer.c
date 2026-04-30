#include <stddef.h>

size_t omi_packet_count(size_t byte_len, size_t packet_size)
{
    if (packet_size == 0) {
        return 0;
    }
    return (byte_len + packet_size - 1) / packet_size;
}
