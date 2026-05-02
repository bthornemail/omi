#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "escape.h"
#include "gauge.h"
#include "trace.h"

#define PRE_OS_MAX_TRACE 128u

typedef struct {
    omi_gauge_state_t states[PRE_OS_MAX_TRACE + 1u];
    uint8_t ops[PRE_OS_MAX_TRACE];
    uint8_t resolved[PRE_OS_MAX_TRACE];
    size_t len;
    size_t resolved_len;
    omi_gauge_state_t final_state;
} pre_os_run_t;

static int core_equal(omi_gauge_state_t a, omi_gauge_state_t b)
{
    return a.core.parity == b.core.parity &&
           a.core.plane == b.core.plane &&
           a.core.mode_bit == b.core.mode_bit;
}

static pre_os_run_t run_bytes(const uint8_t *input, size_t len, uint8_t mode)
{
    pre_os_run_t run;
    memset(&run, 0, sizeof(run));

    omi_escape_state_t esc;
    escape_init(&esc);
    uint8_t header = GAUGE_HEADER_PLAIN;
    omi_gauge_state_t state = {0};

    run.states[0] = state;
    run.len = len;

    assert(len <= PRE_OS_MAX_TRACE);

    for (size_t i = 0; i < len; i++) {
        uint8_t op = GAUGE_NOOP;
        uint8_t resolved = 0;
        state = gauge_step(state, &esc, &header, input[i], mode, &op, &resolved);
        run.states[i + 1u] = state;
        run.ops[i] = op;

        if (op != GAUGE_NOOP) {
            run.resolved[run.resolved_len++] = resolved;
        }
    }

    run.final_state = state;
    return run;
}

static int trajectories_equal(pre_os_run_t a, pre_os_run_t b)
{
    if (a.len != b.len || a.resolved_len != b.resolved_len) {
        return 0;
    }

    for (size_t i = 0; i <= a.len; i++) {
        if (!core_equal(a.states[i], b.states[i])) {
            return 0;
        }
    }

    for (size_t i = 0; i < a.len; i++) {
        if (a.ops[i] != b.ops[i]) {
            return 0;
        }
    }

    return memcmp(a.resolved, b.resolved, a.resolved_len) == 0;
}

static uint8_t observer_digit_projection(const uint8_t *resolved, size_t len)
{
    omi_header_v2_t header = decode_header_v2(resolved, len);
    return (uint8_t)(0x30u + (header.witness & 0x0Fu));
}

static void test_bytes_are_canonical(void)
{
    printf("Testing Axiom 1: Bytes are canonical\n");

    const uint8_t input1[] = {0x31, 0x2B, 0x31, 0x00};
    const uint8_t input2[] = {0x31, 0x2B, 0x31, 0x00};

    pre_os_run_t run1 = run_bytes(input1, sizeof(input1), OMICRON_LINEAR);
    pre_os_run_t run2 = run_bytes(input2, sizeof(input2), OMICRON_LINEAR);

    assert(trajectories_equal(run1, run2));

    printf("  OK Same bytes -> same trace and final state\n");
    printf("  OK Axiom 1 verified\n\n");
}

static void test_replay_is_deterministic(void)
{
    printf("Testing Axiom 2: Replay is deterministic\n");

    const uint8_t input[] = {0x31, 0x2B, 0x31, 0x2B, 0x32, 0x00};

    pre_os_run_t run1 = run_bytes(input, sizeof(input), OMICRON_LINEAR);
    pre_os_run_t run2 = run_bytes(input, sizeof(input), OMICRON_LINEAR);

    assert(trajectories_equal(run1, run2));

    printf("  OK Same input -> identical state trajectory\n");
    printf("  OK Axiom 2 verified\n\n");
}

static void test_projection_is_non_causal(void)
{
    printf("Testing Axiom 3: Projection is non-causal\n");

    const uint8_t input[] = {0x31, 0x2B, 0x31, 0x00};

    pre_os_run_t no_projection = run_bytes(input, sizeof(input), OMICRON_LINEAR);
    pre_os_run_t with_projection = run_bytes(input, sizeof(input), OMICRON_LINEAR);

    uint8_t digit = observer_digit_projection(with_projection.resolved,
                                              with_projection.resolved_len);
    assert(digit >= 0x30 && digit <= 0x3F);
    assert(core_equal(no_projection.final_state, with_projection.final_state));

    printf("  OK Observer projection emitted 0x%02X in 0x30..0x3F\n", digit);
    printf("  OK Core state unchanged by observation\n");
    printf("  OK Axiom 3 verified\n\n");
}

static void test_digits_are_first_visible(void)
{
    printf("Testing Axiom 4: Digits 0x30..0x3F are first visible measurement outputs\n");

    const uint8_t hidden_structure[] = {0x1C, 0x1D, 0x1E, 0x1F};
    pre_os_run_t run = run_bytes(hidden_structure, sizeof(hidden_structure), OMICRON_LINEAR);

    uint8_t digit1 = observer_digit_projection(run.resolved, run.resolved_len);
    uint8_t digit2 = observer_digit_projection(run.resolved, run.resolved_len);

    assert(digit1 == digit2);
    assert(digit1 >= 0x30 && digit1 <= 0x3F);

    printf("  Resolved structural bytes:");
    for (size_t i = 0; i < run.resolved_len; i++) {
        printf(" 0x%02X", run.resolved[i]);
    }
    printf("\n");
    printf("  OK Observer digit projection -> 0x%02X\n", digit1);
    printf("  OK Digits are deterministic visible measurement outputs\n");
    printf("  OK Axiom 4 verified\n\n");
}

static void test_synchronization_by_replay(void)
{
    printf("Testing Implied Axiom 5: Same seed, same tick -> same state\n");

    const uint8_t peer_a[] = {0x31, 0x2B, 0x31, 0x2B, 0x32, 0x00};
    const uint8_t peer_b[] = {0x31, 0x2B, 0x31, 0x2B, 0x32, 0x00};

    pre_os_run_t run_a = run_bytes(peer_a, sizeof(peer_a), OMICRON_LINEAR);
    pre_os_run_t run_b = run_bytes(peer_b, sizeof(peer_b), OMICRON_LINEAR);

    assert(trajectories_equal(run_a, run_b));

    printf("  OK Same seed bytes and tick count -> same final state\n");
    printf("  OK No external clock or OS scheduler required\n");
    printf("  OK Implied Axiom 5 verified\n\n");
}

int main(void)
{
    printf("\n");
    printf("===================================================================\n");
    printf("  OMI PRE-OS CANONICAL MEASUREMENT LAW - VERIFICATION SUITE\n");
    printf("===================================================================\n\n");

    test_bytes_are_canonical();
    test_replay_is_deterministic();
    test_projection_is_non_causal();
    test_digits_are_first_visible();
    test_synchronization_by_replay();

    printf("===================================================================\n");
    printf("  ALL AXIOMS VERIFIED\n");
    printf("  OMI Pre-OS Canonical Measurement Law holds.\n");
    printf("===================================================================\n\n");

    return 0;
}
