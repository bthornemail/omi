#include "../kernel/include/bitwise_kernel.h"
#include "../kernel/include/osi_projection.h"
#include "../polyform/include/polyform_block.h"
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>

static uint64_t parse_tick(int argc, char **argv)
{
    if (argc < 2) {
        return 11u;
    }

    char *end = 0;
    uint64_t tick = strtoull(argv[1], &end, 0);
    if (end == argv[1] || (end != 0 && *end != '\0')) {
        fprintf(stderr, "invalid tick: %s\n", argv[1]);
        exit(2);
    }
    return tick;
}

int main(int argc, char **argv)
{
    uint64_t tick = parse_tick(argc, argv);
    kernel_state_t state = {
        .K = 0x00u,
        .fano = 0x01u,
        .sonar = { .lo = 0x00000001u, .hi = 0x00000000u },
        .GS = OMI_BITWISE_KERNEL_GS,
        .semantic_clock = {0}
    };

    for (uint64_t i = 0; i < tick; i++) {
        kernel_tick(&state);
    }

    omi_osi_projection_t osi_stack[OMI_POLYFORM_OSI_LAYER_COUNT] = {{0}};
    for (uint32_t layer = OMI_OSI_PHYSICAL; layer <= OMI_OSI_APPLICATION; layer++) {
        osi_stack[layer - 1u] = omi_project_osi_layer(&state, tick, (omi_osi_layer_t)layer);
    }

    polyform_block_t block = polyform_block_from_state(&state, tick, osi_stack);
    printf("0x%08" PRIx32 "\n", block.witness);
    return 0;
}
