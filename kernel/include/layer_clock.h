#ifndef OMI_LAYER_CLOCK_H
#define OMI_LAYER_CLOCK_H

#include <stdint.h>
#include <stddef.h>

#define LC_PHASE_MAX 360
#define LC_PROJECTIVE_PHASE_MAX 256
#define LC_PROJECTIVE_HORIZON 128
#define LC_CIDR_BUF_SIZE 32
#define LC_TETRA_BUF_SIZE 64
#define LC_MODAL_BUF_SIZE 16

typedef enum {
    LC_COMB_NONE = 0,
    LC_COMB_Y_UNFOLD,
    LC_COMB_Z_GUARD,
    LC_COMB_Y_FOLD,
    LC_COMB_Z_RESOLVE,
    LC_COMB_POSSIBILITY,
    LC_COMB_NEGATION,
    LC_COMB_NECESSITY
} lc_combinator_t;

typedef struct {
    uint16_t phase;
    int8_t layer;
    lc_combinator_t combinator;
    uint16_t projective_phase;
    int16_t projective_layer;
    uint8_t projective_inversion;
} layer_clock_t;

void lc_init(layer_clock_t *lc);
void lc_step(layer_clock_t *lc, uint16_t delta);
void lc_set_phase(layer_clock_t *lc, uint16_t phase);
void lc_set_projective_phase(layer_clock_t *lc, uint16_t phase);
int8_t lc_get_layer(const layer_clock_t *lc);
int16_t lc_get_projective_layer(const layer_clock_t *lc);
uint8_t lc_is_projectively_inverted(const layer_clock_t *lc);
lc_combinator_t lc_get_combinator(const layer_clock_t *lc);
void lc_cidr(const layer_clock_t *lc, char *buf, size_t buf_size);
void lc_tetra(const layer_clock_t *lc, char *buf, size_t buf_size);
void lc_modal(const layer_clock_t *lc, char *buf, size_t buf_size);
const char *lc_combinator_sym(const layer_clock_t *lc);
const char *lc_combinator_name(const layer_clock_t *lc);
int8_t lc_sin_lookup(uint16_t phase);

#endif
