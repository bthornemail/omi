#ifndef OMI_POLYFORM_BLOCK_H
#define OMI_POLYFORM_BLOCK_H

#include "../../kernel/include/bitwise_kernel.h"
#include "../../kernel/include/osi_projection.h"
#include "../encoding/aegean.h"
#include "../encoding/braille.h"
#include "../geometry/omi_geometry.h"
#include <stdint.h>

#define OMI_POLYFORM_OSI_LAYER_COUNT 7u

typedef struct {
    uint8_t K;
    uint8_t fano;
    sonar60_t sonar;
    uint64_t tick;
    uint8_t digit;
    uint32_t osi_address[OMI_POLYFORM_OSI_LAYER_COUNT];
    uint8_t osi_simplex[OMI_POLYFORM_OSI_LAYER_COUNT];
    omi_aegean_projection_t aegean;
    omi_braille_projection_t braille;
    omi_geometry_surface_t geometry;
} polyform_block_fields_t;

typedef struct {
    polyform_block_fields_t fields;
    uint32_t witness;
} polyform_block_t;

polyform_block_t polyform_block_from_state(const kernel_state_t *state,
                                           uint64_t tick,
                                           const omi_osi_projection_t osi_stack[OMI_POLYFORM_OSI_LAYER_COUNT]);
uint32_t polyform_witness(const polyform_block_t *block);

char *polyform_render_text(const polyform_block_t *block);
char *polyform_render_block_header(const polyform_block_t *block);
char *polyform_render_braille(const polyform_block_t *block);
char *polyform_render_svg(const polyform_block_t *block);
void polyform_free_renderer(char *output);

#endif
