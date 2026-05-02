#include "projection_address.h"

static uint32_t projection_mix_u32(uint32_t hash, uint32_t value)
{
    hash ^= value;
    hash *= 16777619u;
    return hash;
}

omi_projection_address_t omi_projection_address_compose(omi_aegean_projection_t aegean,
                                                        omi_braille_projection_t braille)
{
    uint32_t address = 2166136261u;
    uint32_t witness = 2166136261u;

    address = projection_mix_u32(address, aegean.codepoint);
    address = projection_mix_u32(address, (uint32_t)aegean.category);
    address = projection_mix_u32(address, (uint32_t)(uint8_t)aegean.projection_row);
    address = projection_mix_u32(address, (uint32_t)(uint8_t)aegean.triad_index);
    address = projection_mix_u32(address, (uint32_t)(uint8_t)aegean.selector_index);
    address = projection_mix_u32(address, braille.codepoint);
    address = projection_mix_u32(address, braille.dot_mask);
    address = projection_mix_u32(address, braille.dot_count);
    address = projection_mix_u32(address, braille.resolution_row);
    address = projection_mix_u32(address, (uint32_t)braille.cell_class);

    witness = projection_mix_u32(witness, aegean.codepoint);
    witness = projection_mix_u32(witness, braille.codepoint);
    witness = projection_mix_u32(witness, address);

    omi_projection_address_t composed = {
        .aegean = aegean,
        .braille = braille,
        .observer_address = address,
        .witness = witness
    };

    return composed;
}
