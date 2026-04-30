#include <stdint.h>

uint8_t omi_encode_braille(uint8_t byte)
{
    return byte & 0x3f;
}
