#ifndef OMI_SCOPE_MULTIGRAPH_H
#define OMI_SCOPE_MULTIGRAPH_H

#include "omi_polyform_coordinate.h"

typedef enum {
    OMI_SCOPE_VISIBILITY_PUBLIC = 0,
    OMI_SCOPE_VISIBILITY_PRIVATE = 1,
    OMI_SCOPE_VISIBILITY_PROTECTED = 2
} omi_scope_visibility_t;

typedef enum {
    OMI_SCOPE_LOCATION_GLOBAL = 0,
    OMI_SCOPE_LOCATION_LOCAL = 1,
    OMI_SCOPE_LOCATION_REMOTE = 2
} omi_scope_location_t;

typedef enum {
    OMI_SCOPE_CARRIER_NONE = 255,
    OMI_SCOPE_CARRIER_CODE16K = 0,
    OMI_SCOPE_CARRIER_AZTEC = 1,
    OMI_SCOPE_CARRIER_MAXICODE = 2,
    OMI_SCOPE_CARRIER_BEECODE = 3
} omi_scope_carrier_t;

typedef enum {
    OMI_SCOPE_EDGE_CANONICAL = 1,
    OMI_SCOPE_EDGE_BARCODE = 2
} omi_scope_edge_kind_t;

typedef struct {
    unsigned from_coord_receipt;
    unsigned to_coord_receipt;
    unsigned closure_receipt;
    unsigned edge_kind;
    unsigned visibility;
    unsigned location;
    unsigned carrier;
    unsigned orientation4;
    unsigned sexagesimal_slot;
    unsigned public_frame240;
    unsigned receipt;
    char scope_class[32];
} omi_multigraph_edge_t;

int omi_scope_multigraph_encode_scope(unsigned visibility,
                                      unsigned location,
                                      char *out,
                                      unsigned out_size);
int omi_scope_multigraph_decode_scope(const char *scope_class,
                                      unsigned *visibility,
                                      unsigned *location);
int omi_scope_multigraph_canonical_edge(const omi_polyform_coordinate_t *from_coord,
                                        const omi_polyform_coordinate_t *to_coord,
                                        const omi_sexagesimal_closure_t *closure,
                                        unsigned visibility,
                                        unsigned location,
                                        omi_multigraph_edge_t *out);
int omi_scope_multigraph_barcode_edge(const omi_polyform_coordinate_t *from_coord,
                                      const omi_polyform_coordinate_t *to_coord,
                                      const omi_sexagesimal_closure_t *closure,
                                      unsigned visibility,
                                      unsigned location,
                                      unsigned carrier,
                                      omi_multigraph_edge_t *out);
int omi_scope_multigraph_validate_edge(const omi_multigraph_edge_t *edge);

#endif
