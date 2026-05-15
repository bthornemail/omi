#include "../include/layer_clock.h"

static const int8_t sin_table[LC_PHASE_MAX] = {
      0,   0,   0,   0,   1,   1,   1,   1,   1,   1,   2,   2,
      2,   2,   2,   2,   2,   3,   3,   3,   3,   3,   3,   4,
      4,   4,   4,   4,   4,   4,   4,   5,   5,   5,   5,   5,
      5,   5,   6,   6,   6,   6,   6,   6,   6,   6,   6,   7,
      7,   7,   7,   7,   7,   7,   7,   7,   7,   8,   8,   8,
      8,   8,   8,   8,   8,   8,   8,   8,   8,   8,   8,   9,
      9,   9,   9,   9,   9,   9,   9,   9,   9,   9,   9,   9,
      9,   9,   9,   9,   9,   9,   9,   9,   9,   9,   9,   9,
      9,   9,   9,   9,   9,   9,   9,   9,   9,   9,   9,   9,
      9,   9,   8,   8,   8,   8,   8,   8,   8,   8,   8,   8,
      8,   8,   8,   8,   7,   7,   7,   7,   7,   7,   7,   7,
      7,   7,   6,   6,   6,   6,   6,   6,   6,   6,   6,   5,
      5,   5,   5,   5,   5,   5,   4,   4,   4,   4,   4,   4,
      4,   4,   3,   3,   3,   3,   3,   3,   2,   2,   2,   2,
      2,   2,   2,   1,   1,   1,   1,   1,   1,   0,   0,   0,
      0,   0,   0,   0,  -1,  -1,  -1,  -1,  -1,  -1,  -2,  -2,
     -2,  -2,  -2,  -2,  -2,  -3,  -3,  -3,  -3,  -3,  -3,  -4,
     -4,  -4,  -4,  -4,  -4,  -4,  -5,  -5,  -5,  -5,  -5,  -5,
     -5,  -5,  -6,  -6,  -6,  -6,  -6,  -6,  -6,  -6,  -6,  -7,
     -7,  -7,  -7,  -7,  -7,  -7,  -7,  -7,  -7,  -8,  -8,  -8,
     -8,  -8,  -8,  -8,  -8,  -8,  -8,  -8,  -8,  -8,  -8,  -9,
     -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,
     -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,
     -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,
     -9,  -9,  -8,  -8,  -8,  -8,  -8,  -8,  -8,  -8,  -8,  -8,
     -8,  -8,  -8,  -8,  -7,  -7,  -7,  -7,  -7,  -7,  -7,  -7,
     -7,  -7,  -6,  -6,  -6,  -6,  -6,  -6,  -6,  -6,  -6,  -5,
     -5,  -5,  -5,  -5,  -5,  -5,  -5,  -4,  -4,  -4,  -4,  -4,
     -4,  -4,  -3,  -3,  -3,  -3,  -3,  -3,  -2,  -2,  -2,  -2,
     -2,  -2,  -2,  -1,  -1,  -1,  -1,  -1,  -1,   0,   0,   0,
};

int8_t lc_sin_lookup(uint16_t phase)
{
    return sin_table[phase % LC_PHASE_MAX];
}

static lc_combinator_t compute_combinator(int8_t layer)
{
    if (layer == -9) return LC_COMB_Y_UNFOLD;
    if (layer == -1) return LC_COMB_Z_GUARD;
    if (layer ==  1) return LC_COMB_Y_FOLD;
    if (layer ==  9) return LC_COMB_Z_RESOLVE;
    if (layer ==  0) return LC_COMB_POSSIBILITY;
    if (layer < 0)   return LC_COMB_NEGATION;
    return LC_COMB_NECESSITY;
}

static int16_t compute_projective_layer(uint16_t phase)
{
    uint16_t folded = (uint16_t)(phase % LC_PROJECTIVE_PHASE_MAX);
    if (folded <= (LC_PROJECTIVE_HORIZON - 1)) {
        return (int16_t)folded;
    }
    return (int16_t)(-(int16_t)(LC_PROJECTIVE_PHASE_MAX - folded));
}

void lc_init(layer_clock_t *lc)
{
    if (!lc) return;
    lc->phase = 0;
    lc->layer = 0;
    lc->combinator = LC_COMB_POSSIBILITY;
    lc->projective_phase = 0;
    lc->projective_layer = 0;
    lc->projective_inversion = 0;
}

void lc_step(layer_clock_t *lc, uint16_t delta)
{
    if (!lc) return;
    lc->phase = (uint16_t)((lc->phase + delta) % LC_PHASE_MAX);
    lc->layer = lc_sin_lookup(lc->phase);
    lc->combinator = compute_combinator(lc->layer);
    lc->projective_phase = (uint16_t)((lc->projective_phase + delta) % LC_PROJECTIVE_PHASE_MAX);
    lc->projective_layer = compute_projective_layer(lc->projective_phase);
    lc->projective_inversion = (uint8_t)(lc->projective_phase >= LC_PROJECTIVE_HORIZON);
}

void lc_set_phase(layer_clock_t *lc, uint16_t phase)
{
    if (!lc) return;
    lc->phase = phase % LC_PHASE_MAX;
    lc->layer = lc_sin_lookup(lc->phase);
    lc->combinator = compute_combinator(lc->layer);
    lc->projective_phase = phase % LC_PROJECTIVE_PHASE_MAX;
    lc->projective_layer = compute_projective_layer(lc->projective_phase);
    lc->projective_inversion = (uint8_t)(lc->projective_phase >= LC_PROJECTIVE_HORIZON);
}

void lc_set_projective_phase(layer_clock_t *lc, uint16_t phase)
{
    if (!lc) return;
    lc->projective_phase = phase % LC_PROJECTIVE_PHASE_MAX;
    lc->projective_layer = compute_projective_layer(lc->projective_phase);
    lc->projective_inversion = (uint8_t)(lc->projective_phase >= LC_PROJECTIVE_HORIZON);
}

int8_t lc_get_layer(const layer_clock_t *lc)
{
    if (!lc) return 0;
    return lc->layer;
}

int16_t lc_get_projective_layer(const layer_clock_t *lc)
{
    if (!lc) return 0;
    return lc->projective_layer;
}

uint8_t lc_is_projectively_inverted(const layer_clock_t *lc)
{
    if (!lc) return 0;
    return lc->projective_inversion;
}

lc_combinator_t lc_get_combinator(const layer_clock_t *lc)
{
    if (!lc) return LC_COMB_NONE;
    return lc->combinator;
}

static unsigned abs_int(int x)
{
    return x < 0 ? (unsigned)-x : (unsigned)x;
}

static void append_str(char *buf, size_t *pos, size_t buf_size, const char *s)
{
    while (*pos < buf_size - 1 && *s) {
        buf[*pos] = *s;
        (*pos)++;
        s++;
    }
    buf[*pos] = '\0';
}

static void u32_to_str(unsigned val, char *out, size_t *out_len)
{
    char tmp[16];
    size_t len = 0;
    if (val == 0) {
        tmp[len++] = '0';
    } else {
        while (val > 0 && len < 16) {
            tmp[len++] = (char)('0' + (val % 10));
            val /= 10;
        }
    }
    for (size_t i = 0; i < len; i++)
        out[i] = tmp[len - 1 - i];
    out[len] = '\0';
    *out_len = len;
}

static void i32_to_str(int val, char *out, size_t *out_len)
{
    size_t pos = 0;
    if (val < 0) {
        out[pos++] = '-';
        val = -val;
    }
    char tmp[16];
    size_t tlen = 0;
    if (val == 0) {
        tmp[tlen++] = '0';
    } else {
        while (val > 0 && tlen < 16) {
            tmp[tlen++] = (char)('0' + (val % 10));
            val /= 10;
        }
    }
    for (size_t i = 0; i < tlen; i++)
        out[pos + i] = tmp[tlen - 1 - i];
    out[pos + tlen] = '\0';
    *out_len = pos + tlen;
}

void lc_cidr(const layer_clock_t *lc, char *buf, size_t buf_size)
{
    if (!lc || !buf || buf_size < 4) return;
    int base = 10 + (int)lc->layer;
    unsigned subnet = abs_int(lc->layer) % 9;
    unsigned host = ((unsigned)lc->phase * 256u / 360u) % 256u;
    unsigned prefix = 32u - subnet;
    size_t p = 0;
    append_str(buf, &p, buf_size, "10.");
    {
        char tmp[16]; size_t tlen;
        i32_to_str(base, tmp, &tlen);
        for (size_t i = 0; i < tlen && p < buf_size - 1; i++)
            buf[p++] = tmp[i];
    }
    append_str(buf, &p, buf_size, ".");
    {
        char tmp[16]; size_t tlen;
        u32_to_str(subnet, tmp, &tlen);
        for (size_t i = 0; i < tlen && p < buf_size - 1; i++)
            buf[p++] = tmp[i];
    }
    append_str(buf, &p, buf_size, ".");
    {
        char tmp[16]; size_t tlen;
        u32_to_str(host, tmp, &tlen);
        for (size_t i = 0; i < tlen && p < buf_size - 1; i++)
            buf[p++] = tmp[i];
    }
    append_str(buf, &p, buf_size, "/");
    {
        char tmp[16]; size_t tlen;
        u32_to_str(prefix, tmp, &tlen);
        for (size_t i = 0; i < tlen && p < buf_size - 1; i++)
            buf[p++] = tmp[i];
    }
    buf[p] = '\0';
}

static void append_u32(char *buf, size_t *pos, size_t buf_size, unsigned val)
{
    char tmp[16];
    size_t tlen;
    u32_to_str(val, tmp, &tlen);
    append_str(buf, pos, buf_size, tmp);
}

void lc_tetra(const layer_clock_t *lc, char *buf, size_t buf_size)
{
    if (!lc || !buf || buf_size < 4) return;
    size_t p = 0;
    unsigned phase = lc->phase;

    append_str(buf, &p, buf_size, "8::");
    append_u32(buf, &p, buf_size, phase % 16);
    append_str(buf, &p, buf_size, " ");
    append_u32(buf, &p, buf_size, (phase / 16) % 16);
    append_str(buf, &p, buf_size, "888 ");
    append_str(buf, &p, buf_size, "0::");
    append_u32(buf, &p, buf_size, (phase + 90) % 360);
    append_str(buf, &p, buf_size, " :::");
    append_u32(buf, &p, buf_size, (phase / 90) % 4);
    append_str(buf, &p, buf_size, "000 0::");
    append_u32(buf, &p, buf_size, (phase + 180) % 360);
}

void lc_modal(const layer_clock_t *lc, char *buf, size_t buf_size)
{
    if (!lc || !buf || buf_size < 2) return;
    int8_t l = lc->layer;
    if (l == 0) {
        buf[0] = (char)0xE2; buf[1] = (char)0x97; buf[2] = (char)0x86; buf[3] = '\0';
        return;
    }
    size_t p = 0;
    if (l < 0) {
        for (int i = 0; i < -l && p < buf_size - 3; i++) {
            buf[p++] = (char)0xC2;
            buf[p++] = (char)0xAC;
        }
    } else {
        for (int i = 0; i < l && p < buf_size - 3; i++) {
            buf[p++] = (char)0xE2;
            buf[p++] = (char)0x96;
            buf[p++] = (char)0xA1;
        }
    }
    buf[p] = '\0';
}

const char *lc_combinator_sym(const layer_clock_t *lc)
{
    if (!lc) return "?";
    switch (lc->combinator) {
        case LC_COMB_Y_UNFOLD:     return "Y";
        case LC_COMB_Z_GUARD:      return "Z";
        case LC_COMB_Y_FOLD:       return "Y";
        case LC_COMB_Z_RESOLVE:    return "Z";
        case LC_COMB_POSSIBILITY:
            return "\xE2\x97\x86";
        case LC_COMB_NEGATION:
            return "\xC2\xAC";
        case LC_COMB_NECESSITY:
            return "\xE2\x96\xA1";
        default:                   return "?";
    }
}

const char *lc_combinator_name(const layer_clock_t *lc)
{
    if (!lc) return "unknown";
    switch (lc->combinator) {
        case LC_COMB_Y_UNFOLD:     return "Y-combinator (unfold)";
        case LC_COMB_Z_GUARD:      return "Z-combinator (guard)";
        case LC_COMB_Y_FOLD:       return "Y-combinator (fold)";
        case LC_COMB_Z_RESOLVE:    return "Z-combinator (resolve)";
        case LC_COMB_POSSIBILITY:  return "possibility (centroid)";
        case LC_COMB_NEGATION:     return "negation";
        case LC_COMB_NECESSITY:    return "necessity";
        default:                   return "unknown";
    }
}
