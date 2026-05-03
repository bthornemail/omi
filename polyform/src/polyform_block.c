#include "../include/polyform_block.h"

static uint32_t aegean_codepoint_from_block(uint8_t digit, uint8_t K)
{
    uint32_t digit_offset = (uint32_t)(digit & 0x0fu);
    uint32_t k_offset = (uint32_t)((K >> 5u) & 0x03u);
    return 0x10107u + ((digit_offset + k_offset) % 0x2du);
}

static uint32_t braille_codepoint_from_block(sonar60_t sonar, uint8_t digit)
{
    uint8_t dot_mask = (uint8_t)((sonar.lo & 0xffu) ^ digit);
    return 0x2800u + dot_mask;
}

static omi_geometry_surface_t geometry_from_block(omi_aegean_projection_t aegean,
                                                  omi_braille_projection_t braille,
                                                  uint32_t address)
{
    omi_projection_address_t projection_address = omi_projection_address_compose(aegean, braille);
    projection_address.observer_address ^= address;
    projection_address.witness ^= address;
    omi_geometry_vertex_t projection_vertex =
        omi_geometry_vertex_from_projection_address(projection_address);
    omi_geometry_vertex_t aegean_vertex = omi_geometry_vertex_from_aegean(aegean);
    omi_geometry_vertex_set_t braille_vertices = omi_geometry_vertices_from_braille(braille);

    omi_geometry_line_t lines[3] = {
        omi_geometry_cons_line(projection_vertex, aegean_vertex),
        omi_geometry_cons_line(aegean_vertex, braille_vertices.vertices[0]),
        omi_geometry_cons_line(braille_vertices.vertices[0], projection_vertex)
    };

    return omi_geometry_surface_from_lines(lines, 3u);
}

polyform_block_t polyform_block_from_state(const kernel_state_t *state,
                                           uint64_t tick,
                                           const omi_osi_projection_t osi_stack[OMI_POLYFORM_OSI_LAYER_COUNT])
{
    polyform_block_t block = {0};
    polyform_block_fields_t *fields = &block.fields;

    if (state != 0) {
        fields->K = state->K;
        fields->fano = state->fano;
        fields->sonar = state->sonar;
    }
    fields->tick = tick;

    if (osi_stack != 0) {
        fields->digit = osi_stack[OMI_OSI_PRESENTATION - 1u].visible_digit;

        for (uint32_t i = 0; i < OMI_POLYFORM_OSI_LAYER_COUNT; i++) {
            fields->osi_address[i] = osi_stack[i].address;
            fields->osi_simplex[i] = osi_stack[i].simplex_class;
        }
    }

    uint32_t aegean_codepoint = aegean_codepoint_from_block(fields->digit, fields->K);
    if (!omi_aegean_classify(aegean_codepoint, &fields->aegean)) {
        (void)omi_aegean_classify(0x10100u, &fields->aegean);
    }

    uint32_t braille_codepoint = braille_codepoint_from_block(fields->sonar, fields->digit);
    (void)omi_braille_classify(braille_codepoint, &fields->braille);

    fields->geometry = geometry_from_block(fields->aegean,
                                           fields->braille,
                                           fields->osi_address[OMI_OSI_PRESENTATION - 1u]);

    block.witness = polyform_witness(&block);
    return block;
}
