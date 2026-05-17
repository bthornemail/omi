#include "../include/polyform_block.h"
#include "../include/polyform_capsule.h"
#include "../include/polyform_capsule_court.h"
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

static polyform_capsule_t fixture_capsule(void)
{
    polyform_block_t block = fixture_block(42);
    layer_clock_t clock;
    term_rewriting_lexer_t rewrite;
    polyform_capsule_t capsule;
    uint8_t carriers[] = {0, 3, 7};
    uint8_t orientations[] = {
        POLYFORM_ORIENTATION_NORTH,
        POLYFORM_ORIENTATION_EAST,
        POLYFORM_ORIENTATION_SOUTH
    };

    lc_init(&clock);
    lc_set_phase(&clock, 90);
    lc_set_projective_phase(&clock, 127);
    fixture_rewrite(&rewrite);
    assert(polyform_capsule_from_block(&capsule,
                                       &block,
                                       0,
                                       POLYFORM_ORIENTATION_NORTH,
                                       0,
                                       &clock,
                                       &rewrite) == 0);
    assert(polyform_capsule_replay_route(&capsule,
                                         carriers,
                                         orientations,
                                         sizeof(carriers) / sizeof(carriers[0]),
                                         &clock) == 0);
    return capsule;
}

static void assert_rejected(polyform_capsule_t *capsule,
                            const char *label,
                            uint8_t (*failed_flag)(const polyform_capsule_court_report_t *))
{
    polyform_capsule_court_report_t report;
    assert(polyform_capsule_court_admit(capsule, &report) == -1);
    assert(report.admissible == 0);
    assert(failed_flag(&report) == 0);
    printf("  rejected %-22s carrier=%u block=%u rewrite=%u horizon=%u lineage=%u failclosed=%u\n",
           label,
           report.carrier_proof_valid,
           report.block_witness_valid,
           report.rewrite_hash_valid,
           report.horizon_state_valid,
           report.lineage_chain_valid,
           report.tamper_checks_fail_closed);
}

static uint8_t carrier_flag(const polyform_capsule_court_report_t *r) { return r->carrier_proof_valid; }
static uint8_t block_flag(const polyform_capsule_court_report_t *r) { return r->block_witness_valid; }
static uint8_t rewrite_flag(const polyform_capsule_court_report_t *r) { return r->rewrite_hash_valid; }
static uint8_t horizon_flag(const polyform_capsule_court_report_t *r) { return r->horizon_state_valid; }
static uint8_t lineage_flag(const polyform_capsule_court_report_t *r) { return r->lineage_chain_valid; }

static void test_admits_valid_capsule(void)
{
    printf("Testing court admits valid capsule\n");
    polyform_capsule_t capsule = fixture_capsule();
    polyform_capsule_court_report_t report;
    assert(polyform_capsule_court_admit(&capsule, &report) == 0);
    assert(report.admissible == 1);
    assert(report.carrier_proof_valid == 1);
    assert(report.block_witness_valid == 1);
    assert(report.rewrite_hash_valid == 1);
    assert(report.horizon_state_valid == 1);
    assert(report.lineage_chain_valid == 1);
    assert(report.tamper_checks_fail_closed == 1);
    printf("  admitted root=0x%08X current=0x%08X lineage=%zu\n\n",
           report.root_witness,
           report.current_witness,
           report.lineage_count);
}

static void test_admits_serialized_capsule(void)
{
    printf("Testing court admits serialized capsule\n");
    polyform_capsule_t capsule = fixture_capsule();
    polyform_capsule_court_report_t report;
    uint8_t buf[POLYFORM_CAPSULE_SERIALIZED_MAX];
    int len = polyform_capsule_serialize(&capsule, buf, sizeof(buf));
    assert(len > 0);
    assert(polyform_capsule_court_admit_serialized(buf, (size_t)len, &report) == 0);
    assert(report.admissible == 1);
    printf("  serialized evidence admitted (%d bytes)\n\n", len);
}

static void test_rejects_bad_carrier(void)
{
    printf("Testing carrier proof rejection\n");
    polyform_capsule_t capsule = fixture_capsule();
    capsule.carrier_bits[0] ^= 1u;
    assert_rejected(&capsule, "carrier proof", carrier_flag);
    printf("\n");
}

static void test_rejects_bad_block_witness(void)
{
    printf("Testing block witness rejection\n");
    polyform_capsule_t capsule = fixture_capsule();
    capsule.root_witness ^= 0x01020304u;
    assert_rejected(&capsule, "block witness", block_flag);
    printf("\n");
}

static void test_rejects_bad_rewrite_hash(void)
{
    printf("Testing rewrite hash rejection\n");
    polyform_capsule_t capsule = fixture_capsule();
    capsule.rewrite_hash ^= 1u;
    assert_rejected(&capsule, "rewrite hash", rewrite_flag);
    printf("\n");
}

static void test_rejects_bad_horizon(void)
{
    printf("Testing horizon state rejection\n");
    polyform_capsule_t capsule = fixture_capsule();
    capsule.horizon_layer = -1;
    capsule.horizon_inversion = 0;
    assert_rejected(&capsule, "horizon state", horizon_flag);
    printf("\n");
}

static void test_rejects_bad_lineage(void)
{
    printf("Testing lineage chain rejection\n");
    polyform_capsule_t capsule = fixture_capsule();
    assert(capsule.lineage_count > 0);
    capsule.lineage[0].witness_after ^= 1u;
    assert_rejected(&capsule, "lineage chain", lineage_flag);
    printf("\n");
}

static void test_serialized_tamper_fails_closed(void)
{
    printf("Testing serialized tamper fails closed\n");
    polyform_capsule_t capsule = fixture_capsule();
    polyform_capsule_court_report_t report;
    uint8_t buf[POLYFORM_CAPSULE_SERIALIZED_MAX];
    int len = polyform_capsule_serialize(&capsule, buf, sizeof(buf));
    assert(len > 0);
    buf[0] ^= 1u;
    assert(polyform_capsule_court_admit_serialized(buf, (size_t)len, &report) == -1);
    assert(report.admissible == 0);
    printf("  serialized tamper rejected before admission\n\n");
}

int main(void)
{
    printf("\n=== PHASE 34: PROJECTION CAPSULE COURT ===\n\n");

    test_admits_valid_capsule();
    test_admits_serialized_capsule();
    test_rejects_bad_carrier();
    test_rejects_bad_block_witness();
    test_rejects_bad_rewrite_hash();
    test_rejects_bad_horizon();
    test_rejects_bad_lineage();
    test_serialized_tamper_fails_closed();

    printf("=== PHASE 34 TESTS PASSED ===\n");
    return 0;
}
