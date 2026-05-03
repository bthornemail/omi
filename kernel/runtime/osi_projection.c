#include "osi_projection.h"

static uint32_t osi_mix_u32(uint32_t hash, uint32_t value)
{
    hash ^= value;
    hash *= 16777619u;
    return hash;
}

static uint32_t osi_mix_u64(uint32_t hash, uint64_t value)
{
    uint32_t lo = (uint32_t)value;
    uint32_t hi = (uint32_t)(value >> 32u);
    hash = osi_mix_u32(hash, lo);
    hash = osi_mix_u32(hash, hi);
    return hash;
}

static uint8_t osi_popcount8(uint8_t value)
{
    uint8_t count = 0;
    while (value != 0u) {
        count = (uint8_t)(count + (value & 1u));
        value >>= 1u;
    }
    return count;
}

static uint8_t osi_popcount30(uint32_t value)
{
    uint8_t count = 0;
    value &= 0x3FFFFFFFu;
    while (value != 0u) {
        count = (uint8_t)(count + (value & 1u));
        value >>= 1u;
    }
    return count;
}

static uint32_t osi_layer_salt(omi_osi_layer_t layer)
{
    switch (layer) {
        case OMI_OSI_PHYSICAL:
            return 0x50485953u; /* PHYS */
        case OMI_OSI_DATALINK:
            return 0x444C494Eu; /* DLIN */
        case OMI_OSI_NETWORK:
            return 0x4E455457u; /* NETW */
        case OMI_OSI_TRANSPORT:
            return 0x5452414Eu; /* TRAN */
        case OMI_OSI_SESSION:
            return 0x53455353u; /* SESS */
        case OMI_OSI_PRESENTATION:
            return 0x50524553u; /* PRES */
        case OMI_OSI_APPLICATION:
            return 0x4150504Cu; /* APPL */
        default:
            return 0x3F3F3F3Fu;
    }
}

omi_osi_source_t omi_osi_source_from_kernel(const kernel_state_t *state, uint64_t tick)
{
    omi_osi_source_t source = {
        .tick = tick,
        .kernel_state = 0,
        .fano_state = 0,
        .sonar_state = { .lo = 0, .hi = 0 }
    };

    if (state != 0) {
        source.kernel_state = state->K;
        source.fano_state = state->fano;
        source.sonar_state = state->sonar;
    }

    return source;
}

omi_osi_projection_t omi_project_osi_layer(const kernel_state_t *state,
                                          uint64_t tick,
                                          omi_osi_layer_t layer)
{
    omi_osi_source_t source = omi_osi_source_from_kernel(state, tick);
    uint32_t hash = 2166136261u;
    uint32_t salt = osi_layer_salt(layer);

    hash = osi_mix_u32(hash, salt);
    hash = osi_mix_u64(hash, source.tick);
    hash = osi_mix_u32(hash, source.kernel_state);
    hash = osi_mix_u32(hash, source.fano_state);
    hash = osi_mix_u32(hash, source.sonar_state.lo & 0x3FFFFFFFu);
    hash = osi_mix_u32(hash, source.sonar_state.hi & 0x3FFFFFFFu);

    switch (layer) {
        case OMI_OSI_PHYSICAL:
            hash = osi_mix_u32(hash, delta8(source.kernel_state, OMI_BITWISE_KERNEL_GS));
            break;
        case OMI_OSI_DATALINK:
            hash = osi_mix_u32(hash, 0x1C1D1E1Fu);
            break;
        case OMI_OSI_NETWORK:
            hash = osi_mix_u32(hash, (uint32_t)source.tick ^ (uint32_t)(source.tick >> 32u));
            break;
        case OMI_OSI_TRANSPORT:
            hash = osi_mix_u32(hash, (uint32_t)((source.tick >> 3u) & 0xFFFFFFFFu));
            break;
        case OMI_OSI_SESSION:
            hash = osi_mix_u32(hash, 0x1Bu);
            break;
        case OMI_OSI_PRESENTATION:
            hash = osi_mix_u32(hash, 0x303F303Fu);
            break;
        case OMI_OSI_APPLICATION:
            hash = osi_mix_u32(hash, 0x407F407Fu);
            break;
        default:
            hash = osi_mix_u32(hash, 0u);
            break;
    }

    uint8_t occupancy = (uint8_t)(osi_popcount8(source.kernel_state) +
                                  osi_popcount8(source.fano_state) +
                                  osi_popcount30(source.sonar_state.lo) +
                                  osi_popcount30(source.sonar_state.hi) +
                                  (uint8_t)layer +
                                  (uint8_t)(source.tick & 0x07u));

    omi_osi_projection_t projection = {
        .layer = layer,
        .visible_digit = (uint8_t)(0x30u + (hash & 0x0Fu)),
        .address = hash,
        .simplex_class = (uint8_t)(occupancy % 9u)
    };

    return projection;
}
