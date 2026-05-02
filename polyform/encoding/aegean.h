#ifndef OMI_AEGEAN_H
#define OMI_AEGEAN_H

#include <stdint.h>

typedef enum {
    OMI_AEGEAN_UNASSIGNED = 0,
    OMI_AEGEAN_SEPARATOR_MARK,
    OMI_AEGEAN_NUMBER,
    OMI_AEGEAN_WEIGHT_MEASURE
} omi_aegean_category_t;

typedef struct {
    uint32_t codepoint;
    omi_aegean_category_t category;
    const char *unicode_name;
    int8_t projection_row;
    int8_t triad_index;
    int8_t selector_index;
} omi_aegean_projection_t;

uint8_t omi_encode_aegean(uint8_t byte);
const char *omi_aegean_category_name(omi_aegean_category_t category);
int omi_aegean_classify(uint32_t codepoint, omi_aegean_projection_t *projection);

#endif
