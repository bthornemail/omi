#include "bitwise_kernel.h"

static inline uint8_t rotl8(uint8_t x, unsigned k)
{
    k &= 7u;
    if (k == 0u) {
        return x;
    }
    return (uint8_t)((x << k) | (x >> (8u - k)));
}

static inline uint8_t rotr8(uint8_t x, unsigned k)
{
    k &= 7u;
    if (k == 0u) {
        return x;
    }
    return (uint8_t)((x >> k) | (x << (8u - k)));
}

uint8_t delta8(uint8_t k, uint8_t gs)
{
    return (uint8_t)(rotl8(k, 1u) ^
                     rotl8(k, 3u) ^
                     rotr8(k, 2u) ^
                     gs);
}

uint8_t fano_tick(uint8_t fano)
{
    return (uint8_t)(((uint8_t)(fano << 1u) | (uint8_t)(fano >> 6u)) & 0x7Fu);
}

sonar60_t sonar_tick(sonar60_t s)
{
    uint32_t lo = s.lo & 0x3FFFFFFFu;
    uint32_t hi = s.hi & 0x3FFFFFFFu;
    uint32_t wrap = (hi >> 29u) & 1u;

    sonar60_t out = {
        .lo = ((lo << 1u) & 0x3FFFFFFFu) | wrap,
        .hi = ((hi << 1u) & 0x3FFFFFFFu) | ((lo >> 29u) & 1u)
    };
    return out;
}

void kernel_tick(kernel_state_t *ks)
{
    if (ks == 0) {
        return;
    }

    ks->K = delta8(ks->K, ks->GS);
    ks->fano = fano_tick(ks->fano);
    ks->sonar = sonar_tick(ks->sonar);
}
