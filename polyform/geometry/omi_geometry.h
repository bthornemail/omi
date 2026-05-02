#ifndef OMI_GEOMETRY_H
#define OMI_GEOMETRY_H

#include "../encoding/aegean.h"
#include "../encoding/braille.h"
#include "../encoding/projection_address.h"
#include <stdint.h>

#define OMI_GEOMETRY_MAX_VERTICES 8u
#define OMI_GEOMETRY_MAX_LINES 8u
#define OMI_GEOMETRY_MAX_POLYGONS 8u

typedef enum {
    OMI_GEOMETRY_ASCII_OTHER = 0,
    OMI_GEOMETRY_ASCII_CONTROL_SEED,
    OMI_GEOMETRY_ASCII_PROJECTIVE_ORIGIN_NULL,
    OMI_GEOMETRY_ASCII_PROJECTIVE_CLOSURE_WITNESS,
    OMI_GEOMETRY_ASCII_INDEX_POINTER,
    OMI_GEOMETRY_ASCII_OPERATIONAL_REFERENCE,
    OMI_GEOMETRY_ASCII_TOPOLOGY_DESCRIPTOR,
    OMI_GEOMETRY_ASCII_RELATION_PROBE
} omi_geometry_ascii_role_t;

typedef struct {
    uint8_t byte;
    omi_geometry_ascii_role_t role;
    uint8_t band;
    uint8_t index;
    const char *name;
    uint32_t witness;
} omi_geometry_ascii_initiation_t;

typedef enum {
    OMI_GEOMETRY_VERTEX_EMPTY = 0,
    OMI_GEOMETRY_VERTEX_BRAILLE_DOT,
    OMI_GEOMETRY_VERTEX_AEGEAN_FRAME,
    OMI_GEOMETRY_VERTEX_PROJECTION_ADDRESS,
    OMI_GEOMETRY_VERTEX_CONS_ENDPOINT
} omi_geometry_vertex_kind_t;

typedef struct {
    uint32_t id;
    uint32_t source;
    uint8_t dot_mask;
    uint8_t occupied;
    omi_geometry_vertex_kind_t kind;
} omi_geometry_vertex_t;

typedef struct {
    uint32_t id;
    omi_geometry_vertex_t from;
    omi_geometry_vertex_t to;
} omi_geometry_line_t;

typedef struct {
    uint32_t id;
    omi_geometry_vertex_t points[OMI_GEOMETRY_MAX_VERTICES];
    uint8_t count;
    uint32_t witness;
} omi_geometry_metric_line_t;

typedef struct {
    uint32_t id;
    omi_geometry_line_t lines[OMI_GEOMETRY_MAX_LINES];
    uint8_t count;
    uint8_t closed;
    uint32_t witness;
} omi_geometry_polygon_t;

typedef struct {
    uint32_t id;
    omi_geometry_polygon_t polygons[OMI_GEOMETRY_MAX_POLYGONS];
    uint8_t count;
    uint32_t witness;
} omi_geometry_surface_t;

typedef struct {
    omi_geometry_vertex_t vertices[OMI_GEOMETRY_MAX_VERTICES];
    uint8_t count;
    uint32_t witness;
} omi_geometry_vertex_set_t;

const char *omi_geometry_ascii_role_name(omi_geometry_ascii_role_t role);
omi_geometry_ascii_initiation_t omi_geometry_ascii_initiation(uint8_t byte);
const char *omi_geometry_vertex_kind_name(omi_geometry_vertex_kind_t kind);
omi_geometry_vertex_t omi_geometry_vertex_from_projection_address(omi_projection_address_t address);
omi_geometry_vertex_t omi_geometry_vertex_from_aegean(omi_aegean_projection_t aegean);
omi_geometry_vertex_set_t omi_geometry_vertices_from_braille(omi_braille_projection_t braille);
omi_geometry_line_t omi_geometry_cons_line(omi_geometry_vertex_t car, omi_geometry_vertex_t cdr);
omi_geometry_metric_line_t omi_geometry_metric_line_from_vertices(const omi_geometry_vertex_t *vertices,
                                                                  uint8_t count);
omi_geometry_polygon_t omi_geometry_polygon_from_lines(const omi_geometry_line_t *lines,
                                                       uint8_t count);
omi_geometry_surface_t omi_geometry_surface_from_polygons(const omi_geometry_polygon_t *polygons,
                                                         uint8_t count);
omi_geometry_surface_t omi_geometry_surface_from_lines(const omi_geometry_line_t *lines,
                                                       uint8_t count);

#endif
