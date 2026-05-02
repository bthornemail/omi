#include <assert.h>
#include <stdint.h>
#include <stdio.h>

#include "bitwise_kernel.h"

static unsigned popcount7(uint8_t value)
{
    unsigned count = 0;
    value &= 0x7Fu;
    while (value != 0u) {
        count += (unsigned)(value & 1u);
        value >>= 1u;
    }
    return count;
}

static uint64_t sonar_to_u64(sonar60_t s)
{
    return (((uint64_t)(s.hi & 0x3FFFFFFFu)) << 30u) |
           ((uint64_t)(s.lo & 0x3FFFFFFFu));
}

static unsigned popcount64(uint64_t value)
{
    unsigned count = 0;
    while (value != 0u) {
        count += (unsigned)(value & 1u);
        value >>= 1u;
    }
    return count;
}

static void test_delta8(void)
{
    printf("Testing delta8\n");

    uint8_t k0 = delta8(0x00u, OMI_BITWISE_KERNEL_GS);
    uint8_t k0_again = delta8(0x00u, OMI_BITWISE_KERNEL_GS);
    uint8_t k1 = delta8(k0, OMI_BITWISE_KERNEL_GS);

    printf("  delta8(0x00, 0x1D) = 0x%02X\n", k0);
    printf("  delta8(0x%02X, 0x1D) = 0x%02X\n", k0, k1);

    assert(k0 == 0x1Du);
    assert(k0 == k0_again);
    assert(k1 == delta8(k0, OMI_BITWISE_KERNEL_GS));

    printf("  OK delta8 is deterministic\n\n");
}

static void test_fano_clock(void)
{
    printf("Testing Fano clock\n");

    uint8_t fano = 0x01u;
    const uint8_t expected[] = {
        0x01u, 0x02u, 0x04u, 0x08u, 0x10u, 0x20u, 0x40u, 0x01u
    };

    for (size_t i = 0; i < sizeof(expected); i++) {
        printf("  tick %zu: 0x%02X\n", i, fano);
        assert(fano == expected[i]);
        assert(popcount7(fano) == 1u);
        fano = fano_tick(fano);
    }

    assert(fano_tick(0x00u) == 0x00u);
    printf("  OK Fano clock cycles as a 7-bit one-hot ring\n\n");
}

static void test_sonar_clock(void)
{
    printf("Testing Sonar clock\n");

    sonar60_t sonar = { .lo = 0x00000001u, .hi = 0x00000000u };

    for (unsigned i = 0; i < 60u; i++) {
        uint64_t full = sonar_to_u64(sonar);
        assert(popcount64(full) == 1u);
        sonar = sonar_tick(sonar);
    }

    assert(sonar.lo == 0x00000001u);
    assert(sonar.hi == 0x00000000u);

    printf("  OK Sonar clock wraps after 60 ticks\n\n");
}

static void test_kernel_tick(void)
{
    printf("Testing kernel_tick\n");

    kernel_state_t ks = {
        .K = 0x00u,
        .fano = 0x01u,
        .sonar = { .lo = 0x00000001u, .hi = 0x00000000u },
        .GS = OMI_BITWISE_KERNEL_GS
    };

    kernel_tick(&ks);
    assert(ks.K == 0x1Du);
    assert(ks.fano == 0x02u);
    assert(ks.sonar.lo == 0x00000002u);
    assert(ks.sonar.hi == 0x00000000u);

    kernel_state_t before_null = ks;
    kernel_tick(0);
    assert(ks.K == before_null.K);
    assert(ks.fano == before_null.fano);
    assert(ks.sonar.lo == before_null.sonar.lo);
    assert(ks.sonar.hi == before_null.sonar.hi);

    printf("  OK kernel_tick advances delta8, Fano, and Sonar\n\n");
}

int main(void)
{
    printf("Testing Phase 28 - Bitwise Kernel Law\n");
    printf("=====================================\n\n");

    test_delta8();
    test_fano_clock();
    test_sonar_clock();
    test_kernel_tick();

    printf("=====================================\n");
    printf("ALL PHASE 28 TESTS PASSED\n");
    return 0;
}
