#include "../include/polyform_block.h"
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>

char *polyform_render_text(const polyform_block_t *block)
{
    if (block == 0) {
        return 0;
    }

    char *buffer = (char *)malloc(768u);
    if (buffer == 0) {
        return 0;
    }

    const polyform_block_fields_t *f = &block->fields;
    int written = snprintf(buffer,
                           768u,
                           "POLYFORM_BLOCK tick=%" PRIu64 " K=0x%02x fano=0x%02x digit=0x%02x witness=0x%08x\n"
                           "AEGEAN codepoint=0x%05x row=%d triad=%d selector=%d category=%s\n"
                           "BRAILLE codepoint=0x%04x mask=0x%02x dots=%u class=%s\n"
                           "GEOMETRY surface=0x%08x polygons=%u witness=0x%08x\n"
                           "OSI address[1..7]=0x%08x 0x%08x 0x%08x 0x%08x 0x%08x 0x%08x 0x%08x\n",
                           f->tick,
                           f->K,
                           f->fano,
                           f->digit,
                           block->witness,
                           f->aegean.codepoint,
                           f->aegean.projection_row,
                           f->aegean.triad_index,
                           f->aegean.selector_index,
                           omi_aegean_category_name(f->aegean.category),
                           f->braille.codepoint,
                           f->braille.dot_mask,
                           f->braille.dot_count,
                           omi_braille_cell_class_name(f->braille.cell_class),
                           f->geometry.id,
                           f->geometry.count,
                           f->geometry.witness,
                           f->osi_address[0],
                           f->osi_address[1],
                           f->osi_address[2],
                           f->osi_address[3],
                           f->osi_address[4],
                           f->osi_address[5],
                           f->osi_address[6]);

    if (written < 0 || written >= 768) {
        free(buffer);
        return 0;
    }

    return buffer;
}
