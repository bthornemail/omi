#include "../include/polyform_encode.h"
#include "../src/polyform_witness.h"
#include <string.h>

/* ── Internal helpers ────────────────────────── */

static void write_u8(uint8_t **p, uint8_t v) { *(*p)++ = v; }
static void write_u32_le(uint8_t **p, uint32_t v)
{
    *(*p)++ = (uint8_t)(v & 0xffu);
    *(*p)++ = (uint8_t)((v >> 8u) & 0xffu);
    *(*p)++ = (uint8_t)((v >> 16u) & 0xffu);
    *(*p)++ = (uint8_t)((v >> 24u) & 0xffu);
}
static void write_u64_le(uint8_t **p, uint64_t v)
{
    for (int i = 0; i < 8; i++) {
        *(*p)++ = (uint8_t)(v & 0xffu);
        v >>= 8u;
    }
}
static void write_i8(uint8_t **p, int8_t v) { *(*p)++ = (uint8_t)v; }

static uint8_t read_u8(const uint8_t **p) { return *(*p)++; }
static uint32_t read_u32_le(const uint8_t **p)
{
    uint32_t v = (uint32_t)read_u8(p);
    v |= (uint32_t)read_u8(p) << 8u;
    v |= (uint32_t)read_u8(p) << 16u;
    v |= (uint32_t)read_u8(p) << 24u;
    return v;
}
static int8_t read_i8(const uint8_t **p) { return (int8_t)read_u8(p); }

/* ── Serialize ───────────────────────────────── */

int polyform_serialize_fields(const polyform_block_t *block, uint8_t *buf, size_t cap)
{
    if (!block || !buf) return -1;
    const polyform_block_fields_t *f = &block->fields;
    uint8_t *p = buf;
    size_t needed = 1 + 1 + 4 + 4 + 8 + 1 +             /* K, fano, sonar, tick, digit */
                    28 + 7 +                               /* osi_address, osi_simplex */
                    4 + 4 + 1 + 1 + 1 +                   /* aegean */
                    4 + 1 + 1 + 1 + 4 +                   /* braille */
                    4 + 1 + 4;                            /* geometry surface */
    uint8_t poly_count = f->geometry.count;
    if (poly_count > 8) poly_count = 8;
    needed += (uint32_t)poly_count * (4 + 1 + 1 + 4);     /* polygons */
    needed += 4;                                           /* block witness */

    if (cap < needed) return -1;

    write_u8(&p, f->K);
    write_u8(&p, f->fano);
    write_u32_le(&p, f->sonar.lo);
    write_u32_le(&p, f->sonar.hi);
    write_u64_le(&p, f->tick);
    write_u8(&p, f->digit);

    for (uint32_t i = 0; i < 7; i++) {
        write_u32_le(&p, f->osi_address[i]);
    }
    for (uint32_t i = 0; i < 7; i++) {
        write_u8(&p, f->osi_simplex[i]);
    }

    write_u32_le(&p, f->aegean.codepoint);
    write_u32_le(&p, (uint32_t)f->aegean.category);
    write_i8(&p, f->aegean.projection_row);
    write_i8(&p, f->aegean.triad_index);
    write_i8(&p, f->aegean.selector_index);

    write_u32_le(&p, f->braille.codepoint);
    write_u8(&p, f->braille.dot_mask);
    write_u8(&p, f->braille.dot_count);
    write_u8(&p, f->braille.resolution_row);
    write_u32_le(&p, (uint32_t)f->braille.cell_class);

    write_u32_le(&p, f->geometry.id);
    write_u8(&p, f->geometry.count);
    write_u32_le(&p, f->geometry.witness);

    for (uint8_t pi = 0; pi < poly_count; pi++) {
        write_u32_le(&p, f->geometry.polygons[pi].id);
        write_u8(&p, f->geometry.polygons[pi].count);
        write_u8(&p, f->geometry.polygons[pi].closed);
        write_u32_le(&p, f->geometry.polygons[pi].witness);
    }

    write_u32_le(&p, block->witness);

    return (int)(p - buf);
}

/* ── Deserialize ─────────────────────────────── */

int polyform_deserialize_fields(const uint8_t *buf, size_t len,
                                polyform_block_t *block)
{
    if (!buf || !block || len < 14) return -1;
    const uint8_t *p = buf;
    polyform_block_fields_t *f = &block->fields;
    memset(f, 0, sizeof(*f));

    f->K         = read_u8(&p);
    f->fano      = read_u8(&p);
    f->sonar.lo  = read_u32_le(&p);
    f->sonar.hi  = read_u32_le(&p);
    f->tick      = 0;
    for (int i = 0; i < 8; i++) {
        f->tick |= ((uint64_t)read_u8(&p)) << (uint64_t)(i * 8u);
    }
    f->digit     = read_u8(&p);

    for (uint32_t i = 0; i < 7; i++) f->osi_address[i] = read_u32_le(&p);
    for (uint32_t i = 0; i < 7; i++) f->osi_simplex[i] = read_u8(&p);

    f->aegean.codepoint     = read_u32_le(&p);
    f->aegean.category      = (omi_aegean_category_t)read_u32_le(&p);
    f->aegean.projection_row = read_i8(&p);
    f->aegean.triad_index    = read_i8(&p);
    f->aegean.selector_index = read_i8(&p);

    f->braille.codepoint     = read_u32_le(&p);
    f->braille.dot_mask      = read_u8(&p);
    f->braille.dot_count     = read_u8(&p);
    f->braille.resolution_row = read_u8(&p);
    f->braille.cell_class    = (omi_braille_cell_class_t)read_u32_le(&p);

    f->geometry.id    = read_u32_le(&p);
    f->geometry.count = read_u8(&p);
    f->geometry.witness = read_u32_le(&p);

    uint8_t max_poly = f->geometry.count;
    if (max_poly > 8) max_poly = 8;
    for (uint8_t pi = 0; pi < max_poly; pi++) {
        if ((size_t)(p - buf) + 10 > len) return -1;
        f->geometry.polygons[pi].id     = read_u32_le(&p);
        f->geometry.polygons[pi].count  = read_u8(&p);
        f->geometry.polygons[pi].closed = read_u8(&p);
        f->geometry.polygons[pi].witness = read_u32_le(&p);
    }

    if ((size_t)(p - buf) + 4 > len) return -1;
    block->witness = read_u32_le(&p);

    return 0;
}

/* ── Braille encode/decode ───────────────────── */

int polyform_encode_braille(const uint8_t *payload, size_t payload_len,
                            uint32_t *braille, size_t max_codepoints)
{
    if (!payload || !braille) return -1;
    if (payload_len > max_codepoints) return -1;
    for (size_t i = 0; i < payload_len; i++) {
        braille[i] = 0x2800u + (uint32_t)payload[i];
    }
    return (int)payload_len;
}

int polyform_decode_braille(const uint32_t *braille, size_t num_codepoints,
                            uint8_t *payload, size_t *payload_len)
{
    if (!braille || !payload || !payload_len) return -1;
    for (size_t i = 0; i < num_codepoints; i++) {
        if (braille[i] < 0x2800u || braille[i] > 0x28FFu) return -1;
        payload[i] = (uint8_t)(braille[i] - 0x2800u);
    }
    *payload_len = num_codepoints;
    return 0;
}

/* ── Full roundtrip ──────────────────────────── */

int polyform_roundtrip_encode(const polyform_block_t *block,
                              uint32_t *braille, size_t max_codepoints)
{
    if (!block || !braille) return -1;
    uint8_t buf[POLYFORM_SERIALIZED_PAYLOAD_MAX];
    int serialized_len = polyform_serialize_fields(block, buf, sizeof(buf));
    if (serialized_len < 0) return -1;
    return polyform_encode_braille(buf, (size_t)serialized_len,
                                    braille, max_codepoints);
}

int polyform_roundtrip_decode(const uint32_t *braille, size_t num_codepoints,
                              polyform_block_t *block)
{
    if (!braille || !block) return -1;
    uint8_t buf[POLYFORM_SERIALIZED_PAYLOAD_MAX];
    size_t payload_len = 0;
    if (polyform_decode_braille(braille, num_codepoints, buf, &payload_len) < 0)
        return -1;
    if (polyform_deserialize_fields(buf, payload_len, block) < 0)
        return -1;
    uint32_t expected_witness = block->witness;
    block->witness = 0;
    uint32_t computed = polyform_witness(block);
    block->witness = expected_witness;
    if (computed != expected_witness) return -1;
    return 0;
}

/* ── Carrier bits (LCG matching workbench JS) ── */

void polyform_carrier_bits(const polyform_block_t *block, int carrier_idx,
                           uint8_t *bits, int *bit_count)
{
    if (!block || !bits || !bit_count) return;
    uint32_t seed = block->witness;
    seed ^= (uint32_t)(carrier_idx * 53u);
    uint32_t s = seed;
    for (int i = 0; i < POLYFORM_CARRIER_BITS; i++) {
        s = (s * 1103515245u + 12345u) & 0x7fffffffu;
        bits[i] = (uint8_t)(s & 1u);
    }
    *bit_count = POLYFORM_CARRIER_BITS;
}

int polyform_carrier_verify(const polyform_block_t *block, int carrier_idx,
                            const uint8_t *bits, int bit_count)
{
    if (!block || !bits || bit_count != POLYFORM_CARRIER_BITS) return -1;
    uint8_t expected[POLYFORM_CARRIER_BITS];
    int count = 0;
    polyform_carrier_bits(block, carrier_idx, expected, &count);
    for (int i = 0; i < POLYFORM_CARRIER_BITS; i++) {
        if (expected[i] != bits[i]) return -1;
    }
    return 0;
}
