#ifndef OMI_POLYFORM_RENDERER_H
#define OMI_POLYFORM_RENDERER_H

#include "omi_carrier_decode.h"
#include "omi_model_vfs.h"

#define OMI_RENDER_TRACE_MAX 384u
#define OMI_RENDER_SVG_MAX 512u

typedef struct {
    const char *handle_id;
    const char *depth_name;
    unsigned receipt_hash;
    unsigned expanded;
    char trace[OMI_RENDER_TRACE_MAX];
    char svg[OMI_RENDER_SVG_MAX];
} omi_render_view_t;

int omi_polyform_render_projection(const omi_projection_view_t *projection,
                                   omi_render_view_t *render);
int omi_polyform_render_handle(const omi_user_model_handle_t *handle,
                               omi_projection_depth_t depth,
                               omi_render_view_t *render);
int omi_polyform_render_vfs_path(const omi_user_mount_table_t *table,
                                 const omi_model_overlay_t *overlay,
                                 const char *path,
                                 omi_render_view_t *render);
int omi_polyform_render_carrier_object(const omi_user_mount_table_t *table,
                                       const omi_model_overlay_t *overlay,
                                       const omi_aztec_object_receipt_t *aztec,
                                       omi_projection_depth_t depth,
                                       omi_render_view_t *render);

#endif
