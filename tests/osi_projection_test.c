#include <assert.h>
#include <stdint.h>
#include <stdio.h>

#include "osi_projection.h"

static int kernel_equal(kernel_state_t a, kernel_state_t b)
{
    return a.K == b.K &&
           a.fano == b.fano &&
           a.GS == b.GS &&
           a.sonar.lo == b.sonar.lo &&
           a.sonar.hi == b.sonar.hi;
}

static int projection_equal(omi_osi_projection_t a, omi_osi_projection_t b)
{
    return a.layer == b.layer &&
           a.visible_digit == b.visible_digit &&
           a.address == b.address &&
           a.simplex_class == b.simplex_class;
}

static kernel_state_t seeded_state(void)
{
    kernel_state_t state = {
        .K = 0x00u,
        .fano = 0x01u,
        .sonar = { .lo = 0x00000001u, .hi = 0x00000000u },
        .GS = OMI_BITWISE_KERNEL_GS
    };

    for (unsigned i = 0; i < 11u; i++) {
        kernel_tick(&state);
    }

    return state;
}

static void test_same_seed_tick_same_stack(void)
{
    printf("Testing same seed/tick -> same OSI projection stack\n");

    kernel_state_t a = seeded_state();
    kernel_state_t b = seeded_state();

    for (uint8_t layer = OMI_OSI_PHYSICAL; layer <= OMI_OSI_APPLICATION; layer++) {
        omi_osi_projection_t pa =
            omi_project_osi_layer(&a, 11u, (omi_osi_layer_t)layer);
        omi_osi_projection_t pb =
            omi_project_osi_layer(&b, 11u, (omi_osi_layer_t)layer);
        assert(projection_equal(pa, pb));
    }

    printf("  OK identical replay state produces identical OSI stack\n\n");
}

static void test_layer_projection_determinism(void)
{
    printf("Testing every layer projection is deterministic\n");

    kernel_state_t state = seeded_state();

    for (uint8_t layer = OMI_OSI_PHYSICAL; layer <= OMI_OSI_APPLICATION; layer++) {
        omi_osi_projection_t a =
            omi_project_osi_layer(&state, 11u, (omi_osi_layer_t)layer);
        omi_osi_projection_t b =
            omi_project_osi_layer(&state, 11u, (omi_osi_layer_t)layer);
        assert(projection_equal(a, b));
        assert(a.visible_digit >= 0x30u && a.visible_digit <= 0x3Fu);
        assert(a.simplex_class <= 8u);
    }

    printf("  OK all seven layer projections are stable\n\n");
}

static void test_projection_is_non_causal(void)
{
    printf("Testing OSI projection is non-causal\n");

    kernel_state_t before = seeded_state();
    kernel_state_t after = before;

    for (uint8_t layer = OMI_OSI_PHYSICAL; layer <= OMI_OSI_APPLICATION; layer++) {
        (void)omi_project_osi_layer(&after, 11u, (omi_osi_layer_t)layer);
    }

    assert(kernel_equal(before, after));

    printf("  OK kernel_state_t unchanged by all layer projections\n\n");
}

static void test_presentation_outputs_visible_digit_and_simplex(void)
{
    printf("Testing presentation layer digit/simplex output\n");

    kernel_state_t state = seeded_state();
    omi_osi_projection_t presentation =
        omi_project_osi_layer(&state, 11u, OMI_OSI_PRESENTATION);
    omi_osi_projection_t changed =
        omi_project_osi_layer(&state, 12u, OMI_OSI_PRESENTATION);

    assert(presentation.visible_digit >= 0x30u && presentation.visible_digit <= 0x3Fu);
    assert(presentation.simplex_class <= 8u);
    assert(!projection_equal(presentation, changed));

    printf("  OK presentation digit=0x%02X simplex=%u\n",
           presentation.visible_digit,
           presentation.simplex_class);
    printf("  OK simplex/address output is derived from state + tick\n\n");
}

static void test_null_source_is_safe_and_non_causal(void)
{
    printf("Testing null source projection safety\n");

    omi_osi_projection_t projection =
        omi_project_osi_layer(0, 0u, OMI_OSI_SESSION);
    assert(projection.layer == OMI_OSI_SESSION);
    assert(projection.visible_digit >= 0x30u && projection.visible_digit <= 0x3Fu);
    assert(projection.simplex_class <= 8u);

    printf("  OK null source projects deterministic observer metadata\n\n");
}

int main(void)
{
    printf("Testing Phase 30 - OSI Projection Integration Law\n");
    printf("=================================================\n\n");

    test_same_seed_tick_same_stack();
    test_layer_projection_determinism();
    test_projection_is_non_causal();
    test_presentation_outputs_visible_digit_and_simplex();
    test_null_source_is_safe_and_non_causal();

    printf("=================================================\n");
    printf("ALL PHASE 30 TESTS PASSED\n");
    return 0;
}
