#ifndef OMI_TERM_REWRITING_LEXER_H
#define OMI_TERM_REWRITING_LEXER_H

#include <stdint.h>
#include <stddef.h>

#define TRL_INPUT_BUF_SIZE 256
#define TRL_OUTPUT_BUF_SIZE 256
#define TRL_MAX_RULES 16
#define TRL_MAX_TRACE 64
#define TRL_MAX_CRITICAL_PAIRS 32
#define TRL_CLOSURE_BUF_SIZE 64
#define TRL_CACHE_SIZE 16
#define TRL_TRACE_TEXT_SIZE 48

typedef struct {
    const char *label;
    int (*match)(const char *input, size_t input_len, size_t *match_start, size_t *match_end);
    void (*replace)(const char *input, size_t input_len, size_t match_start, size_t match_end, char *output, size_t *output_len, size_t output_cap);
} trl_rule_t;

typedef struct {
    size_t step;
    size_t rule_index;
    const char *rule;
    size_t match_start;
    size_t match_end;
    size_t output_len;
    char before_text[TRL_TRACE_TEXT_SIZE];
    char match_text[TRL_TRACE_TEXT_SIZE];
    char after_text[TRL_TRACE_TEXT_SIZE];
} trl_trace_entry_t;

typedef struct {
    const char *rule1;
    const char *rule2;
    size_t context_start;
    size_t context_end;
    char context_text[TRL_TRACE_TEXT_SIZE];
} trl_critical_pair_t;

typedef struct {
    char input[TRL_INPUT_BUF_SIZE];
    size_t input_len;
    char output[TRL_OUTPUT_BUF_SIZE];
    size_t output_len;
} trl_cache_entry_t;

typedef struct {
    trl_rule_t rules[TRL_MAX_RULES];
    size_t rule_count;
    trl_trace_entry_t trace[TRL_MAX_TRACE];
    size_t trace_count;
    trl_critical_pair_t critical_pairs[TRL_MAX_CRITICAL_PAIRS];
    size_t critical_pair_count;
    char closure[TRL_CLOSURE_BUF_SIZE];
    size_t closure_len;
    trl_cache_entry_t cache[TRL_CACHE_SIZE];
    size_t cache_count;
    uint16_t cache_hits;
    char last_output[TRL_OUTPUT_BUF_SIZE];
    size_t last_output_len;
} term_rewriting_lexer_t;

void trl_init(term_rewriting_lexer_t *trl);

void trl_rewrite(term_rewriting_lexer_t *trl, const char *input, size_t input_len);

void trl_compose(term_rewriting_lexer_t *trl, const char *inputs[], size_t input_count, const size_t *input_lens);

uint32_t trl_fnv1a32(const char *data, size_t len);

#endif
