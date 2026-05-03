#ifndef OMI_POLYFORM_WITNESS_H
#define OMI_POLYFORM_WITNESS_H

#include <stddef.h>
#include <stdint.h>

static inline uint32_t polyform_fnv1a_update(uint32_t hash, const uint8_t *data, size_t len)
{
    for (size_t i = 0; i < len; i++) {
        hash ^= data[i];
        hash *= 16777619u;
    }
    return hash;
}

static inline uint32_t polyform_fnv1a_seed(void)
{
    return 2166136261u;
}

#endif
