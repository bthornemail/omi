#include "braille.h"

uint8_t omi_encode_braille(uint8_t byte)
{
    return byte & 0x3f;
}

static uint8_t braille_popcount8(uint8_t value)
{
    uint8_t count = 0;

    while (value != 0) {
        count += (uint8_t)(value & 1u);
        value >>= 1;
    }

    return count;
}

const char *omi_braille_cell_class_name(omi_braille_cell_class_t cell_class)
{
    switch (cell_class) {
        case OMI_BRAILLE_EMPTY_CELL:
            return "empty-cell";
        case OMI_BRAILLE_SPARSE_CELL:
            return "sparse-cell";
        case OMI_BRAILLE_DENSE_CELL:
            return "dense-cell";
        case OMI_BRAILLE_FULL_CELL:
            return "full-cell";
        case OMI_BRAILLE_UNASSIGNED:
        default:
            return "unassigned";
    }
}

int omi_braille_classify(uint32_t codepoint, omi_braille_projection_t *projection)
{
    if (projection == 0) {
        return 0;
    }

    projection->codepoint = codepoint;
    projection->dot_mask = 0;
    projection->dot_count = 0;
    projection->resolution_row = 0;
    projection->cell_class = OMI_BRAILLE_UNASSIGNED;
    projection->unicode_name = "UNASSIGNED";

    if (codepoint < 0x2800 || codepoint > 0x28FF) {
        return 0;
    }

    projection->dot_mask = (uint8_t)(codepoint - 0x2800);
    projection->dot_count = braille_popcount8(projection->dot_mask);
    projection->resolution_row = projection->dot_count;

    if (projection->dot_count == 0) {
        projection->cell_class = OMI_BRAILLE_EMPTY_CELL;
    } else if (projection->dot_count <= 3) {
        projection->cell_class = OMI_BRAILLE_SPARSE_CELL;
    } else if (projection->dot_count < 8) {
        projection->cell_class = OMI_BRAILLE_DENSE_CELL;
    } else {
        projection->cell_class = OMI_BRAILLE_FULL_CELL;
    }

    projection->unicode_name = "BRAILLE PATTERN DOTS";
    return 1;
}
