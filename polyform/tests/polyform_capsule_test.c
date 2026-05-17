#include "../include/polyform_block.h"
#include "../include/polyform_capsule.h"
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

static polyform_block_t fixture_block(uint32_t tick)
{
    kernel_state_t state = proof_state_at_tick(tick);
    omi_osi_projection_t osi_stack[OMI_POLYFORM_OSI_LAYER_COUNT];
    build_osi_stack(&state, tick, osi_stack);
    return polyform_block_from_state(&state, tick, osi_stack);
}

static void fixture_rewrite(term_rewriting_lexer_t *rewrite)
{
    trl_init(rewrite);
    trl_rewrite(rewrite, "bind layer 9", strlen("bind layer 9"));
    assert(rewrite->closure_len > 0);
}

static void test_capsule_build_verify(void)
{
    printf("Testing projection capsule build/verify\n");
    polyform_block_t block = fixture_block(42);
    layer_clock_t clock;
    term_rewriting_lexer_t rewrite;
    polyform_capsule_t capsule;
    polyform_block_t decoded;

    lc_init(&clock);
    lc_set_phase(&clock, 90);
    lc_set_projective_phase(&clock, 127);
    fixture_rewrite(&rewrite);

    assert(polyform_capsule_from_block(&capsule,
                                       &block,
                                       2,
                                       POLYFORM_ORIENTATION_EAST,
                                       3,
                                       &clock,
                                       &rewrite) == 0);
    assert(capsule.magic == POLYFORM_CAPSULE_MAGIC);
    assert(capsule.root_witness == block.witness);
    assert(capsule.current_witness == block.witness);
    assert(capsule.braille_count > 0);
    assert(capsule.carrier_bit_count == POLYFORM_CARRIER_BITS);
    assert(capsule.horizon_layer == 127);
    assert(capsule.horizon_inversion == 0);
    assert(capsule.rewrite_hash == trl_fnv1a32(capsule.rewrite_closure,
                                               capsule.rewrite_closure_len));
    assert(polyform_capsule_verify(&capsule, &decoded) == 0);
    assert(decoded.witness == block.witness);
    printf("  witness=0x%08X braille=%zu closure=\"%s\"\n",
           block.witness,
           capsule.braille_count,
           capsule.rewrite_closure);
    printf("  OK capsule preserves block witness and carrier bits\n\n");
}

static void test_capsule_serialize_roundtrip(void)
{
    printf("Testing capsule serialization roundtrip\n");
    polyform_block_t block = fixture_block(11);
    layer_clock_t clock;
    term_rewriting_lexer_t rewrite;
    polyform_capsule_t capsule;
    polyform_capsule_t decoded;
    uint8_t buf[POLYFORM_CAPSULE_SERIALIZED_MAX];
    int len;

    lc_init(&clock);
    lc_set_phase(&clock, 270);
    lc_set_projective_phase(&clock, 128);
    fixture_rewrite(&rewrite);
    assert(polyform_capsule_from_block(&capsule,
                                       &block,
                                       5,
                                       POLYFORM_ORIENTATION_SOUTH,
                                       1,
                                       &clock,
                                       &rewrite) == 0);

    len = polyform_capsule_serialize(&capsule, buf, sizeof(buf));
    assert(len > 0);
    memset(&decoded, 0, sizeof(decoded));
    assert(polyform_capsule_deserialize(buf, (size_t)len, &decoded) == 0);
    assert(decoded.root_witness == capsule.root_witness);
    assert(decoded.current_witness == capsule.current_witness);
    assert(decoded.horizon_layer == -128);
    assert(decoded.horizon_inversion == 1);
    assert(decoded.braille_count == capsule.braille_count);
    assert(memcmp(decoded.carrier_bits,
                  capsule.carrier_bits,
                  POLYFORM_CARRIER_BITS) == 0);
    printf("  serialized=%d bytes root=0x%08X horizon=%d\n",
           len,
           decoded.root_witness,
           decoded.horizon_layer);
    printf("  OK serialized capsule decodes and verifies\n\n");
}

static void test_capsule_multi_hop_route(void)
{
    printf("Testing capsule-aware multi-hop route replay\n");
    polyform_block_t block = fixture_block(255);
    layer_clock_t clock;
    term_rewriting_lexer_t rewrite;
    polyform_capsule_t capsule;
    polyform_capsule_t decoded;
    polyform_block_t recovered;
    uint8_t carriers[] = {0, 3, 7, 9};
    uint8_t orientations[] = {
        POLYFORM_ORIENTATION_NORTH,
        POLYFORM_ORIENTATION_EAST,
        POLYFORM_ORIENTATION_SOUTH,
        POLYFORM_ORIENTATION_WEST
    };
    uint8_t buf[POLYFORM_CAPSULE_SERIALIZED_MAX];
    uint32_t before_route;
    int len;

    lc_init(&clock);
    lc_set_phase(&clock, 90);
    lc_set_projective_phase(&clock, 255);
    fixture_rewrite(&rewrite);

    assert(polyform_capsule_from_block(&capsule,
                                       &block,
                                       0,
                                       POLYFORM_ORIENTATION_NORTH,
                                       0,
                                       &clock,
                                       &rewrite) == 0);
    before_route = capsule.current_witness;
    assert(polyform_capsule_replay_route(&capsule,
                                         carriers,
                                         orientations,
                                         sizeof(carriers) / sizeof(carriers[0]),
                                         &clock) == 0);
    assert(capsule.lineage_count == sizeof(carriers) / sizeof(carriers[0]));
    assert(capsule.current_witness != before_route);
    assert(capsule.root_witness == block.witness);
    for (size_t i = 0; i < capsule.lineage_count; i++) {
        if (i == 0) {
            assert(capsule.lineage[i].witness_before == block.witness);
        } else {
            assert(capsule.lineage[i].witness_before ==
                   capsule.lineage[i - 1].witness_after);
        }
    }

    len = polyform_capsule_serialize(&capsule, buf, sizeof(buf));
    assert(len > 0);
    assert(polyform_capsule_deserialize(buf, (size_t)len, &decoded) == 0);
    assert(polyform_capsule_verify(&decoded, &recovered) == 0);
    assert(recovered.witness == block.witness);
    assert(decoded.current_witness == capsule.current_witness);
    printf("  route hops=%zu root=0x%08X final=0x%08X serialized=%d\n",
           decoded.lineage_count,
           decoded.root_witness,
           decoded.current_witness,
           len);
    printf("  OK route lineage changes while projection witness is preserved\n\n");
}

static void test_capsule_tamper_detection(void)
{
    printf("Testing capsule tamper detection\n");
    polyform_block_t block = fixture_block(5);
    layer_clock_t clock;
    term_rewriting_lexer_t rewrite;
    polyform_capsule_t capsule;
    uint8_t buf[POLYFORM_CAPSULE_SERIALIZED_MAX];
    int len;

    lc_init(&clock);
    fixture_rewrite(&rewrite);
    assert(polyform_capsule_from_block(&capsule,
                                       &block,
                                       1,
                                       POLYFORM_ORIENTATION_WEST,
                                       2,
                                       &clock,
                                       &rewrite) == 0);
    assert(polyform_capsule_verify(&capsule, 0) == 0);
    capsule.carrier_bits[0] ^= 1u;
    assert(polyform_capsule_verify(&capsule, 0) == -1);
    capsule.carrier_bits[0] ^= 1u;

    len = polyform_capsule_serialize(&capsule, buf, sizeof(buf));
    assert(len > 0);
    buf[25] ^= 1u;
    assert(polyform_capsule_deserialize(buf, (size_t)len, &capsule) == -1);
    printf("  OK carrier and serialized lineage tampering halt\n\n");
}

int main(void)
{
    printf("\n=== PHASE 33: PROJECTION CAPSULES ===\n\n");

    test_capsule_build_verify();
    test_capsule_serialize_roundtrip();
    test_capsule_multi_hop_route();
    test_capsule_tamper_detection();

    printf("=== PHASE 33 TESTS PASSED ===\n");
    return 0;
}
