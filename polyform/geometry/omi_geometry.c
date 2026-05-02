#include "omi_geometry.h"

static uint32_t geometry_mix_u32(uint32_t hash, uint32_t value)
{
    hash ^= value;
    hash *= 16777619u;
    return hash;
}

static uint32_t geometry_vertex_id(uint32_t source, uint8_t dot_mask, uint8_t occupied, uint32_t kind)
{
    uint32_t hash = 2166136261u;
    hash = geometry_mix_u32(hash, source);
    hash = geometry_mix_u32(hash, dot_mask);
    hash = geometry_mix_u32(hash, occupied);
    hash = geometry_mix_u32(hash, kind);
    return hash;
}

const char *omi_geometry_ascii_role_name(omi_geometry_ascii_role_t role)
{
    switch (role) {
        case OMI_GEOMETRY_ASCII_CONTROL_SEED:
            return "canonical-control-seed";
        case OMI_GEOMETRY_ASCII_PROJECTIVE_ORIGIN_NULL:
            return "projective-origin-null";
        case OMI_GEOMETRY_ASCII_PROJECTIVE_CLOSURE_WITNESS:
            return "projective-closure-witness";
        case OMI_GEOMETRY_ASCII_INDEX_POINTER:
            return "index-pointer";
        case OMI_GEOMETRY_ASCII_OPERATIONAL_REFERENCE:
            return "operational-reference";
        case OMI_GEOMETRY_ASCII_TOPOLOGY_DESCRIPTOR:
            return "topology-descriptor";
        case OMI_GEOMETRY_ASCII_RELATION_PROBE:
            return "relation-probe";
        case OMI_GEOMETRY_ASCII_OTHER:
        default:
            return "other";
    }
}

omi_geometry_ascii_initiation_t omi_geometry_ascii_initiation(uint8_t byte)
{
    omi_geometry_ascii_initiation_t initiation = {
        .byte = byte,
        .role = OMI_GEOMETRY_ASCII_OTHER,
        .band = (uint8_t)(byte >> 4),
        .index = (uint8_t)(byte & 0x0Fu),
        .name = "OTHER",
        .witness = 2166136261u
    };

    if (byte == 0x00) {
        initiation.role = OMI_GEOMETRY_ASCII_PROJECTIVE_ORIGIN_NULL;
        initiation.name = "NUL";
    } else if (byte == 0x7F) {
        initiation.role = OMI_GEOMETRY_ASCII_PROJECTIVE_CLOSURE_WITNESS;
        initiation.name = "DEL";
    } else if (byte <= 0x1F) {
        initiation.role = OMI_GEOMETRY_ASCII_CONTROL_SEED;
        initiation.name = "C0";
    } else if (byte >= 0x20 && byte <= 0x27) {
        initiation.role = OMI_GEOMETRY_ASCII_INDEX_POINTER;
        initiation.name = "INDEX_POINTER";
    } else if (byte >= 0x28 && byte <= 0x2F) {
        initiation.role = OMI_GEOMETRY_ASCII_OPERATIONAL_REFERENCE;
        initiation.name = "OPERATIONAL_REFERENCE";
    } else if (byte >= 0x30 && byte <= 0x39) {
        initiation.role = OMI_GEOMETRY_ASCII_TOPOLOGY_DESCRIPTOR;
        initiation.name = "TOPOLOGY_DESCRIPTOR";
    } else if (byte >= 0x3A && byte <= 0x3F) {
        initiation.role = OMI_GEOMETRY_ASCII_RELATION_PROBE;
        initiation.name = "RELATION_PROBE";
    }

    initiation.witness = geometry_mix_u32(initiation.witness, initiation.byte);
    initiation.witness = geometry_mix_u32(initiation.witness, (uint32_t)initiation.role);
    initiation.witness = geometry_mix_u32(initiation.witness, initiation.band);
    initiation.witness = geometry_mix_u32(initiation.witness, initiation.index);
    return initiation;
}

const char *omi_geometry_vertex_kind_name(omi_geometry_vertex_kind_t kind)
{
    switch (kind) {
        case OMI_GEOMETRY_VERTEX_BRAILLE_DOT:
            return "braille-dot";
        case OMI_GEOMETRY_VERTEX_AEGEAN_FRAME:
            return "aegean-frame";
        case OMI_GEOMETRY_VERTEX_PROJECTION_ADDRESS:
            return "projection-address";
        case OMI_GEOMETRY_VERTEX_CONS_ENDPOINT:
            return "cons-endpoint";
        case OMI_GEOMETRY_VERTEX_EMPTY:
        default:
            return "empty";
    }
}

omi_geometry_vertex_t omi_geometry_vertex_from_projection_address(omi_projection_address_t address)
{
    omi_geometry_vertex_t vertex = {
        .id = geometry_vertex_id(address.observer_address,
                                 (uint8_t)(address.witness & 0xFFu),
                                 1,
                                 OMI_GEOMETRY_VERTEX_PROJECTION_ADDRESS),
        .source = address.observer_address,
        .dot_mask = (uint8_t)(address.witness & 0xFFu),
        .occupied = 1,
        .kind = OMI_GEOMETRY_VERTEX_PROJECTION_ADDRESS
    };
    return vertex;
}

omi_geometry_vertex_t omi_geometry_vertex_from_aegean(omi_aegean_projection_t aegean)
{
    uint8_t coordinate = (uint8_t)(((uint8_t)aegean.projection_row << 4) |
                                  ((uint8_t)aegean.triad_index << 2) |
                                  (uint8_t)aegean.selector_index);
    omi_geometry_vertex_t vertex = {
        .id = geometry_vertex_id(aegean.codepoint,
                                 coordinate,
                                 1,
                                 OMI_GEOMETRY_VERTEX_AEGEAN_FRAME),
        .source = aegean.codepoint,
        .dot_mask = coordinate,
        .occupied = 1,
        .kind = OMI_GEOMETRY_VERTEX_AEGEAN_FRAME
    };
    return vertex;
}

omi_geometry_vertex_set_t omi_geometry_vertices_from_braille(omi_braille_projection_t braille)
{
    omi_geometry_vertex_set_t set = {
        .vertices = {{0}},
        .count = OMI_GEOMETRY_MAX_VERTICES,
        .witness = 2166136261u
    };

    for (uint8_t i = 0; i < OMI_GEOMETRY_MAX_VERTICES; i++) {
        uint8_t occupied = (uint8_t)((braille.dot_mask >> i) & 1u);
        uint8_t dot_mask = (uint8_t)(1u << i);
        set.vertices[i] = (omi_geometry_vertex_t){
            .id = geometry_vertex_id(braille.codepoint,
                                     dot_mask,
                                     occupied,
                                     OMI_GEOMETRY_VERTEX_BRAILLE_DOT),
            .source = braille.codepoint,
            .dot_mask = dot_mask,
            .occupied = occupied,
            .kind = OMI_GEOMETRY_VERTEX_BRAILLE_DOT
        };

        set.witness = geometry_mix_u32(set.witness, set.vertices[i].id);
    }

    return set;
}

omi_geometry_line_t omi_geometry_cons_line(omi_geometry_vertex_t car, omi_geometry_vertex_t cdr)
{
    uint32_t id = 2166136261u;
    id = geometry_mix_u32(id, car.id);
    id = geometry_mix_u32(id, cdr.id);

    omi_geometry_line_t line = {
        .id = id,
        .from = car,
        .to = cdr
    };
    return line;
}

omi_geometry_metric_line_t omi_geometry_metric_line_from_vertices(const omi_geometry_vertex_t *vertices,
                                                                  uint8_t count)
{
    omi_geometry_metric_line_t line = {
        .id = 2166136261u,
        .points = {{0}},
        .count = 0,
        .witness = 2166136261u
    };

    if (vertices == 0) {
        return line;
    }

    uint8_t bounded_count = count > OMI_GEOMETRY_MAX_VERTICES ? OMI_GEOMETRY_MAX_VERTICES : count;
    line.count = bounded_count;

    for (uint8_t i = 0; i < bounded_count; i++) {
        line.points[i] = vertices[i];
        line.id = geometry_mix_u32(line.id, vertices[i].id);
        line.witness = geometry_mix_u32(line.witness, vertices[i].id);
        line.witness = geometry_mix_u32(line.witness, i);
    }

    return line;
}

omi_geometry_polygon_t omi_geometry_polygon_from_lines(const omi_geometry_line_t *lines,
                                                       uint8_t count)
{
    omi_geometry_polygon_t polygon = {
        .id = 2166136261u,
        .lines = {{0}},
        .count = 0,
        .closed = 0,
        .witness = 2166136261u
    };

    if (lines == 0) {
        return polygon;
    }

    uint8_t bounded_count = count > OMI_GEOMETRY_MAX_LINES ? OMI_GEOMETRY_MAX_LINES : count;
    polygon.count = bounded_count;

    for (uint8_t i = 0; i < bounded_count; i++) {
        polygon.lines[i] = lines[i];
        polygon.id = geometry_mix_u32(polygon.id, lines[i].id);
        polygon.witness = geometry_mix_u32(polygon.witness, lines[i].id);
        polygon.witness = geometry_mix_u32(polygon.witness, i);
    }

    if (bounded_count >= 3 &&
        lines[0].from.id == lines[bounded_count - 1].to.id) {
        polygon.closed = 1;
    }

    polygon.witness = geometry_mix_u32(polygon.witness, polygon.closed);
    return polygon;
}

omi_geometry_surface_t omi_geometry_surface_from_polygons(const omi_geometry_polygon_t *polygons,
                                                         uint8_t count)
{
    omi_geometry_surface_t surface = {
        .id = 2166136261u,
        .polygons = {{0}},
        .count = 0,
        .witness = 2166136261u
    };

    if (polygons == 0) {
        return surface;
    }

    uint8_t bounded_count = count > OMI_GEOMETRY_MAX_POLYGONS ? OMI_GEOMETRY_MAX_POLYGONS : count;
    surface.count = bounded_count;

    for (uint8_t i = 0; i < bounded_count; i++) {
        surface.polygons[i] = polygons[i];
        surface.id = geometry_mix_u32(surface.id, polygons[i].id);
        surface.witness = geometry_mix_u32(surface.witness, polygons[i].witness);
        surface.witness = geometry_mix_u32(surface.witness, i);
    }

    return surface;
}

omi_geometry_surface_t omi_geometry_surface_from_lines(const omi_geometry_line_t *lines,
                                                       uint8_t count)
{
    omi_geometry_polygon_t polygon = omi_geometry_polygon_from_lines(lines, count);
    return omi_geometry_surface_from_polygons(&polygon, 1);
}
