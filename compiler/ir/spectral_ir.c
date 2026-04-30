#include <stdint.h>

uint32_t omi_spectral_basis_id(uint8_t node_class, uint8_t degree)
{
    return ((uint32_t)node_class << 8) | degree;
}
