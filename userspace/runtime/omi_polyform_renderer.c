#include "../include/omi_polyform_renderer.h"

#include <stdio.h>
#include <string.h>

static unsigned hash_mix(unsigned hash, unsigned value)
{
    hash ^= value;
    hash *= 16777619u;
    return hash;
}

static unsigned hash_text(unsigned hash, const char *text)
{
    for (const unsigned char *p = (const unsigned char *)text; p && *p; p++) {
        hash = hash_mix(hash, (unsigned)*p);
    }
    return hash;
}

static int starts_with(const char *text, const char *prefix)
{
    return text && strncmp(text, prefix, strlen(prefix)) == 0;
}

static const char *primitive_trace(const omi_projection_view_t *projection)
{
    if (starts_with(projection->handle_id, "world.")) {
        switch (projection->requested_depth) {
        case OMI_DEPTH_FS_GS:
            return "world.objects=trailer,bicycle,cargo placeholders=relations";
        case OMI_DEPTH_FS_GS_RS:
            return "world.objects=trailer,bicycle,cargo relations=hitch-link.001,load-support.001,rolling.001";
        case OMI_DEPTH_FS_GS_RS_US:
            return "world.placeholders=trailer,bicycle,cargo relation-units=source,target,function";
        case OMI_DEPTH_FULL_TRACE:
            return "world.full-trace objects=trailer,bicycle,cargo labels=form,function,relations,render";
        default:
            return 0;
        }
    }

    if (strcmp(projection->handle_id, "model.trailer.wike-ebike-cargo") == 0) {
        switch (projection->requested_depth) {
        case OMI_DEPTH_FS_GS:
            return "primitives=rectangular-container,circle,circle,bent-line output=box.two-wheels.tow-arm";
        case OMI_DEPTH_FS_GS_RS:
            return "primitives=rectangle,line,circle,bent-line output=panels.frame.wheels.tow-arm";
        case OMI_DEPTH_FS_GS_RS_US:
            return "primitives=line,point-joint,rectangle,circle,triangle,bent-line output=rails.latches.reflectors.hinges.spokes";
        case OMI_DEPTH_FULL_TRACE:
            return "primitives=rectangular-container,rectangle,line,circle,triangle,point-joint,bent-line labels=form,function,render,carrier";
        default:
            return 0;
        }
    }

    switch (projection->requested_depth) {
    case OMI_DEPTH_FS_GS:
        return "primitives=rectangular-container output=generic.object.shell";
    case OMI_DEPTH_FS_GS_RS:
        return "primitives=rectangular-container,rectangle output=generic.parts";
    case OMI_DEPTH_FS_GS_RS_US:
        return "primitives=rectangular-container,rectangle,line output=generic.units";
    case OMI_DEPTH_FULL_TRACE:
        return "primitives=rectangular-container,rectangle,line labels=form,function,receipt";
    default:
        return 0;
    }
}

static int fill_render(const omi_projection_view_t *projection, omi_render_view_t *render)
{
    const char *trace = primitive_trace(projection);
    if (!trace) {
        return 0;
    }

    *render = (omi_render_view_t){0};
    render->handle_id = projection->handle_id;
    render->depth_name = projection->depth_name;
    render->expanded = 0u;

    int trace_len = snprintf(render->trace,
                             sizeof(render->trace),
                             "POLYFORM_RENDER id=%s depth=%s fs=%u gs=%u rs=%u us=%u %s",
                             projection->handle_id,
                             projection->depth_name,
                             projection->fs_count,
                             projection->gs_count,
                             projection->rs_count,
                             projection->us_count,
                             trace);
    int svg_len = snprintf(render->svg,
                           sizeof(render->svg),
                           "<svg viewBox=\"0 0 240 60\" data-omi-id=\"%s\" data-depth=\"%s\"><desc>%s</desc></svg>",
                           projection->handle_id,
                           projection->depth_name,
                           trace);
    if (trace_len < 0 || svg_len < 0 ||
        (unsigned)trace_len >= sizeof(render->trace) ||
        (unsigned)svg_len >= sizeof(render->svg)) {
        *render = (omi_render_view_t){0};
        return 0;
    }

    unsigned hash = 2166136261u;
    hash = hash_text(hash, render->trace);
    hash = hash_text(hash, render->svg);
    render->receipt_hash = hash;
    return 1;
}

int omi_polyform_render_projection(const omi_projection_view_t *projection,
                                   omi_render_view_t *render)
{
    if (!projection || !render || !projection->handle_id || !projection->depth_name) {
        return 0;
    }

    return fill_render(projection, render);
}

int omi_polyform_render_handle(const omi_user_model_handle_t *handle,
                               omi_projection_depth_t depth,
                               omi_render_view_t *render)
{
    if (!handle || !render) {
        return 0;
    }

    omi_projection_view_t projection;
    if (!omi_lazy_project_handle(handle, depth, &projection)) {
        return 0;
    }

    return omi_polyform_render_projection(&projection, render);
}

int omi_polyform_render_vfs_path(const omi_user_mount_table_t *table,
                                 const omi_model_overlay_t *overlay,
                                 const char *path,
                                 omi_render_view_t *render)
{
    if (!table || !path || !render) {
        return 0;
    }

    omi_vfs_result_t result;
    if (!omi_model_vfs_resolve_with_overlay(table, overlay, path, &result)) {
        return 0;
    }

    if (result.kind == OMI_VFS_NODE_PROJECTION) {
        return omi_polyform_render_projection(&result.projection, render);
    }

    if (result.kind == OMI_VFS_NODE_HANDLE) {
        return omi_polyform_render_handle(result.handle, OMI_DEPTH_FS_GS, render);
    }

    return 0;
}

int omi_polyform_render_carrier_object(const omi_user_mount_table_t *table,
                                       const omi_model_overlay_t *overlay,
                                       const omi_aztec_object_receipt_t *aztec,
                                       omi_projection_depth_t depth,
                                       omi_render_view_t *render)
{
    if (!table || !aztec || !render) {
        return 0;
    }

    omi_aztec_object_receipt_t receipt;
    if (!omi_decode_aztec_object(aztec, &receipt)) {
        return 0;
    }

    const omi_user_model_handle_t *handle = omi_user_init_find_handle(table, receipt.object_id);
    if (!handle) {
        handle = omi_model_overlay_find_handle(overlay, receipt.object_id);
    }
    if (!handle) {
        return 0;
    }

    return omi_polyform_render_handle(handle, depth, render);
}
