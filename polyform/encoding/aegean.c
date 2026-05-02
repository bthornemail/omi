#include "aegean.h"
#include <stddef.h>

typedef struct {
    uint32_t codepoint;
    omi_aegean_category_t category;
    const char *unicode_name;
} aegean_name_entry_t;

static const aegean_name_entry_t aegean_names[] = {
    {0x10100, OMI_AEGEAN_SEPARATOR_MARK, "AEGEAN WORD SEPARATOR LINE"},
    {0x10101, OMI_AEGEAN_SEPARATOR_MARK, "AEGEAN WORD SEPARATOR DOT"},
    {0x10102, OMI_AEGEAN_SEPARATOR_MARK, "AEGEAN CHECK MARK"},

    {0x10107, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER ONE"},
    {0x10108, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER TWO"},
    {0x10109, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER THREE"},
    {0x1010A, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER FOUR"},
    {0x1010B, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER FIVE"},
    {0x1010C, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER SIX"},
    {0x1010D, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER SEVEN"},
    {0x1010E, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER EIGHT"},
    {0x1010F, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER NINE"},
    {0x10110, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER TEN"},
    {0x10111, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER TWENTY"},
    {0x10112, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER THIRTY"},
    {0x10113, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER FORTY"},
    {0x10114, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER FIFTY"},
    {0x10115, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER SIXTY"},
    {0x10116, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER SEVENTY"},
    {0x10117, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER EIGHTY"},
    {0x10118, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER NINETY"},
    {0x10119, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER ONE HUNDRED"},
    {0x1011A, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER TWO HUNDRED"},
    {0x1011B, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER THREE HUNDRED"},
    {0x1011C, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER FOUR HUNDRED"},
    {0x1011D, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER FIVE HUNDRED"},
    {0x1011E, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER SIX HUNDRED"},
    {0x1011F, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER SEVEN HUNDRED"},
    {0x10120, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER EIGHT HUNDRED"},
    {0x10121, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER NINE HUNDRED"},
    {0x10122, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER ONE THOUSAND"},
    {0x10123, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER TWO THOUSAND"},
    {0x10124, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER THREE THOUSAND"},
    {0x10125, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER FOUR THOUSAND"},
    {0x10126, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER FIVE THOUSAND"},
    {0x10127, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER SIX THOUSAND"},
    {0x10128, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER SEVEN THOUSAND"},
    {0x10129, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER EIGHT THOUSAND"},
    {0x1012A, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER NINE THOUSAND"},
    {0x1012B, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER TEN THOUSAND"},
    {0x1012C, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER TWENTY THOUSAND"},
    {0x1012D, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER THIRTY THOUSAND"},
    {0x1012E, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER FORTY THOUSAND"},
    {0x1012F, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER FIFTY THOUSAND"},
    {0x10130, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER SIXTY THOUSAND"},
    {0x10131, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER SEVENTY THOUSAND"},
    {0x10132, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER EIGHTY THOUSAND"},
    {0x10133, OMI_AEGEAN_NUMBER, "AEGEAN NUMBER NINETY THOUSAND"},

    {0x10137, OMI_AEGEAN_WEIGHT_MEASURE, "AEGEAN WEIGHT BASE UNIT"},
    {0x10138, OMI_AEGEAN_WEIGHT_MEASURE, "AEGEAN WEIGHT FIRST SUBUNIT"},
    {0x10139, OMI_AEGEAN_WEIGHT_MEASURE, "AEGEAN WEIGHT SECOND SUBUNIT"},
    {0x1013A, OMI_AEGEAN_WEIGHT_MEASURE, "AEGEAN WEIGHT THIRD SUBUNIT"},
    {0x1013B, OMI_AEGEAN_WEIGHT_MEASURE, "AEGEAN WEIGHT FOURTH SUBUNIT"},
    {0x1013C, OMI_AEGEAN_WEIGHT_MEASURE, "AEGEAN DRY MEASURE FIRST SUBUNIT"},
    {0x1013D, OMI_AEGEAN_WEIGHT_MEASURE, "AEGEAN LIQUID MEASURE FIRST SUBUNIT"},
    {0x1013E, OMI_AEGEAN_WEIGHT_MEASURE, "AEGEAN MEASURE SECOND SUBUNIT"},
    {0x1013F, OMI_AEGEAN_WEIGHT_MEASURE, "AEGEAN MEASURE THIRD SUBUNIT"}
};

uint8_t omi_encode_aegean(uint8_t byte)
{
    return byte;
}

const char *omi_aegean_category_name(omi_aegean_category_t category)
{
    switch (category) {
        case OMI_AEGEAN_SEPARATOR_MARK:
            return "separator/check-mark";
        case OMI_AEGEAN_NUMBER:
            return "number";
        case OMI_AEGEAN_WEIGHT_MEASURE:
            return "weight/measure";
        case OMI_AEGEAN_UNASSIGNED:
        default:
            return "unassigned";
    }
}

int omi_aegean_classify(uint32_t codepoint, omi_aegean_projection_t *projection)
{
    if (projection == NULL) {
        return 0;
    }

    projection->codepoint = codepoint;
    projection->category = OMI_AEGEAN_UNASSIGNED;
    projection->unicode_name = "UNASSIGNED";
    projection->projection_row = -1;
    projection->triad_index = -1;
    projection->selector_index = -1;

    for (size_t i = 0; i < sizeof(aegean_names) / sizeof(aegean_names[0]); i++) {
        if (aegean_names[i].codepoint != codepoint) {
            continue;
        }

        projection->category = aegean_names[i].category;
        projection->unicode_name = aegean_names[i].unicode_name;

        if (codepoint >= 0x10100 && codepoint <= 0x10102) {
            uint32_t offset = codepoint - 0x10100;
            projection->projection_row = 0;
            projection->triad_index = 0;
            projection->selector_index = (int8_t)offset;
            return 1;
        }

        if (codepoint >= 0x10107 && codepoint <= 0x10133) {
            uint32_t offset = codepoint - 0x10107;
            projection->projection_row = (int8_t)(1 + (offset / 9));
            projection->triad_index = (int8_t)((offset % 9) / 3);
            projection->selector_index = (int8_t)(offset % 3);
            return 1;
        }

        if (codepoint >= 0x10137 && codepoint <= 0x1013F) {
            uint32_t offset = codepoint - 0x10137;
            projection->projection_row = 6;
            projection->triad_index = (int8_t)(offset / 3);
            projection->selector_index = (int8_t)(offset % 3);
            return 1;
        }

        return 1;
    }

    return 0;
}
