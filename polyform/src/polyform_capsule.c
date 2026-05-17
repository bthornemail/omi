#include "../include/polyform_capsule.h"
#include "../src/polyform_witness.h"
#include <string.h>

static uint32_t hash_u8(uint32_t hash, uint8_t value)
{
    return polyform_fnv1a_update(hash, &value, sizeof(value));
}

static uint32_t hash_u16(uint32_t hash, uint16_t value)
{
    uint8_t bytes[2] = {
        (uint8_t)(value & 0xffu),
        (uint8_t)((value >> 8u) & 0xffu)
    };
    return polyform_fnv1a_update(hash, bytes, sizeof(bytes));
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

static uint32_t capsule_hop_witness(uint32_t before,
                                    uint32_t hop,
                                    uint8_t carrier_index,
                                    uint8_t orientation,
                                    uint8_t scope_depth,
                                    int16_t horizon_layer,
                                    uint8_t horizon_inversion)
{
    uint32_t hash = polyform_fnv1a_seed();
    hash = hash_u32(hash, before);
    hash = hash_u32(hash, hop);
    hash = hash_u8(hash, carrier_index);
    hash = hash_u8(hash, orientation);
    hash = hash_u8(hash, scope_depth);
    hash = hash_u16(hash, (uint16_t)horizon_layer);
    hash = hash_u8(hash, horizon_inversion);
    return hash;
}

static void write_u8(uint8_t **p, uint8_t v) { *(*p)++ = v; }

static void write_u16_le(uint8_t **p, uint16_t v)
{
    *(*p)++ = (uint8_t)(v & 0xffu);
    *(*p)++ = (uint8_t)((v >> 8u) & 0xffu);
}

static void write_u32_le(uint8_t **p, uint32_t v)
{
    *(*p)++ = (uint8_t)(v & 0xffu);
    *(*p)++ = (uint8_t)((v >> 8u) & 0xffu);
    *(*p)++ = (uint8_t)((v >> 16u) & 0xffu);
    *(*p)++ = (uint8_t)((v >> 24u) & 0xffu);
}

static uint8_t read_u8(const uint8_t **p) { return *(*p)++; }

static uint16_t read_u16_le(const uint8_t **p)
{
    uint16_t v = (uint16_t)read_u8(p);
    v |= (uint16_t)read_u8(p) << 8u;
    return v;
}

static uint32_t read_u32_le(const uint8_t **p)
{
    uint32_t v = (uint32_t)read_u8(p);
    v |= (uint32_t)read_u8(p) << 8u;
    v |= (uint32_t)read_u8(p) << 16u;
    v |= (uint32_t)read_u8(p) << 24u;
    return v;
}

static int check_available(const uint8_t *base, const uint8_t *p, size_t len, size_t need)
{
    size_t used = (size_t)(p - base);
    return used <= len && need <= len - used;
}

int polyform_capsule_from_block(polyform_capsule_t *capsule,
                                const polyform_block_t *block,
                                uint8_t carrier_index,
                                polyform_orientation_t orientation,
                                uint8_t scope_depth,
                                const layer_clock_t *clock,
                                const term_rewriting_lexer_t *rewrite)
{
    int braille_count;

    if (!capsule || !block || carrier_index >= POLYFORM_CARRIER_COUNT) {
        return -1;
    }

    memset(capsule, 0, sizeof(*capsule));
    capsule->magic = POLYFORM_CAPSULE_MAGIC;
    capsule->version = POLYFORM_CAPSULE_VERSION;
    capsule->root_witness = block->witness;
    capsule->current_witness = block->witness;
    capsule->carrier_index = carrier_index;
    capsule->orientation = (uint8_t)orientation;
    capsule->scope_depth = scope_depth;
    if (clock) {
        capsule->horizon_layer = clock->projective_layer;
        capsule->horizon_inversion = clock->projective_inversion;
    }

    if (rewrite) {
        size_t clen = rewrite->closure_len;
        if (clen > TRL_CLOSURE_BUF_SIZE - 1) {
            clen = TRL_CLOSURE_BUF_SIZE - 1;
        }
        memcpy(capsule->rewrite_closure, rewrite->closure, clen);
        capsule->rewrite_closure[clen] = '\0';
        capsule->rewrite_closure_len = clen;
        capsule->rewrite_hash = trl_fnv1a32(rewrite->closure, clen);
    } else {
        capsule->rewrite_hash = trl_fnv1a32("", 0);
    }

    braille_count = polyform_roundtrip_encode(block,
                                              capsule->braille,
                                              POLYFORM_BRAILLE_MAX);
    if (braille_count < 0) {
        return -1;
    }
    capsule->braille_count = (size_t)braille_count;
    polyform_carrier_bits(block,
                          carrier_index,
                          capsule->carrier_bits,
                          &capsule->carrier_bit_count);
    return 0;
}

int polyform_capsule_verify(const polyform_capsule_t *capsule,
                            polyform_block_t *decoded)
{
    polyform_block_t local;

    if (!capsule || capsule->magic != POLYFORM_CAPSULE_MAGIC ||
        capsule->version != POLYFORM_CAPSULE_VERSION ||
        capsule->braille_count == 0 ||
        capsule->braille_count > POLYFORM_BRAILLE_MAX) {
        return -1;
    }

    memset(&local, 0, sizeof(local));
    if (polyform_roundtrip_decode(capsule->braille,
                                  capsule->braille_count,
                                  &local) < 0) {
        return -1;
    }
    if (local.witness != capsule->root_witness) {
        return -1;
    }
    if (polyform_carrier_verify(&local,
                                capsule->carrier_index,
                                capsule->carrier_bits,
                                capsule->carrier_bit_count) < 0) {
        return -1;
    }
    if (decoded) {
        *decoded = local;
    }
    return 0;
}

int polyform_capsule_append_hop(polyform_capsule_t *capsule,
                                uint32_t hop,
                                uint8_t carrier_index,
                                polyform_orientation_t orientation,
                                uint8_t scope_depth,
                                const layer_clock_t *clock)
{
    polyform_capsule_lineage_t *entry;
    uint32_t before;
    int16_t horizon_layer = 0;
    uint8_t horizon_inversion = 0;

    if (!capsule ||
        capsule->lineage_count >= POLYFORM_CAPSULE_MAX_LINEAGE ||
        carrier_index >= POLYFORM_CARRIER_COUNT) {
        return -1;
    }

    if (clock) {
        horizon_layer = clock->projective_layer;
        horizon_inversion = clock->projective_inversion;
    } else {
        horizon_layer = capsule->horizon_layer;
        horizon_inversion = capsule->horizon_inversion;
    }

    before = capsule->current_witness;
    entry = &capsule->lineage[capsule->lineage_count++];
    entry->hop = hop;
    entry->carrier_index = carrier_index;
    entry->orientation = (uint8_t)orientation;
    entry->scope_depth = scope_depth;
    entry->horizon_layer = horizon_layer;
    entry->horizon_inversion = horizon_inversion;
    entry->witness_before = before;
    entry->witness_after = capsule_hop_witness(before,
                                               hop,
                                               carrier_index,
                                               (uint8_t)orientation,
                                               scope_depth,
                                               horizon_layer,
                                               horizon_inversion);
    capsule->current_witness = entry->witness_after;
    /* The origin carrier remains bound to carrier_bits. Transit carriers live
       in lineage entries and must not rewrite the origin proof. */
    capsule->scope_depth = scope_depth;
    capsule->horizon_layer = horizon_layer;
    capsule->horizon_inversion = horizon_inversion;
    return 0;
}

int polyform_capsule_replay_route(polyform_capsule_t *capsule,
                                  const uint8_t *carrier_indices,
                                  const uint8_t *orientations,
                                  size_t hop_count,
                                  const layer_clock_t *clock)
{
    if (!capsule || !carrier_indices || !orientations ||
        hop_count > POLYFORM_CAPSULE_MAX_LINEAGE) {
        return -1;
    }

    for (size_t i = 0; i < hop_count; i++) {
        uint8_t scope = (uint8_t)(capsule->scope_depth + 1u);
        if (polyform_capsule_append_hop(capsule,
                                        (uint32_t)i,
                                        carrier_indices[i],
                                        (polyform_orientation_t)(orientations[i] & 3u),
                                        scope,
                                        clock) < 0) {
            return -1;
        }
    }
    return polyform_capsule_verify(capsule, 0);
}

int polyform_capsule_serialize(const polyform_capsule_t *capsule,
                               uint8_t *buf,
                               size_t cap)
{
    uint8_t *p = buf;
    size_t needed;

    if (!capsule || !buf ||
        capsule->braille_count > POLYFORM_BRAILLE_MAX ||
        capsule->lineage_count > POLYFORM_CAPSULE_MAX_LINEAGE ||
        capsule->rewrite_closure_len > TRL_CLOSURE_BUF_SIZE - 1 ||
        capsule->carrier_bit_count != POLYFORM_CARRIER_BITS) {
        return -1;
    }

    needed = 4 + 4 + 4 + 4 + 1 + 1 + 1 + 2 + 1 + 4 + 2 +
             capsule->rewrite_closure_len +
             2 + capsule->braille_count * 4 +
             1 + POLYFORM_CARRIER_BITS +
             1 + capsule->lineage_count * (4 + 1 + 1 + 1 + 2 + 1 + 4 + 4);
    if (cap < needed) {
        return -1;
    }

    write_u32_le(&p, capsule->magic);
    write_u32_le(&p, capsule->version);
    write_u32_le(&p, capsule->root_witness);
    write_u32_le(&p, capsule->current_witness);
    write_u8(&p, capsule->carrier_index);
    write_u8(&p, capsule->orientation);
    write_u8(&p, capsule->scope_depth);
    write_u16_le(&p, (uint16_t)capsule->horizon_layer);
    write_u8(&p, capsule->horizon_inversion);
    write_u32_le(&p, capsule->rewrite_hash);
    write_u16_le(&p, (uint16_t)capsule->rewrite_closure_len);
    memcpy(p, capsule->rewrite_closure, capsule->rewrite_closure_len);
    p += capsule->rewrite_closure_len;

    write_u16_le(&p, (uint16_t)capsule->braille_count);
    for (size_t i = 0; i < capsule->braille_count; i++) {
        write_u32_le(&p, capsule->braille[i]);
    }

    write_u8(&p, (uint8_t)capsule->carrier_bit_count);
    memcpy(p, capsule->carrier_bits, POLYFORM_CARRIER_BITS);
    p += POLYFORM_CARRIER_BITS;

    write_u8(&p, (uint8_t)capsule->lineage_count);
    for (size_t i = 0; i < capsule->lineage_count; i++) {
        const polyform_capsule_lineage_t *entry = &capsule->lineage[i];
        write_u32_le(&p, entry->hop);
        write_u8(&p, entry->carrier_index);
        write_u8(&p, entry->orientation);
        write_u8(&p, entry->scope_depth);
        write_u16_le(&p, (uint16_t)entry->horizon_layer);
        write_u8(&p, entry->horizon_inversion);
        write_u32_le(&p, entry->witness_before);
        write_u32_le(&p, entry->witness_after);
    }

    return (int)(p - buf);
}

int polyform_capsule_deserialize(const uint8_t *buf,
                                 size_t len,
                                 polyform_capsule_t *capsule)
{
    const uint8_t *p = buf;

    if (!buf || !capsule || len < 32) {
        return -1;
    }

    memset(capsule, 0, sizeof(*capsule));
    if (!check_available(buf, p, len, 29)) return -1;
    capsule->magic = read_u32_le(&p);
    capsule->version = read_u32_le(&p);
    capsule->root_witness = read_u32_le(&p);
    capsule->current_witness = read_u32_le(&p);
    capsule->carrier_index = read_u8(&p);
    capsule->orientation = read_u8(&p);
    capsule->scope_depth = read_u8(&p);
    capsule->horizon_layer = (int16_t)read_u16_le(&p);
    capsule->horizon_inversion = read_u8(&p);
    capsule->rewrite_hash = read_u32_le(&p);
    capsule->rewrite_closure_len = read_u16_le(&p);
    if (capsule->magic != POLYFORM_CAPSULE_MAGIC ||
        capsule->version != POLYFORM_CAPSULE_VERSION ||
        capsule->rewrite_closure_len > TRL_CLOSURE_BUF_SIZE - 1 ||
        !check_available(buf, p, len, capsule->rewrite_closure_len + 2)) {
        return -1;
    }
    memcpy(capsule->rewrite_closure, p, capsule->rewrite_closure_len);
    capsule->rewrite_closure[capsule->rewrite_closure_len] = '\0';
    p += capsule->rewrite_closure_len;
    if (trl_fnv1a32(capsule->rewrite_closure,
                    capsule->rewrite_closure_len) != capsule->rewrite_hash) {
        return -1;
    }

    capsule->braille_count = read_u16_le(&p);
    if (capsule->braille_count > POLYFORM_BRAILLE_MAX ||
        !check_available(buf, p, len, capsule->braille_count * 4u + 1u)) {
        return -1;
    }
    for (size_t i = 0; i < capsule->braille_count; i++) {
        capsule->braille[i] = read_u32_le(&p);
    }

    capsule->carrier_bit_count = read_u8(&p);
    if (capsule->carrier_bit_count != POLYFORM_CARRIER_BITS ||
        !check_available(buf, p, len, POLYFORM_CARRIER_BITS + 1u)) {
        return -1;
    }
    memcpy(capsule->carrier_bits, p, POLYFORM_CARRIER_BITS);
    p += POLYFORM_CARRIER_BITS;

    capsule->lineage_count = read_u8(&p);
    if (capsule->lineage_count > POLYFORM_CAPSULE_MAX_LINEAGE ||
        !check_available(buf, p, len, capsule->lineage_count * (4 + 1 + 1 + 1 + 2 + 1 + 4 + 4))) {
        return -1;
    }
    for (size_t i = 0; i < capsule->lineage_count; i++) {
        polyform_capsule_lineage_t *entry = &capsule->lineage[i];
        uint32_t expected;
        entry->hop = read_u32_le(&p);
        entry->carrier_index = read_u8(&p);
        entry->orientation = read_u8(&p);
        entry->scope_depth = read_u8(&p);
        entry->horizon_layer = (int16_t)read_u16_le(&p);
        entry->horizon_inversion = read_u8(&p);
        entry->witness_before = read_u32_le(&p);
        entry->witness_after = read_u32_le(&p);
        expected = capsule_hop_witness(entry->witness_before,
                                       entry->hop,
                                       entry->carrier_index,
                                       entry->orientation,
                                       entry->scope_depth,
                                       entry->horizon_layer,
                                       entry->horizon_inversion);
        if (entry->witness_after != expected) {
            return -1;
        }
        if (i == 0 && entry->witness_before != capsule->root_witness) {
            return -1;
        }
        if (i > 0 && entry->witness_before != capsule->lineage[i - 1].witness_after) {
            return -1;
        }
    }
    if (capsule->lineage_count > 0 &&
        capsule->current_witness != capsule->lineage[capsule->lineage_count - 1].witness_after) {
        return -1;
    }
    if (capsule->lineage_count == 0 &&
        capsule->current_witness != capsule->root_witness) {
        return -1;
    }
    return polyform_capsule_verify(capsule, 0);
}
