#include "../include/polyform_block.h"
#include "../../kernel/include/bitwise_kernel.h"
#include "../../kernel/include/osi_projection.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>

static kernel_state_t proof_state_at_tick_11(void)
{
    kernel_state_t state = {
        .K = 0x00u,
        .fano = 0x01u,
        .sonar = { .lo = 0x00000001u, .hi = 0x00000000u },
        .GS = OMI_BITWISE_KERNEL_GS
    };

    for (uint32_t tick = 0; tick < 11u; tick++) {
        kernel_tick(&state);
    }

    return state;
}

static void build_osi_stack(const kernel_state_t *state,
                            uint64_t tick,
                            omi_osi_projection_t osi_stack[OMI_POLYFORM_OSI_LAYER_COUNT])
{
    for (uint32_t layer = OMI_OSI_PHYSICAL; layer <= OMI_OSI_APPLICATION; layer++) {
        osi_stack[layer - 1u] = omi_project_osi_layer(state, tick, (omi_osi_layer_t)layer);
    }
}

int main(void)
{
    printf("\n=== PHASE 31: POLYFORM BLOCK RENDERING API ===\n\n");

    kernel_state_t state = proof_state_at_tick_11();
    omi_osi_projection_t osi_stack[OMI_POLYFORM_OSI_LAYER_COUNT];
    build_osi_stack(&state, 11u, osi_stack);

    polyform_block_t block = polyform_block_from_state(&state, 11u, osi_stack);
    polyform_block_t block2 = polyform_block_from_state(&state, 11u, osi_stack);

    assert(block.witness == polyform_witness(&block));
    assert(block2.witness == polyform_witness(&block2));
    assert(block.witness == block2.witness);
    assert(memcmp(block.fields.osi_address, block2.fields.osi_address, sizeof(block.fields.osi_address)) == 0);
    printf("OK block determinism witness=0x%08x\n", block.witness);

    assert(block.fields.tick == 11u);
    assert(block.fields.K == state.K);
    assert(block.fields.fano == state.fano);
    assert(block.fields.sonar.lo == state.sonar.lo);
    assert(block.fields.digit == 0x3cu);
    assert(block.fields.osi_address[0] == 0x000aaa81u);
    assert(block.fields.osi_address[5] == 0x7ceb7cacu);
    assert(block.fields.osi_simplex[5] == 6u);
    printf("OK block fields match Phase 30 QEMU vectors\n");

    char *text = polyform_render_text(&block);
    char *header = polyform_render_block_header(&block);
    char *braille = polyform_render_braille(&block);
    char *svg = polyform_render_svg(&block);
    assert(text != 0);
    assert(header != 0);
    assert(braille != 0);
    assert(svg != 0);

    uint32_t witness_after_render = polyform_witness(&block);
    assert(witness_after_render == block.witness);
    printf("OK renderers are non-causal\n");

    char *text2 = polyform_render_text(&block2);
    char *header2 = polyform_render_block_header(&block2);
    char *braille2 = polyform_render_braille(&block2);
    char *svg2 = polyform_render_svg(&block2);
    assert(text2 != 0);
    assert(header2 != 0);
    assert(braille2 != 0);
    assert(svg2 != 0);
    assert(strcmp(text, text2) == 0);
    assert(strcmp(header, header2) == 0);
    assert(strcmp(braille, braille2) == 0);
    assert(strcmp(svg, svg2) == 0);
    printf("OK same block emits identical header, text, Braille, and SVG projections\n");

    assert(strstr(text, "POLYFORM_BLOCK tick=11") != 0);
    assert(strstr(header, "POLYFORM_BLOCK tick=11") != 0);
    assert(strstr(header, "witness=0x77e53ee5") != 0);
    assert((unsigned char)braille[0] == 0xe2u);
    assert(strstr(svg, "<svg") != 0);
    assert(strstr(svg, "witness=0x") != 0);

    printf("Block header:\n%s\n", header);
    printf("Text projection:\n%s", text);
    printf("Braille projection: %s", braille);
    printf("SVG projection prefix: %.80s...\n", svg);

    polyform_free_renderer(text);
    polyform_free_renderer(header);
    polyform_free_renderer(braille);
    polyform_free_renderer(svg);
    polyform_free_renderer(text2);
    polyform_free_renderer(header2);
    polyform_free_renderer(braille2);
    polyform_free_renderer(svg2);

    printf("\n=== PHASE 31 TESTS PASSED ===\n");
    return 0;
}
