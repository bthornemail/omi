#ifndef OMI_LAZY_EVAL_H
#define OMI_LAZY_EVAL_H

#include "omi_user_init.h"

typedef enum {
    OMI_DEPTH_FS_GS = 1,
    OMI_DEPTH_FS_GS_RS = 2,
    OMI_DEPTH_FS_GS_RS_US = 3,
    OMI_DEPTH_FULL_TRACE = 4
} omi_projection_depth_t;

typedef struct {
    const char *handle_id;
    const char *uri;
    omi_projection_depth_t requested_depth;
    const char *depth_name;
    unsigned fs_available;
    unsigned gs_available;
    unsigned rs_available;
    unsigned us_available;
    unsigned full_trace_available;
    unsigned fs_count;
    unsigned gs_count;
    unsigned rs_count;
    unsigned us_count;
    unsigned expanded;
} omi_projection_view_t;

int omi_lazy_project_handle(const omi_user_model_handle_t *handle,
                            omi_projection_depth_t depth,
                            omi_projection_view_t *view);

#endif
