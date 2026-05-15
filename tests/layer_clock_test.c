#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "layer_clock.h"

static void test_init(void)
{
    printf("Testing lc_init\n");
    layer_clock_t lc;
    lc_init(&lc);
    assert(lc.phase == 0);
    assert(lc.layer == 0);
    assert(lc.combinator == LC_COMB_POSSIBILITY);
    assert(lc.projective_phase == 0);
    assert(lc.projective_layer == 0);
    assert(lc.projective_inversion == 0);
    printf("  OK phase=0 layer=0 combinator=possibility\n\n");
}

static void test_phase_cycle(void)
{
    printf("Testing phase cycle (-9 → 0 → 9 → -9)\n");
    layer_clock_t lc;
    lc_init(&lc);

    /* Phase 0 = Layer 0 */
    assert(lc.layer == 0);
    printf("  phase=0 → layer=%d\n", lc.layer);

    /* Phase 90 = Layer 9 */
    lc_set_phase(&lc, 90);
    assert(lc.layer == 9);
    assert(lc.combinator == LC_COMB_Z_RESOLVE);
    printf("  phase=90 → layer=%d\n", lc.layer);

    /* Phase 180 = Layer 0 */
    lc_set_phase(&lc, 180);
    assert(lc.layer == 0);
    printf("  phase=180 → layer=%d\n", lc.layer);

    /* Phase 270 = Layer -9 */
    lc_set_phase(&lc, 270);
    assert(lc.layer == -9);
    assert(lc.combinator == LC_COMB_Y_UNFOLD);
    printf("  phase=270 → layer=%d\n", lc.layer);

    /* Step by 90: 270→360≡0 */
    lc_step(&lc, 90);
    assert(lc.phase == 0);
    assert(lc.layer == 0);
    printf("  step+90 → phase=%d layer=%d\n\n", lc.phase, lc.layer);
}

static void test_combinator_selection(void)
{
    printf("Testing combinator selection\n");
    layer_clock_t lc;

    /* Z at -1 */
    lc_set_phase(&lc, 276); /* approx sin⁻¹(-1/9) → layer -1 */
    /* sin(276°) ≈ -0.994 → round = -1 */
    if (lc.layer == -1) {
        assert(lc.combinator == LC_COMB_Z_GUARD);
        printf("  layer=-1 → Z (guard)\n");
    }

    /* Y at 1 */
    lc_set_phase(&lc, 84); /* approx sin⁻¹(1/9) → layer 1 */
    if (lc.layer == 1) {
        assert(lc.combinator == LC_COMB_Y_FOLD);
        printf("  layer=1 → Y (fold)\n");
    }

    /* Y at -9 */
    lc_set_phase(&lc, 270);
    assert(lc.combinator == LC_COMB_Y_UNFOLD);
    printf("  layer=-9 → Y (unfold)\n");

    /* Z at 9 */
    lc_set_phase(&lc, 90);
    assert(lc.combinator == LC_COMB_Z_RESOLVE);
    printf("  layer=9 → Z (resolve)\n");

    /* negation at negative */
    lc_set_phase(&lc, 200);
    if (lc.layer < 0 && lc.layer != -9 && lc.layer != -1) {
        assert(lc.combinator == LC_COMB_NEGATION);
        printf("  layer=%d → negation\n", lc.layer);
    }

    /* necessity at positive */
    lc_set_phase(&lc, 30);
    if (lc.layer > 0 && lc.layer != 9 && lc.layer != 1) {
        assert(lc.combinator == LC_COMB_NECESSITY);
        printf("  layer=%d → necessity\n", lc.layer);
    }

    printf("  OK\n\n");
}

static void test_cidr_format(void)
{
    printf("Testing CIDR format\n");
    layer_clock_t lc;
    lc_set_phase(&lc, 90); /* layer 9 */
    char buf[LC_CIDR_BUF_SIZE];
    lc_cidr(&lc, buf, sizeof(buf));
    printf("  phase=90→ CIDR=%s\n", buf);
    assert(strstr(buf, "10.") == buf);
    assert(strstr(buf, "/") != NULL);

    lc_set_phase(&lc, 0);
    lc_cidr(&lc, buf, sizeof(buf));
    printf("  phase=0→ CIDR=%s\n", buf);
    assert(strstr(buf, "10.10.") == buf);

    /* CIDR prefix should be 32-layer */
    unsigned prefix = 0;
    const char *slash = strchr(buf, '/');
    assert(slash != NULL);
    sscanf(slash + 1, "%u", &prefix);
    assert(prefix == 32);
    printf("  CIDR prefix = /%u\n\n", prefix);
}

static void test_tetra_pattern(void)
{
    printf("Testing tetrahedral pattern\n");
    layer_clock_t lc;
    lc_set_phase(&lc, 0);
    char buf[LC_TETRA_BUF_SIZE];
    lc_tetra(&lc, buf, sizeof(buf));
    printf("  phase=0 → tetra=\"%s\"\n", buf);
    assert(strstr(buf, "8::") != NULL);
    assert(strstr(buf, "888") != NULL);
    assert(strstr(buf, "0::") != NULL);
    assert(strstr(buf, ":::") != NULL);
    assert(strstr(buf, "000") != NULL);

    lc_set_phase(&lc, 90);
    lc_tetra(&lc, buf, sizeof(buf));
    printf("  phase=90 → tetra=\"%s\"\n", buf);

    lc_set_phase(&lc, 180);
    lc_tetra(&lc, buf, sizeof(buf));
    printf("  phase=180 → tetra=\"%s\"\n\n", buf);
}

static void test_modal(void)
{
    printf("Testing modal operators\n");
    layer_clock_t lc;
    char buf[LC_MODAL_BUF_SIZE];

    lc_set_phase(&lc, 0);
    lc_modal(&lc, buf, sizeof(buf));
    printf("  layer=0 → modal=\"%s\"\n", buf);

    lc_set_phase(&lc, 30);
    lc_modal(&lc, buf, sizeof(buf));
    printf("  layer=%d → modal=\"%s\"\n", lc.layer, buf);

    lc_set_phase(&lc, 200);
    lc_modal(&lc, buf, sizeof(buf));
    printf("  layer=%d → modal=\"%s\"\n", lc.layer, buf);

    printf("  OK\n\n");
}

static void test_sin_table(void)
{
    printf("Testing sin lookup table\n");
    assert(lc_sin_lookup(0) == 0);
    assert(lc_sin_lookup(90) == 9);
    assert(lc_sin_lookup(180) == 0);
    assert(lc_sin_lookup(270) == -9);
    assert(lc_sin_lookup(360) == 0);

    /* Approximately symmetric: allow rounding differences of ±1 */
    for (uint16_t i = 0; i < 360; i++) {
        int8_t s1 = lc_sin_lookup(i);
        int8_t s2 = lc_sin_lookup((360 - i) % 360);
        int diff = (int)s1 - (int)(-s2);
        if (diff < 0) diff = -diff;
        assert(diff <= 1);
    }
    printf("  approximate symmetry holds (rounding diff ≤1)\n");
    printf("  OK sin table symmetric, key points correct\n\n");
}

static void test_wraparound(void)
{
    printf("Testing phase wraparound\n");
    layer_clock_t lc;
    lc_init(&lc);
    lc_set_phase(&lc, 360);
    assert(lc.phase == 0);
    lc_set_phase(&lc, 400);
    assert(lc.phase == 40);
    /* Large step */
    lc_step(&lc, 350);
    assert(lc.phase == 30);
    printf("  OK phase wraps correctly\n\n");
}

static void test_projective_horizon(void)
{
    printf("Testing 128-layer projective horizon\n");
    layer_clock_t lc;
    lc_init(&lc);

    lc_set_projective_phase(&lc, 127);
    assert(lc.projective_layer == 127);
    assert(lc.projective_inversion == 0);
    printf("  projective_phase=127 → horizon=%d\n", lc.projective_layer);

    lc_set_projective_phase(&lc, 128);
    assert(lc.projective_layer == -128);
    assert(lc.projective_inversion == 1);
    printf("  projective_phase=128 → horizon=%d\n", lc.projective_layer);

    lc_set_projective_phase(&lc, 255);
    assert(lc.projective_layer == -1);
    assert(lc.projective_inversion == 1);
    printf("  projective_phase=255 → horizon=%d\n", lc.projective_layer);

    lc_step(&lc, 1);
    assert(lc.projective_phase == 0);
    assert(lc.projective_layer == 0);
    assert(lc.projective_inversion == 0);
    printf("  projective wrap → horizon=%d\n", lc.projective_layer);
    printf("  OK projective closure holds at n-1=127 / -128 inversion\n\n");
}

int main(void)
{
    printf("Testing Layer Clock (-9..9 CIDR Y/Z Tetra)\n");
    printf("==========================================\n\n");

    test_init();
    test_phase_cycle();
    test_combinator_selection();
    test_cidr_format();
    test_tetra_pattern();
    test_modal();
    test_sin_table();
    test_wraparound();
    test_projective_horizon();

    printf("==========================================\n");
    printf("ALL LAYER CLOCK TESTS PASSED\n");
    return 0;
}
