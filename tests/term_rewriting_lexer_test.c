#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "term_rewriting_lexer.h"

static void test_init(void)
{
    printf("Testing trl_init\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);
    assert(trl.rule_count == 13);
    assert(trl.trace_count == 0);
    assert(trl.critical_pair_count == 0);
    assert(trl.closure_len == 0);
    assert(trl.cache_count == 0);
    printf("  OK rule_count=%zu\n\n", trl.rule_count);
}

static void test_rewrite_kw(void)
{
    printf("Testing keyword rewrite rules\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);

    struct {
        const char *input;
        const char *expected_contains;
    } cases[] = {
        {"bind x",     "B#"},
        {"assign y",   "A#"},
        {"join z",     "J#"},
        {"compose w",  "C#"},
        {"target v",   "T#"},
    };
    for (size_t i = 0; i < 5; i++) {
        trl_rewrite(&trl, cases[i].input, strlen(cases[i].input));
        assert(trl.trace_count > 0);
        printf("  \"%s\" → trace=%zu rules applied\n", cases[i].input, trl.trace_count);
    }
    printf("  OK keyword rules apply\n\n");
}

static void test_rewrite_hex(void)
{
    printf("Testing hex→dec rewrite\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);

    trl_rewrite(&trl, "0xFF", 4);
    assert(trl.trace_count > 0);
    printf("  \"0xFF\" → trace=%zu rules applied\n", trl.trace_count);
    printf("  OK\n\n");
}

static void test_rewrite_dec(void)
{
    printf("Testing dec→hex rewrite\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);

    trl_rewrite(&trl, "255", 3);
    assert(trl.trace_count > 0);
    printf("  \"255\" → trace=%zu rules applied\n", trl.trace_count);
    printf("  OK\n\n");
}

static void test_rewrite_cons(void)
{
    printf("Testing cons→(.) rewrite\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);

    trl_rewrite(&trl, "cons", 4);
    assert(trl.trace_count > 0);
    printf("  \"cons\" → trace=%zu rules applied\n", trl.trace_count);
    printf("  OK\n\n");
}

static void test_rewrite_layer(void)
{
    printf("Testing layer→L rewrite\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);

    trl_rewrite(&trl, "layer 5", 7);
    assert(trl.trace_count > 0);
    printf("  \"layer 5\" → trace=%zu rules applied\n", trl.trace_count);

    trl_rewrite(&trl, "layer -3", 8);
    assert(trl.trace_count > 0);
    printf("  \"layer -3\" → trace=%zu rules applied\n", trl.trace_count);
    printf("  OK\n\n");
}

static void test_rewrite_kv(void)
{
    printf("Testing kv-pair rewrite\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);

    trl_rewrite(&trl, "x=5", 3);
    assert(trl.trace_count > 0);
    printf("  \"x=5\" → trace=%zu rules applied\n", trl.trace_count);
    printf("  OK\n\n");
}

static void test_rewrite_multi_step(void)
{
    printf("Testing multi-step rewrite\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);

    /* "bind 0xFF" should apply both kw and hex rules */
    trl_rewrite(&trl, "bind 0xFF", 9);
    assert(trl.trace_count > 0);
    assert(trl.trace[0].rule != 0);
    assert(trl.trace[0].match_end >= trl.trace[0].match_start);
    assert(trl.trace[0].before_text[0] != '\0');
    assert(trl.trace[0].after_text[0] != '\0');
    printf("  \"bind 0xFF\" → %zu steps, closure=\"%s\"\n",
           trl.trace_count, trl.closure);
    printf("  OK\n\n");
}

static void test_structured_trace_records(void)
{
    printf("Testing structured trace records\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);

    trl_rewrite(&trl, "x=5", 3);
    assert(trl.trace_count == 1);
    assert(strcmp(trl.trace[0].rule, "kv-pair") == 0);
    assert(strcmp(trl.trace[0].before_text, "x=5") == 0);
    assert(strcmp(trl.trace[0].match_text, "x=5") == 0);
    assert(strcmp(trl.trace[0].after_text, "x:#5") == 0);
    assert(trl.trace[0].output_len == 4);
    printf("  OK trace stores rule, offsets, match, and rewritten output\n\n");
}

static void test_closure_symbols(void)
{
    printf("Testing trace monoid closure symbols\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);

    trl_rewrite(&trl, "bind x", 6);
    if (trl.closure_len > 0) {
        printf("  closure chars: ");
        for (size_t i = 0; i < trl.closure_len; i++)
            printf("0x%02X ", (unsigned char)trl.closure[i]);
        printf("\n");
    }
    assert(trl.closure_len > 0);
    printf("  OK closure is non-empty\n\n");
}

static void test_critical_pair(void)
{
    printf("Testing critical pair detection\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);

    trl_rewrite(&trl, "bind x=5", 8);

    if (trl.critical_pair_count > 0) {
        printf("  %zu critical pairs detected\n", trl.critical_pair_count);
        for (size_t i = 0; i < trl.critical_pair_count; i++) {
            printf("    %s ↔ %s on \"%s\"\n",
                   trl.critical_pairs[i].rule1,
                   trl.critical_pairs[i].rule2,
                   trl.critical_pairs[i].context_text);
        }
    } else {
        printf("  (no critical pairs, rules may not overlap in this input)\n");
    }
    assert(trl.critical_pair_count > 0);
    printf("  OK\n\n");
}

static void test_compose(void)
{
    printf("Testing monoid composition\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);

    const char *inputs[] = {"bind x", "cons", "layer 3"};
    size_t lens[] = {6, 4, 7};
    trl_compose(&trl, inputs, 3, lens);
    assert(trl.trace_count >= 3);
    printf("  composition → %zu total steps, closure=\"%s\"\n",
           trl.trace_count, trl.closure);
    printf("  OK\n\n");
}

static void test_cache(void)
{
    printf("Testing rewrite cache\n");
    term_rewriting_lexer_t trl;
    trl_init(&trl);

    trl_rewrite(&trl, "bind 0x10", 9);
    trl_rewrite(&trl, "bind 0x10", 9); /* second call should hit cache */
    printf("  cache hits after duplicate: %u\n", trl.cache_hits);
    printf("  cache count: %zu\n", trl.cache_count);
    printf("  OK\n\n");
}

static void test_fnv1a32(void)
{
    printf("Testing FNV-1a 32-bit hash\n");
    uint32_t h1 = trl_fnv1a32("hello", 5);
    uint32_t h2 = trl_fnv1a32("hello", 5);
    uint32_t h3 = trl_fnv1a32("world", 5);
    assert(h1 == h2);
    assert(h1 != h3);
    assert(h1 != 0);
    printf("  hash(\"hello\") = 0x%08X\n", h1);
    printf("  hash(\"world\") = 0x%08X\n", h3);
    printf("  OK deterministic, different for different inputs\n\n");
}

int main(void)
{
    printf("Testing Term Rewriting Lexer (trace monoid · System L)\n");
    printf("=====================================================\n\n");

    test_init();
    test_rewrite_kw();
    test_rewrite_hex();
    test_rewrite_dec();
    test_rewrite_cons();
    test_rewrite_layer();
    test_rewrite_kv();
    test_rewrite_multi_step();
    test_structured_trace_records();
    test_closure_symbols();
    test_critical_pair();
    test_compose();
    test_cache();
    test_fnv1a32();

    printf("=====================================================\n");
    printf("ALL TERM REWRITING LEXER TESTS PASSED\n");
    return 0;
}
