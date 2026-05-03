#include "../include/omi_lazy_eval.h"

static const char *depth_name(omi_projection_depth_t depth)
{
    switch (depth) {
    case OMI_DEPTH_FS_GS:
        return "FS.GS";
    case OMI_DEPTH_FS_GS_RS:
        return "FS.GS.RS";
    case OMI_DEPTH_FS_GS_RS_US:
        return "FS.GS.RS.US";
    case OMI_DEPTH_FULL_TRACE:
        return "full-trace";
    default:
        return 0;
    }
}

int omi_lazy_project_handle(const omi_user_model_handle_t *handle,
                            omi_projection_depth_t depth,
                            omi_projection_view_t *view)
{
    const char *name = depth_name(depth);
    if (!handle || !view || !name) {
        return 0;
    }

    *view = (omi_projection_view_t){
        .handle_id = handle->id,
        .uri = handle->uri,
        .requested_depth = depth,
        .depth_name = name,
        .fs_available = 1u,
        .gs_available = 1u,
        .rs_available = depth >= OMI_DEPTH_FS_GS_RS ? 1u : 0u,
        .us_available = depth >= OMI_DEPTH_FS_GS_RS_US ? 1u : 0u,
        .full_trace_available = depth == OMI_DEPTH_FULL_TRACE ? 1u : 0u,
        .fs_count = handle->fs_count,
        .gs_count = handle->gs_count,
        .rs_count = handle->rs_count,
        .us_count = handle->us_count,
        .expanded = 0u,
    };

    return 1;
}
