#include "../include/polyform_block.h"
#include "../include/polyform_encode.h"
#include "../../kernel/include/bitwise_kernel.h"
#include "../../kernel/include/osi_projection.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>

static kernel_state_t proof_state_at_tick(uint32_t target_tick)
{
    kernel_state_t state = {
        .K = 0x00u,
        .fano = 0x01u,
        .sonar = { .lo = 0x00000001u, .hi = 0x00000000u },
        .GS = OMI_BITWISE_KERNEL_GS
    };
    for (uint32_t tick = 0; tick < target_tick; tick++) {
        kernel_tick(&state);
    }
    return state;
}

static void build_osi_stack(const kernel_state_t *state,
                            uint64_t tick,
                            omi_osi_projection_t osi_stack[OMI_POLYFORM_OSI_LAYER_COUNT])
{
    for (uint32_t layer = OMI_OSI_PHYSICAL; layer <= OMI_OSI_APPLICATION; layer++) {
        osi_stack[layer - 1u] = omi_project_osi_layer(state, tick, (omi_osi_layer_t)layer);
    }
}

int main(void)
{
    printf("\n=== PHASE 32: POLYFORM REVERSIBLE ENCODING ===\n\n");

    uint32_t braille_buf[POLYFORM_BRAILLE_MAX];

    /* Test roundtrip at multiple tick values */
    uint32_t test_ticks[] = {0, 1, 5, 11, 42, 255};
    for (size_t ti = 0; ti < sizeof(test_ticks) / sizeof(test_ticks[0]); ti++) {
        uint64_t tick = test_ticks[ti];

        kernel_state_t state = proof_state_at_tick((uint32_t)tick);
        omi_osi_projection_t osi_stack[OMI_POLYFORM_OSI_LAYER_COUNT];
        build_osi_stack(&state, tick, osi_stack);

        polyform_block_t original = polyform_block_from_state(&state, tick, osi_stack);
        uint32_t original_witness = original.witness;

        /* Encode: block → Braille codepoints */
        int bc = polyform_roundtrip_encode(&original, braille_buf, POLYFORM_BRAILLE_MAX);
        assert(bc > 0);
        printf("  tick=%llu encode → %d Braille codepoints, witness=0x%08X\n",
               (unsigned long long)tick, bc, original_witness);

        /* Decode: Braille codepoints → block */
        polyform_block_t decoded;
        memset(&decoded, 0, sizeof(decoded));
        int rc = polyform_roundtrip_decode(braille_buf, (size_t)bc, &decoded);
        assert(rc == 0);

        /* Verify witness preserved */
        assert(decoded.witness == original_witness);
        printf("    decode OK witness=0x%08X ✓\n", decoded.witness);

        /* Verify key fields preserved */
        assert(decoded.fields.K == original.fields.K);
        assert(decoded.fields.fano == original.fields.fano);
        assert(decoded.fields.sonar.lo == original.fields.sonar.lo);
        assert(decoded.fields.sonar.hi == original.fields.sonar.hi);
        assert(decoded.fields.tick == original.fields.tick);
        assert(decoded.fields.digit == original.fields.digit);
        assert(memcmp(decoded.fields.osi_address, original.fields.osi_address,
                      sizeof(decoded.fields.osi_address)) == 0);
        assert(memcmp(decoded.fields.osi_simplex, original.fields.osi_simplex,
                      sizeof(decoded.fields.osi_simplex)) == 0);

        /* Verify Aegean fields preserved */
        assert(decoded.fields.aegean.codepoint == original.fields.aegean.codepoint);
        assert(decoded.fields.aegean.category == original.fields.aegean.category);
        assert(decoded.fields.aegean.projection_row == original.fields.aegean.projection_row);

        /* Verify Braille fields preserved */
        assert(decoded.fields.braille.codepoint == original.fields.braille.codepoint);
        assert(decoded.fields.braille.dot_mask == original.fields.braille.dot_mask);

        /* Verify geometry surface preserved */
        assert(decoded.fields.geometry.id == original.fields.geometry.id);
        assert(decoded.fields.geometry.count == original.fields.geometry.count);
        assert(decoded.fields.geometry.witness == original.fields.geometry.witness);

        /* Verify polygons preserved */
        for (uint8_t pi = 0; pi < decoded.fields.geometry.count && pi < 8; pi++) {
            assert(decoded.fields.geometry.polygons[pi].id ==
                   original.fields.geometry.polygons[pi].id);
            assert(decoded.fields.geometry.polygons[pi].count ==
                   original.fields.geometry.polygons[pi].count);
            assert(decoded.fields.geometry.polygons[pi].closed ==
                   original.fields.geometry.polygons[pi].closed);
            assert(decoded.fields.geometry.polygons[pi].witness ==
                   original.fields.geometry.polygons[pi].witness);
        }
        printf("    all %zu fields match ✓\n", sizeof(polyform_block_fields_t));
    }

    /* ── Serialization edge cases ── */
    printf("\n  Testing serialization boundary conditions...\n");

    /* Null pointer safety */
    assert(polyform_serialize_fields(0, 0, 0) == -1);
    assert(polyform_deserialize_fields(0, 0, 0) == -1);
    assert(polyform_encode_braille(0, 0, 0, 0) == -1);
    assert(polyform_decode_braille(0, 0, 0, 0) == -1);

    /* Buffer too small */
    uint8_t tiny[1];
    kernel_state_t s0 = proof_state_at_tick(0);
    omi_osi_projection_t osi0[OMI_POLYFORM_OSI_LAYER_COUNT];
    build_osi_stack(&s0, 0, osi0);
    polyform_block_t b0 = polyform_block_from_state(&s0, 0, osi0);
    assert(polyform_serialize_fields(&b0, tiny, 1) == -1);

    /* Braille range check on decode */
    braille_buf[0] = 0x0000u; /* invalid — below 0x2800 */
    size_t bad_len = 1;
    uint8_t out[16];
    size_t out_len = 0;
    assert(polyform_decode_braille(braille_buf, bad_len, out, &out_len) == -1);

    printf("  boundary checks pass ✓\n");

    /* ── Carrier bits ── */
    printf("\n  Testing carrier bit generation...\n");
    polyform_block_t carrier_block = b0;
    uint8_t bits[POLYFORM_CARRIER_BITS];
    int bit_count = 0;

    for (int ci = 0; ci < POLYFORM_CARRIER_COUNT; ci++) {
        polyform_carrier_bits(&carrier_block, ci, bits, &bit_count);
        assert(bit_count == POLYFORM_CARRIER_BITS);
        assert(polyform_carrier_verify(&carrier_block, ci, bits, POLYFORM_CARRIER_BITS) == 0);

        /* Corrupted bits should fail */
        bits[0] ^= 1;
        assert(polyform_carrier_verify(&carrier_block, ci, bits, POLYFORM_CARRIER_BITS) == -1);
        bits[0] ^= 1;

        /* Count bits in first carrier */
        int ones = 0;
        for (int i = 0; i < POLYFORM_CARRIER_BITS; i++) {
            if (bits[i]) ones++;
        }
        printf("    carrier[%d] → %d bits (%d ones)\n", ci, bit_count, ones);
    }
    printf("  carrier verification OK ✓\n");

    printf("\n=== PHASE 32 TESTS PASSED ===\n");
    return 0;
}
