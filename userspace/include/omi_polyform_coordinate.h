#ifndef OMI_POLYFORM_COORDINATE_H
#define OMI_POLYFORM_COORDINATE_H

#define OMI_POLYFORM_PATH_MAX 192u
#define OMI_POLYFORM_FIELD_MAX 64u

#define OMI_POLYFORM_MASTER_5040 5040u
#define OMI_POLYFORM_PUBLIC_240 240u
#define OMI_POLYFORM_LOCAL_60 60u
#define OMI_POLYFORM_OPERATOR_16 16u
#define OMI_POLYFORM_FANO_7 7u
#define OMI_POLYFORM_BYTE_8 8u

typedef struct {
    unsigned master_5040;
    unsigned public_240;
    unsigned local_60;
    unsigned operator_16;
    unsigned fano_7;
    unsigned byte_8;
} omi_polyform_timing_t;

typedef struct {
    char omi_path[OMI_POLYFORM_PATH_MAX];
    char fs[OMI_POLYFORM_FIELD_MAX];
    char gs[OMI_POLYFORM_FIELD_MAX];
    char rs[OMI_POLYFORM_FIELD_MAX];
    char us[OMI_POLYFORM_FIELD_MAX];
    unsigned x;
    unsigned y;
    unsigned z;
    unsigned w;
    char basis[OMI_POLYFORM_FIELD_MAX];
    char degree[OMI_POLYFORM_FIELD_MAX];
    char sign[OMI_POLYFORM_FIELD_MAX];
    char depth[OMI_POLYFORM_FIELD_MAX];
    omi_polyform_timing_t timing;
    unsigned receipt_hash;
} omi_polyform_coordinate_t;

typedef struct {
    double car;
    double cdr;
    double cons;
    double tan_theta;
    double cos_theta;
    double sin_theta;
} omi_cons_geometry_t;

typedef struct {
    int delta_x;
    int delta_y;
    int delta_z;
    int delta_w;
    unsigned distance_squared;
    unsigned distance_class;
    unsigned sexagesimal_slot;
    unsigned orientation4;
    unsigned public_frame240;
    unsigned receipt_hash;
    char sexagesimal_readout[16];
} omi_sexagesimal_closure_t;

int omi_polyform_coordinate_validate_timing(const omi_polyform_timing_t *timing);
int omi_polyform_coordinate_from_path(const char *path,
                                      const char *basis,
                                      const char *degree,
                                      const char *sign,
                                      const char *depth,
                                      omi_polyform_coordinate_t *out);
int omi_polyform_coordinate_apply_overlay(const omi_polyform_coordinate_t *base,
                                          const char *color,
                                          const char *mesh,
                                          const char *texture,
                                          const char *typecast,
                                          omi_polyform_coordinate_t *out);
int omi_polyform_coordinate_cons_geometry(double car,
                                          double cdr,
                                          omi_cons_geometry_t *out);
int omi_polyform_coordinate_closure_from_points(const omi_polyform_coordinate_t *car,
                                                const omi_polyform_coordinate_t *cdr,
                                                omi_sexagesimal_closure_t *out);
int omi_polyform_coordinate_validate_closure(const omi_sexagesimal_closure_t *closure);
int omi_polyform_coordinate_closure_reverse(const omi_sexagesimal_closure_t *closure,
                                            omi_sexagesimal_closure_t *out);

#endif
