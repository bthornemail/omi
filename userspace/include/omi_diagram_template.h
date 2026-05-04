#ifndef OMI_DIAGRAM_TEMPLATE_H
#define OMI_DIAGRAM_TEMPLATE_H

#include "omi_lazy_eval.h"

#define OMI_DIAGRAM_ID_MAX 80u
#define OMI_DIAGRAM_TRACE_MAX 320u

typedef struct {
    char id[OMI_DIAGRAM_ID_MAX];
    char primitives[128];
    unsigned accepts;
    unsigned layout;
    unsigned timing;
    unsigned output;
} omi_diagram_template_t;

typedef struct {
    const char *template_id;
    const char *handle_id;
    const char *depth_name;
    char trace[OMI_DIAGRAM_TRACE_MAX];
    unsigned receipt_hash;
} omi_diagram_trace_t;

int omi_diagram_template_parse(const char *text, omi_diagram_template_t *template_model);
int omi_diagram_template_emit(const omi_diagram_template_t *template_model,
                              const omi_projection_view_t *projection,
                              omi_diagram_trace_t *out);

#endif
