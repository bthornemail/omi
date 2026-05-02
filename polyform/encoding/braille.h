#ifndef OMI_BRAILLE_H
#define OMI_BRAILLE_H

#include <stdint.h>

typedef enum {
    OMI_BRAILLE_UNASSIGNED = 0,
    OMI_BRAILLE_EMPTY_CELL,
    OMI_BRAILLE_SPARSE_CELL,
    OMI_BRAILLE_DENSE_CELL,
    OMI_BRAILLE_FULL_CELL
} omi_braille_cell_class_t;

typedef struct {
    uint32_t codepoint;
    uint8_t dot_mask;
    uint8_t dot_count;
    uint8_t resolution_row;
    omi_braille_cell_class_t cell_class;
    const char *unicode_name;
} omi_braille_projection_t;

uint8_t omi_encode_braille(uint8_t byte);
const char *omi_braille_cell_class_name(omi_braille_cell_class_t cell_class);
int omi_braille_classify(uint32_t codepoint, omi_braille_projection_t *projection);

#endif
