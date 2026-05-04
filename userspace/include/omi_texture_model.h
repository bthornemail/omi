#ifndef OMI_TEXTURE_MODEL_H
#define OMI_TEXTURE_MODEL_H

#include "omi_lazy_eval.h"

#define OMI_TEXTURE_ID_MAX 64u
#define OMI_TEXTURE_TRACE_MAX 256u

typedef struct {
    char id[OMI_TEXTURE_ID_MAX];
    char material[64];
    char primitive[64];
    unsigned target;
    unsigned resolution;
} omi_texture_model_t;

typedef struct {
    const char *texture_id;
    const char *handle_id;
    const char *depth_name;
    char trace[OMI_TEXTURE_TRACE_MAX];
    unsigned receipt_hash;
} omi_texture_projection_t;

int omi_texture_model_parse(const char *text, omi_texture_model_t *texture);
int omi_texture_project(const omi_texture_model_t *texture,
                        const omi_projection_view_t *projection,
                        omi_texture_projection_t *out);

#endif
