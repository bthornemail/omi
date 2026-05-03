#include "../include/polyform_block.h"
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>

char *polyform_render_svg(const polyform_block_t *block)
{
    if (block == 0) {
        return 0;
    }

    const polyform_block_fields_t *f = &block->fields;
    uint32_t address = f->osi_address[OMI_OSI_PRESENTATION - 1u];
    uint32_t x0 = 100u;
    uint32_t y0 = 24u + ((address >> 0u) & 0x1fu);
    uint32_t x1 = 36u + ((address >> 8u) & 0x1fu);
    uint32_t y1 = 164u - ((address >> 16u) & 0x1fu);
    uint32_t x2 = 164u - ((address >> 24u) & 0x1fu);
    uint32_t y2 = 164u;
    uint32_t hue = (uint32_t)(f->digit & 0x0fu) * 24u;

    char *buffer = (char *)malloc(1024u);
    if (buffer == 0) {
        return 0;
    }

    int written = snprintf(buffer,
                           1024u,
                           "<svg width=\"200\" height=\"200\" viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\">\n"
                           "  <rect width=\"200\" height=\"200\" fill=\"#f8f8f8\"/>\n"
                           "  <polygon points=\"%u,%u %u,%u %u,%u\" fill=\"hsl(%u 65%% 58%%)\" stroke=\"#111\" stroke-width=\"2\"/>\n"
                           "  <circle cx=\"%u\" cy=\"%u\" r=\"5\" fill=\"#111\"/>\n"
                           "  <text x=\"10\" y=\"20\" font-size=\"10\" font-family=\"monospace\">tick=%" PRIu64 "</text>\n"
                           "  <text x=\"10\" y=\"36\" font-size=\"10\" font-family=\"monospace\">witness=0x%08x</text>\n"
                           "</svg>\n",
                           x0,
                           y0,
                           x1,
                           y1,
                           x2,
                           y2,
                           hue,
                           12u + f->braille.dot_count * 8u,
                           188u - f->braille.dot_count * 8u,
                           f->tick,
                           block->witness);

    if (written < 0 || written >= 1024) {
        free(buffer);
        return 0;
    }

    return buffer;
}
