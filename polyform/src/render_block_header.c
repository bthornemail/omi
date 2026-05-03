#include "../include/polyform_block.h"
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>

char *polyform_render_block_header(const polyform_block_t *block)
{
    char *buffer = malloc(256u);
    if (buffer == 0) {
        return 0;
    }

    if (block == 0) {
        buffer[0] = '\0';
        return buffer;
    }

    const polyform_block_fields_t *f = &block->fields;
    (void)snprintf(buffer,
                   256u,
                   "POLYFORM_BLOCK tick=%" PRIu64 " K=0x%02x fano=0x%02x "
                   "sonar_hi=0x%08x sonar_lo=0x%08x digit=0x%02x witness=0x%08x",
                   f->tick,
                   f->K,
                   f->fano,
                   f->sonar.hi,
                   f->sonar.lo,
                   f->digit,
                   block->witness);
    return buffer;
}
