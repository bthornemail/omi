#include "../include/polyform_block.h"
#include "polyform_witness.h"

static uint32_t hash_u8(uint32_t hash, uint8_t value)
{
    return polyform_fnv1a_update(hash, &value, sizeof(value));
}

static uint32_t hash_u32(uint32_t hash, uint32_t value)
{
    uint8_t bytes[4] = {
        (uint8_t)(value & 0xffu),
        (uint8_t)((value >> 8u) & 0xffu),
        (uint8_t)((value >> 16u) & 0xffu),
        (uint8_t)((value >> 24u) & 0xffu)
    };
    return polyform_fnv1a_update(hash, bytes, sizeof(bytes));
}

static uint32_t hash_u64(uint32_t hash, uint64_t value)
{
    for (uint32_t shift = 0; shift < 64u; shift += 8u) {
        hash = hash_u8(hash, (uint8_t)((value >> shift) & 0xffu));
    }
    return hash;
}

static uint32_t hash_i8(uint32_t hash, int8_t value)
{
    return hash_u8(hash, (uint8_t)value);
}

uint32_t polyform_witness(const polyform_block_t *block)
{
    if (block == 0) {
        return 0u;
    }

    const polyform_block_fields_t *f = &block->fields;
    uint32_t hash = polyform_fnv1a_seed();

    hash = hash_u8(hash, f->K);
    hash = hash_u8(hash, f->fano);
    hash = hash_u32(hash, f->sonar.lo);
    hash = hash_u32(hash, f->sonar.hi);
    hash = hash_u64(hash, f->tick);
    hash = hash_u8(hash, f->digit);

    for (uint32_t i = 0; i < OMI_POLYFORM_OSI_LAYER_COUNT; i++) {
        hash = hash_u32(hash, f->osi_address[i]);
        hash = hash_u8(hash, f->osi_simplex[i]);
    }

    hash = hash_u32(hash, f->aegean.codepoint);
    hash = hash_u32(hash, (uint32_t)f->aegean.category);
    hash = hash_i8(hash, f->aegean.projection_row);
    hash = hash_i8(hash, f->aegean.triad_index);
    hash = hash_i8(hash, f->aegean.selector_index);

    hash = hash_u32(hash, f->braille.codepoint);
    hash = hash_u8(hash, f->braille.dot_mask);
    hash = hash_u8(hash, f->braille.dot_count);
    hash = hash_u8(hash, f->braille.resolution_row);
    hash = hash_u32(hash, (uint32_t)f->braille.cell_class);

    hash = hash_u32(hash, f->geometry.id);
    hash = hash_u8(hash, f->geometry.count);
    hash = hash_u32(hash, f->geometry.witness);

    for (uint8_t p = 0; p < f->geometry.count && p < OMI_GEOMETRY_MAX_POLYGONS; p++) {
        const omi_geometry_polygon_t *polygon = &f->geometry.polygons[p];
        hash = hash_u32(hash, polygon->id);
        hash = hash_u8(hash, polygon->count);
        hash = hash_u8(hash, polygon->closed);
        hash = hash_u32(hash, polygon->witness);
    }

    return hash;
}
