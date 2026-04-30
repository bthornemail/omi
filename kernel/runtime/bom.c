#include "../include/bom.h"

static uint32_t rotl32(uint32_t value, unsigned shift)
{
    return (value << shift) | (value >> (32u - shift));
}

static uint32_t rotr32(uint32_t value, unsigned shift)
{
    return (value >> shift) | (value << (32u - shift));
}

uint32_t omi_bom_permute(uint32_t addr)
{
    uint32_t x = __builtin_bswap32(addr);
    x ^= 0xa5a5a5a5u;
    return rotl32(x, 7u) ^ rotr32(x, 3u);
}

uint32_t omi_bom_orbit_hash(uint32_t start_addr, uint32_t steps)
{
    uint32_t addr = start_addr;
    uint32_t hash = 2166136261u;

    for (uint32_t i = 0; i < steps; i++) {
        hash ^= addr;
        hash *= 16777619u;
        addr = omi_bom_permute(addr);
    }

    return hash;
}
