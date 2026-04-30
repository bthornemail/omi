#include <stdint.h>

uint8_t omi_polyform_byte_to_braille_cell(uint8_t byte)
{
    return byte & 0x3f;
}
