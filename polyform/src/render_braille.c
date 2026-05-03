#include "../include/polyform_block.h"
#include <stdlib.h>

char *polyform_render_braille(const polyform_block_t *block)
{
    if (block == 0) {
        return 0;
    }

    uint32_t codepoint = 0x2800u + (uint32_t)(block->fields.braille.dot_mask & 0xffu);
    char *buffer = (char *)malloc(5u);
    if (buffer == 0) {
        return 0;
    }

    buffer[0] = (char)(0xe0u | ((codepoint >> 12u) & 0x0fu));
    buffer[1] = (char)(0x80u | ((codepoint >> 6u) & 0x3fu));
    buffer[2] = (char)(0x80u | (codepoint & 0x3fu));
    buffer[3] = '\n';
    buffer[4] = '\0';
    return buffer;
}
