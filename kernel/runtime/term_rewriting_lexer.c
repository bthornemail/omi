#include "../include/term_rewriting_lexer.h"
#include <string.h>

#ifndef KERNEL_MODE
#include <stdio.h>
#endif

#define TRL_MAX_STEPS 50

/* ── utilities ────────────────────────────────── */

static int str_starts_with(const char *s, size_t slen, const char *prefix)
{
    size_t plen = strlen(prefix);
    if (plen > slen) return 0;
    return memcmp(s, prefix, plen) == 0;
}

static int str_contains(const char *s, size_t slen, const char *needle,
                         size_t *pos)
{
    size_t nlen = strlen(needle);
    if (nlen > slen) return 0;
    for (size_t i = 0; i <= slen - nlen; i++) {
        if (memcmp(&s[i], needle, nlen) == 0) {
            *pos = i;
            return 1;
        }
    }
    return 0;
}

/* ── rule: keyword + argument → prefix#arg ────── */

struct kw_rule {
    const char *kw;
    const char *prefix;
};

static int match_kw(const char *input, size_t input_len,
                    size_t *match_start, size_t *match_end,
                    const struct kw_rule *r)
{
    size_t klen = strlen(r->kw);
    if (str_starts_with(input, input_len, r->kw)) {
        size_t pos = klen;
        while (pos < input_len && input[pos] == ' ') pos++;
        if (pos < input_len && input[pos] != ' ' && input[pos] != '\n') {
            while (pos < input_len && input[pos] != ' ' && input[pos] != '\n') pos++;
            *match_start = 0;
            *match_end = pos;
            return 1;
        }
    }
    return 0;
}

static void replace_kw(const char *input, size_t input_len,
                       size_t match_start, size_t match_end,
                       char *output, size_t *output_len,
                       size_t output_cap,
                       const struct kw_rule *r)
{
    (void)match_start;
    (void)input_len;
    size_t klen = strlen(r->kw);
    size_t pos = klen;
    while (pos < input_len && input[pos] == ' ') pos++;

    size_t o = 0;
    size_t plen = strlen(r->prefix);
    for (size_t i = 0; i < plen && o < output_cap - 1; i++)
        output[o++] = r->prefix[i];
    while (pos < match_end && o < output_cap - 1)
        output[o++] = input[pos++];
    output[o] = '\0';
    *output_len = o;
}

static struct kw_rule kw_rules[5];

static int m_kw0(const char *in, size_t len, size_t *ms, size_t *me)
{ return match_kw(in, len, ms, me, &kw_rules[0]); }
static int m_kw1(const char *in, size_t len, size_t *ms, size_t *me)
{ return match_kw(in, len, ms, me, &kw_rules[1]); }
static int m_kw2(const char *in, size_t len, size_t *ms, size_t *me)
{ return match_kw(in, len, ms, me, &kw_rules[2]); }
static int m_kw3(const char *in, size_t len, size_t *ms, size_t *me)
{ return match_kw(in, len, ms, me, &kw_rules[3]); }
static int m_kw4(const char *in, size_t len, size_t *ms, size_t *me)
{ return match_kw(in, len, ms, me, &kw_rules[4]); }

static void r_kw0(const char *in, size_t len, size_t ms, size_t me, char *out, size_t *ol, size_t oc)
{ replace_kw(in, len, ms, me, out, ol, oc, &kw_rules[0]); }
static void r_kw1(const char *in, size_t len, size_t ms, size_t me, char *out, size_t *ol, size_t oc)
{ replace_kw(in, len, ms, me, out, ol, oc, &kw_rules[1]); }
static void r_kw2(const char *in, size_t len, size_t ms, size_t me, char *out, size_t *ol, size_t oc)
{ replace_kw(in, len, ms, me, out, ol, oc, &kw_rules[2]); }
static void r_kw3(const char *in, size_t len, size_t ms, size_t me, char *out, size_t *ol, size_t oc)
{ replace_kw(in, len, ms, me, out, ol, oc, &kw_rules[3]); }
static void r_kw4(const char *in, size_t len, size_t ms, size_t me, char *out, size_t *ol, size_t oc)
{ replace_kw(in, len, ms, me, out, ol, oc, &kw_rules[4]); }

/* ── rule: hex → dec ──────────────────────────── */

static int match_hex(const char *input, size_t input_len,
                     size_t *match_start, size_t *match_end)
{
    if (input_len >= 2 && input[0] == '0' && (input[1] == 'x' || input[1] == 'X')) {
        size_t pos = 2;
        while (pos < input_len &&
               ((input[pos] >= '0' && input[pos] <= '9') ||
                (input[pos] >= 'a' && input[pos] <= 'f') ||
                (input[pos] >= 'A' && input[pos] <= 'F')))
            pos++;
        if (pos > 2) {
            *match_start = 0;
            *match_end = pos;
            return 1;
        }
    }
    return 0;
}

static void u32_to_dec_str(unsigned val, char *out, size_t *out_len, size_t cap)
{
    char tmp[16];
    size_t len = 0;
    if (val == 0) { tmp[len++] = '0'; }
    else { while (val > 0 && len < 16) { tmp[len++] = (char)('0' + (val % 10)); val /= 10; } }
    size_t o = 0;
    while (len > 0 && o < cap - 1) { out[o++] = tmp[--len]; }
    out[o] = '\0';
    *out_len = o;
}

static void u32_to_hex_str(unsigned val, char *out, size_t *out_len, size_t cap)
{
    const char *hex = "0123456789abcdef";
    char tmp[16];
    size_t len = 0;
    if (val == 0) { tmp[len++] = '0'; }
    else { while (val > 0 && len < 16) { tmp[len++] = hex[val & 0xF]; val >>= 4; } }
    size_t o = 0;
    if (o < cap - 1) out[o++] = '#';
    while (len > 0 && o < cap - 1) { out[o++] = tmp[--len]; }
    out[o] = '\0';
    *out_len = o;
}

static void replace_hex(const char *input, size_t input_len,
                        size_t match_start, size_t match_end,
                        char *output, size_t *output_len,
                        size_t output_cap)
{
    (void)match_start;
    (void)input_len;
    unsigned val = 0;
    for (size_t i = 2; i < match_end; i++) {
        char c = input[i];
        val *= 16;
        if (c >= '0' && c <= '9')       val += (unsigned)(c - '0');
        else if (c >= 'a' && c <= 'f')   val += (unsigned)(c - 'a' + 10);
        else if (c >= 'A' && c <= 'F')   val += (unsigned)(c - 'A' + 10);
    }
    u32_to_dec_str(val, output, output_len, output_cap);
}

/* ── rule: dec → #hex ─────────────────────────── */

static int match_dec(const char *input, size_t input_len,
                     size_t *match_start, size_t *match_end)
{
    if (input_len == 0 || input[0] < '0' || input[0] > '9') return 0;
    size_t pos = 0;
    while (pos < input_len && input[pos] >= '0' && input[pos] <= '9')
        pos++;
    if (pos > 0 && pos < 12) {
        unsigned val = 0;
        for (size_t i = 0; i < pos; i++)
            val = val * 10 + (unsigned)(input[i] - '0');
        if (val <= 0xFFFFFF) {
            *match_start = 0;
            *match_end = pos;
            return 1;
        }
    }
    return 0;
}

static void replace_dec(const char *input, size_t input_len,
                        size_t match_start, size_t match_end,
                        char *output, size_t *output_len,
                        size_t output_cap)
{
    (void)match_start;
    (void)input_len;
    unsigned val = 0;
    for (size_t i = 0; i < match_end; i++)
        val = val * 10 + (unsigned)(input[i] - '0');
    u32_to_hex_str(val, output, output_len, output_cap);
}

/* ── rule: collapse spaces ─────────────────────── */

static int match_collapse(const char *input, size_t input_len,
                          size_t *match_start, size_t *match_end)
{
    for (size_t i = 1; i < input_len; i++) {
        char a = input[i-1];
        char b = input[i];
        if ((a == ' ' || a == '\t' || a == '\n') &&
            (b == ' ' || b == '\t' || b == '\n')) {
            *match_start = i - 1;
            *match_end = i;
            return 1;
        }
    }
    return 0;
}

static void replace_collapse(const char *input, size_t input_len,
                             size_t match_start, size_t match_end,
                             char *output, size_t *output_len,
                             size_t output_cap)
{
    (void)input_len;
    size_t o = 0;
    for (size_t i = 0; i < input_len && o < output_cap - 1; i++) {
        if (i >= match_start && i < match_end) {
            if (i == match_start) output[o++] = ' ';
            continue;
        }
        output[o++] = input[i];
    }
    output[o] = '\0';
    *output_len = o;
}

/* ── rule: trim ───────────────────────────────── */

static int match_trim(const char *input, size_t input_len,
                      size_t *match_start, size_t *match_end)
{
    if (input_len == 0) return 0;
    size_t lead = 0;
    while (lead < input_len && (input[lead] == ' ' || input[lead] == '\t' || input[lead] == '\n'))
        lead++;
    size_t trail = input_len;
    while (trail > lead && (input[trail-1] == ' ' || input[trail-1] == '\t' || input[trail-1] == '\n'))
        trail--;
    if (lead > 0 || trail < input_len) {
        *match_start = lead;
        *match_end = trail;
        return 1;
    }
    return 0;
}

static void replace_trim(const char *input, size_t input_len,
                         size_t match_start, size_t match_end,
                         char *output, size_t *output_len,
                         size_t output_cap)
{
    (void)input_len;
    size_t len = match_end - match_start;
    if (len > output_cap - 1) len = output_cap - 1;
    memcpy(output, input + match_start, len);
    output[len] = '\0';
    *output_len = len;
}

/* ── rule: kv-pair → X:#Y ──────────────────────── */

static int match_kv(const char *input, size_t input_len,
                    size_t *match_start, size_t *match_end)
{
    for (size_t i = 1; i < input_len - 1; i++) {
        if (input[i] == '=' && input[i+1] != ' ' && input[i+1] != '\t') {
            size_t s = i;
            while (s > 0 && input[s-1] != ' ' && input[s-1] != '\t') s--;
            size_t e = i + 1;
            while (e < input_len && input[e] != ' ' && input[e] != '\t') e++;
            *match_start = s;
            *match_end = e;
            return 1;
        }
    }
    return 0;
}

static void replace_kv(const char *input, size_t input_len,
                       size_t match_start, size_t match_end,
                       char *output, size_t *output_len,
                       size_t output_cap)
{
    (void)input_len;
    size_t eq = match_start;
    while (eq < match_end && input[eq] != '=') eq++;
    size_t o = 0;
    for (size_t i = match_start; i < eq && o < output_cap - 1; i++)
        output[o++] = input[i];
    if (o + 2 < output_cap) { output[o++] = ':'; output[o++] = '#'; }
    for (size_t i = eq + 1; i < match_end && o < output_cap - 1; i++)
        output[o++] = input[i];
    output[o] = '\0';
    *output_len = o;
}

/* ── rule: cons → (.) ──────────────────────────── */

static int match_cons(const char *input, size_t input_len,
                      size_t *match_start, size_t *match_end)
{
    size_t pos;
    if (str_contains(input, input_len, "cons", &pos) ||
        str_contains(input, input_len, "CONS", &pos) ||
        str_contains(input, input_len, "Cons", &pos)) {
        *match_start = pos;
        *match_end = pos + 4;
        return 1;
    }
    return 0;
}

static void replace_cons(const char *input, size_t input_len,
                         size_t match_start, size_t match_end,
                         char *output, size_t *output_len,
                         size_t output_cap)
{
    (void)input;
    (void)input_len;
    (void)match_start;
    (void)match_end;
    if (output_cap < 4) { output[0] = '\0'; *output_len = 0; return; }
    output[0] = '(';
    output[1] = '.';
    output[2] = ')';
    output[3] = '\0';
    *output_len = 3;
}

/* ── rule: car/cdr → ↔ ─────────────────────────── */

static int match_carcdr(const char *input, size_t input_len,
                        size_t *match_start, size_t *match_end)
{
    size_t pos;
    if (str_contains(input, input_len, "car", &pos) ||
        str_contains(input, input_len, "cdr", &pos)) {
        *match_start = pos;
        *match_end = pos + 3;
        return 1;
    }
    return 0;
}

static void replace_carcdr(const char *input, size_t input_len,
                           size_t match_start, size_t match_end,
                           char *output, size_t *output_len,
                           size_t output_cap)
{
    (void)input;
    (void)input_len;
    (void)match_start;
    (void)match_end;
    if (output_cap < 4) { output[0] = '\0'; *output_len = 0; return; }
    output[0] = 0xE2;
    output[1] = 0x86;
    output[2] = 0x94;
    output[3] = '\0';
    *output_len = 3;
}

/* ── rule: layer N → LN ────────────────────────── */

static int match_layer(const char *input, size_t input_len,
                       size_t *match_start, size_t *match_end)
{
    if (str_starts_with(input, input_len, "layer ")) {
        size_t pos = 6;
        if (pos >= input_len) return 0;
        if (input[pos] == '-') pos++;
        if (pos < input_len && input[pos] >= '0' && input[pos] <= '9') {
            while (pos < input_len && input[pos] >= '0' && input[pos] <= '9') pos++;
            *match_start = 0;
            *match_end = pos;
            return 1;
        }
    }
    return 0;
}

static void replace_layer(const char *input, size_t input_len,
                          size_t match_start, size_t match_end,
                          char *output, size_t *output_len,
                          size_t output_cap)
{
    (void)match_start;
    size_t pos = 6;
    int neg = 0;
    if (pos < input_len && input[pos] == '-') { neg = 1; pos++; }
    unsigned val = 0;
    while (pos < match_end && input[pos] >= '0' && input[pos] <= '9') {
        val = val * 10 + (unsigned)(input[pos] - '0');
        pos++;
    }
    size_t o = 0;
    output[o++] = 'L';
    if (neg && o < output_cap - 1) output[o++] = '-';
    {
        char tmp[16]; size_t tlen;
        u32_to_dec_str(val, tmp, &tlen, 16);
        for (size_t i = 0; i < tlen && o < output_cap - 1; i++)
            output[o++] = tmp[i];
    }
    output[o] = '\0';
    *output_len = o;
}

/* ── FNV-1a hash ───────────────────────────────── */

uint32_t trl_fnv1a32(const char *data, size_t len)
{
    uint32_t h = 2166136261u;
    for (size_t i = 0; i < len; i++) {
        h ^= (unsigned char)data[i];
        h *= 16777619u;
    }
    return h;
}

/* ── cache ─────────────────────────────────────── */

static int cache_lookup(term_rewriting_lexer_t *trl,
                        const char *input, size_t input_len)
{
    uint32_t key = trl_fnv1a32(input, input_len);
    for (size_t i = 0; i < trl->cache_count && i < TRL_CACHE_SIZE; i++) {
        uint32_t ck = trl_fnv1a32(trl->cache[i].input, trl->cache[i].input_len);
        if (ck == key &&
            trl->cache[i].input_len == input_len &&
            memcmp(trl->cache[i].input, input, input_len) == 0) {
            size_t copy_len = trl->cache[i].output_len;
            if (copy_len > TRL_OUTPUT_BUF_SIZE - 1) {
                copy_len = TRL_OUTPUT_BUF_SIZE - 1;
            }
            memcpy(trl->last_output, trl->cache[i].output, copy_len);
            trl->last_output[copy_len] = '\0';
            trl->last_output_len = copy_len;
            return 1;
        }
    }
    return 0;
}

static void cache_store(term_rewriting_lexer_t *trl,
                        const char *input, size_t input_len,
                        const char *output, size_t output_len)
{
    size_t idx = trl->cache_count % TRL_CACHE_SIZE;
    size_t ilen = input_len < TRL_INPUT_BUF_SIZE ? input_len : TRL_INPUT_BUF_SIZE - 1;
    size_t olen = output_len < TRL_OUTPUT_BUF_SIZE ? output_len : TRL_OUTPUT_BUF_SIZE - 1;
    memcpy(trl->cache[idx].input, input, ilen);
    trl->cache[idx].input[ilen] = '\0';
    trl->cache[idx].input_len = ilen;
    memcpy(trl->cache[idx].output, output, olen);
    trl->cache[idx].output[olen] = '\0';
    trl->cache[idx].output_len = olen;
    trl->cache_count++;
}

/* ── closure symbol from rule label ────────────── */

static const char *closure_sym(const char *label)
{
    if (memcmp(label, "bind", 4) == 0 || label[0] == 'B')   return "\xE2\x96\xA1";
    if (memcmp(label, "assign", 6) == 0 || label[0] == 'A') return "\xE2\x97\x86";
    if (memcmp(label, "join", 4) == 0 || label[0] == 'J')   return "\xC2\xAC";
    if (memcmp(label, "compose", 7) == 0 || label[0] == 'C') return "\xE2\x96\xA1";
    if (memcmp(label, "target", 6) == 0 || label[0] == 'T') return "\xE2\x97\x86";
    return "\xC2\xB7";
}

static void append_closure_sym(term_rewriting_lexer_t *trl, const char *label)
{
    const char *sym = closure_sym(label);
    while (*sym && trl->closure_len < TRL_CLOSURE_BUF_SIZE - 1) {
        trl->closure[trl->closure_len++] = *sym++;
    }
    trl->closure[trl->closure_len] = '\0';
}

static void copy_trace_text(char *dst, size_t dst_cap,
                            const char *src, size_t start, size_t end, size_t src_len)
{
    size_t len;
    if (!dst || dst_cap == 0) {
        return;
    }
    if (!src || start >= src_len) {
        dst[0] = '\0';
        return;
    }
    if (end > src_len) {
        end = src_len;
    }
    if (end < start) {
        end = start;
    }
    len = end - start;
    if (len > dst_cap - 1) {
        len = dst_cap - 1;
    }
    memcpy(dst, src + start, len);
    dst[len] = '\0';
}

static void append_trace_entry(term_rewriting_lexer_t *trl,
                               size_t step,
                               size_t rule_index,
                               const char *rule_label,
                               const char *before,
                               size_t before_len,
                               size_t match_start,
                               size_t match_end,
                               const char *after,
                               size_t after_len)
{
    trl_trace_entry_t *entry;
    if (trl->trace_count >= TRL_MAX_TRACE) {
        return;
    }
    entry = &trl->trace[trl->trace_count++];
    entry->step = step;
    entry->rule_index = rule_index;
    entry->rule = rule_label;
    entry->match_start = match_start;
    entry->match_end = match_end;
    entry->output_len = after_len;
    copy_trace_text(entry->before_text, sizeof(entry->before_text), before, 0, before_len, before_len);
    copy_trace_text(entry->match_text, sizeof(entry->match_text), before, match_start, match_end, before_len);
    copy_trace_text(entry->after_text, sizeof(entry->after_text), after, 0, after_len, after_len);
}

static void append_critical_pair(term_rewriting_lexer_t *trl,
                                 const char *rule1,
                                 const char *rule2,
                                 const char *input,
                                 size_t input_len,
                                 size_t match_start,
                                 size_t match_end)
{
    trl_critical_pair_t *pair;
    if (trl->critical_pair_count >= TRL_MAX_CRITICAL_PAIRS) {
        return;
    }
    pair = &trl->critical_pairs[trl->critical_pair_count++];
    pair->rule1 = rule1;
    pair->rule2 = rule2;
    pair->context_start = match_start;
    pair->context_end = match_end;
    copy_trace_text(pair->context_text, sizeof(pair->context_text), input, match_start, match_end, input_len);
}

/* ── build a rule ──────────────────────────────── */

static void build_rule(trl_rule_t *rule,
                       const char *label,
                       int (*match)(const char *, size_t, size_t *, size_t *),
                       void (*replace)(const char *, size_t, size_t, size_t, char *, size_t *, size_t))
{
    rule->label = label;
    rule->match = match;
    rule->replace = replace;
}

/* ── init ──────────────────────────────────────── */

void trl_init(term_rewriting_lexer_t *trl)
{
    if (!trl) return;
    memset(trl, 0, sizeof(*trl));

    kw_rules[0] = (struct kw_rule){"bind ",   "B#"};
    kw_rules[1] = (struct kw_rule){"assign ", "A#"};
    kw_rules[2] = (struct kw_rule){"join ",   "J#"};
    kw_rules[3] = (struct kw_rule){"compose ","C#"};
    kw_rules[4] = (struct kw_rule){"target ", "T#"};

    size_t r = 0;
    build_rule(&trl->rules[r++], "bind",   m_kw0, r_kw0);
    build_rule(&trl->rules[r++], "assign", m_kw1, r_kw1);
    build_rule(&trl->rules[r++], "join",   m_kw2, r_kw2);
    build_rule(&trl->rules[r++], "compose",m_kw3, r_kw3);
    build_rule(&trl->rules[r++], "target", m_kw4, r_kw4);
    build_rule(&trl->rules[r++], "hex\u2192dec",    match_hex,    replace_hex);
    build_rule(&trl->rules[r++], "dec\u2192hex",    match_dec,    replace_dec);
    build_rule(&trl->rules[r++], "collapse",        match_collapse, replace_collapse);
    build_rule(&trl->rules[r++], "trim",             match_trim,   replace_trim);
    build_rule(&trl->rules[r++], "kv-pair",          match_kv,     replace_kv);
    build_rule(&trl->rules[r++], "cons\u2192(.)",   match_cons,   replace_cons);
    build_rule(&trl->rules[r++], "car/cdr\u2192\u2194", match_carcdr, replace_carcdr);
    build_rule(&trl->rules[r++], "layer\u2192L",    match_layer,  replace_layer);
    trl->rule_count = r;
}

/* ── rewrite ───────────────────────────────────── */

void trl_rewrite(term_rewriting_lexer_t *trl, const char *input, size_t input_len)
{
    if (!trl || !input) return;
    trl->trace_count = 0;
    trl->critical_pair_count = 0;
    trl->closure_len = 0;
    trl->closure[0] = '\0';
    trl->last_output_len = 0;
    trl->last_output[0] = '\0';

    char buf[TRL_INPUT_BUF_SIZE];
    size_t blen = input_len < TRL_INPUT_BUF_SIZE - 1 ? input_len : TRL_INPUT_BUF_SIZE - 1;
    memcpy(buf, input, blen);
    buf[blen] = '\0';

    if (cache_lookup(trl, buf, blen)) {
        trl->cache_hits++;
        return;
    }

    char next[TRL_INPUT_BUF_SIZE];
    size_t nlen;
    size_t steps = 0;
    int changed = 1;

    while (changed && steps < TRL_MAX_STEPS) {
        changed = 0;
        for (size_t ri = 0; ri < trl->rule_count && steps < TRL_MAX_STEPS; ri++) {
            trl_rule_t *rule = &trl->rules[ri];
            if (blen == 0) break;

            size_t ms = 0, me = 0;
            if (rule->match(buf, blen, &ms, &me)) {
                char replace_buf[TRL_OUTPUT_BUF_SIZE];
                size_t rlen = 0;
                rule->replace(buf, blen, ms, me, replace_buf, &rlen, TRL_OUTPUT_BUF_SIZE);

                nlen = 0;
                for (size_t i = 0; i < ms && i < blen && nlen < TRL_INPUT_BUF_SIZE - 1; i++)
                    next[nlen++] = buf[i];
                for (size_t i = 0; i < rlen && nlen < TRL_INPUT_BUF_SIZE - 1; i++)
                    next[nlen++] = replace_buf[i];
                for (size_t i = me; i < blen && nlen < TRL_INPUT_BUF_SIZE - 1; i++)
                    next[nlen++] = buf[i];
                next[nlen] = '\0';

                append_trace_entry(trl, steps, ri, rule->label, buf, blen, ms, me, next, nlen);

                for (size_t oj = 0; oj < trl->rule_count; oj++) {
                    if (oj == ri) continue;
                    size_t oms, ome;
                    if (trl->rules[oj].match(buf, blen, &oms, &ome) &&
                        ((oms < me && ome > ms) || (ms < ome && me > oms))) {
                        size_t cstart = oms < ms ? oms : ms;
                        size_t cend = ome > me ? ome : me;
                        append_critical_pair(trl, rule->label, trl->rules[oj].label, buf, blen, cstart, cend);
                    }
                }

                append_closure_sym(trl, rule->label);

                memcpy(buf, next, nlen + 1);
                blen = nlen;
                changed = 1;
                steps++;
            }
        }
    }

    memcpy(trl->last_output, buf, blen);
    trl->last_output[blen] = '\0';
    trl->last_output_len = blen;
    cache_store(trl, input, input_len, buf, blen);
}

/* ── compose (monoid multiplication) ────────────── */

void trl_compose(term_rewriting_lexer_t *trl,
                 const char *inputs[], size_t input_count,
                 const size_t *input_lens)
{
    size_t total_trace = 0;
    size_t total_pairs = 0;
    size_t total_closure_len = 0;
    trl_trace_entry_t accumulated_trace[TRL_MAX_TRACE];
    trl_critical_pair_t accumulated_pairs[TRL_MAX_CRITICAL_PAIRS];
    char accumulated_closure[TRL_CLOSURE_BUF_SIZE];
    if (!trl || !inputs) return;
    trl->trace_count = 0;
    trl->critical_pair_count = 0;
    trl->closure_len = 0;
    trl->closure[0] = '\0';
    accumulated_closure[0] = '\0';

    for (size_t i = 0; i < input_count; i++) {
        size_t len = input_lens ? input_lens[i] : strlen(inputs[i]);
        trl_rewrite(trl, inputs[i], len);
        for (size_t j = 0; j < trl->trace_count && total_trace < TRL_MAX_TRACE; j++) {
            accumulated_trace[total_trace] = trl->trace[j];
            accumulated_trace[total_trace].step += total_trace;
            total_trace++;
        }
        for (size_t j = 0; j < trl->critical_pair_count && total_pairs < TRL_MAX_CRITICAL_PAIRS; j++) {
            accumulated_pairs[total_pairs++] = trl->critical_pairs[j];
        }
        for (size_t j = 0; j < trl->closure_len && total_closure_len < TRL_CLOSURE_BUF_SIZE - 1; j++) {
            accumulated_closure[total_closure_len++] = trl->closure[j];
        }
        if (i < input_count - 1) {
            if (total_closure_len < TRL_CLOSURE_BUF_SIZE - 4) {
                accumulated_closure[total_closure_len++] = ' ';
                accumulated_closure[total_closure_len++] = (char)0xC2;
                accumulated_closure[total_closure_len++] = (char)0xB7;
                accumulated_closure[total_closure_len++] = ' ';
            }
        }
        accumulated_closure[total_closure_len] = '\0';
    }
    trl->trace_count = total_trace;
    memcpy(trl->trace, accumulated_trace, sizeof(trl_trace_entry_t) * total_trace);
    trl->critical_pair_count = total_pairs;
    memcpy(trl->critical_pairs, accumulated_pairs, sizeof(trl_critical_pair_t) * total_pairs);
    trl->closure_len = total_closure_len;
    memcpy(trl->closure, accumulated_closure, total_closure_len + 1);
}
