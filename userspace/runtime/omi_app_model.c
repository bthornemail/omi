#include "../include/omi_app_model.h"

#include <stdio.h>
#include <string.h>

static const char trailer_render_near_intent[] =
    "((FS . intent.render-near)"
    " ((GS . accepts)((RS . model-class)((US . value) . any)))"
    " ((GS . request)((RS . projection)((US . depth) . near)((US . surfaces) . render texture)))"
    " ((GS . constraints)((RS . evaluation)((US . mode) . lazy)((US . mutation) . forbidden)))"
    " ((GS . output)((RS . event)((US . kind) . event.render-request)((US . authority) . projection-only))))";

static const char world_render_middle_intent[] =
    "((FS . intent.render-middle)"
    " ((GS . accepts)((RS . model-class)((US . value) . any)))"
    " ((GS . request)((RS . projection)((US . depth) . middle)((US . surfaces) . render)))"
    " ((GS . constraints)((RS . evaluation)((US . mode) . lazy)((US . mutation) . forbidden)))"
    " ((GS . output)((RS . event)((US . kind) . event.render-request)((US . authority) . projection-only))))";

static const char aluminum_texture[] =
    "((FS . texture.aluminum-panel)"
    " ((GS . target)((RS . surface)((US . applies-to) . panel.left panel.right panel.front panel.floor)))"
    " ((GS . material)((RS . class)((US . value) . aluminum-composite)((US . reflectance) . medium)((US . finish) . matte)))"
    " ((GS . pattern)((RS . basis)((US . primitive) . flat-fill)((US . detail) . subtle-brushed-lines)))"
    " ((GS . resolution)((RS . render-depth)((US . far) . flat)((US . middle) . panel-tone)((US . near) . brushed-pattern)((US . inspect) . material-record))))";

static const char smith_diagram[] =
    "((FS . diagram.smith-chart)"
    " ((GS . identity)((RS . template)((US . class) . diagram)((US . authority) . projection-template)))"
    " ((GS . accepts)((RS . input)((US . model-class) . network-transform)((US . projection-depth) . middle)))"
    " ((GS . layout)((RS . grammar)((US . basis) . svg-polyform)((US . coordinate-system) . normalized-impedance)((US . primitives) . arc circle coordinate point)))"
    " ((GS . timing)((RS . global-public)((US . global) . 360)((US . public-frame) . 240)))"
    " ((GS . output)((RS . projection)((US . kind) . diagram-trace)((US . causal) . false))))";

static int contains(const char *text, const char *needle)
{
    return text && strstr(text, needle) != 0;
}

static int extract_after(const char *text, const char *prefix, char *out, unsigned out_size)
{
    const char *p = strstr(text, prefix);
    if (!p || out_size == 0u) {
        return 0;
    }
    p += strlen(prefix);
    unsigned i = 0;
    while (*p && *p != ')' && *p != '(' && *p != '\n' && *p != '\r' && *p != ' ' && *p != '\t') {
        if (i + 1u < out_size) {
            out[i++] = *p;
        }
        p++;
    }
    out[i] = '\0';
    return i != 0u;
}

static unsigned hash_text(unsigned hash, const char *text)
{
    for (const unsigned char *p = (const unsigned char *)text; p && *p; p++) {
        hash ^= (unsigned)*p;
        hash *= 16777619u;
    }
    return hash;
}

static void set_prefixed(char *out, unsigned out_size, const char *prefix, const char *suffix)
{
    if (!out || out_size == 0u) {
        return;
    }
    out[0] = '\0';
    strncat(out, prefix, out_size - 1u);
    strncat(out, suffix, out_size - strlen(out) - 1u);
}

static omi_projection_depth_t app_depth(const omi_app_model_t *app)
{
    if (strcmp(app->default_projection, "inspect") == 0) {
        return OMI_DEPTH_FULL_TRACE;
    }
    if (strcmp(app->default_projection, "middle") == 0) {
        return OMI_DEPTH_FS_GS_RS;
    }
    if (strcmp(app->default_projection, "near") == 0) {
        return OMI_DEPTH_FS_GS_RS_US;
    }
    return OMI_DEPTH_FS_GS;
}

int omi_app_model_parse(const char *text, omi_app_model_t *app)
{
    if (!text || !app) {
        return 0;
    }

    *app = (omi_app_model_t){0};
    if (!extract_after(text, "(FS . ", app->id, sizeof(app->id)) ||
        strncmp(app->id, "app.", 4u) != 0) {
        return 0;
    }

    extract_after(text, "((US . class) . ", app->class_name, sizeof(app->class_name));
    if (!extract_after(text, "((US . id) . model.", app->accepted_id, sizeof(app->accepted_id))) {
        if (extract_after(text, "((US . id) . world.", app->accepted_id, sizeof(app->accepted_id))) {
            char tmp[OMI_APP_FIELD_MAX];
            set_prefixed(tmp, sizeof(tmp), "world.", app->accepted_id);
            set_prefixed(app->accepted_id, sizeof(app->accepted_id), "", tmp);
        }
    } else {
        char tmp[OMI_APP_FIELD_MAX];
        set_prefixed(tmp, sizeof(tmp), "model.", app->accepted_id);
        set_prefixed(app->accepted_id, sizeof(app->accepted_id), "", tmp);
    }
    extract_after(text, "((US . id) . intent.", app->default_intent, sizeof(app->default_intent));
    if (app->default_intent[0] != '\0') {
        char tmp[OMI_APP_FIELD_MAX];
        set_prefixed(tmp, sizeof(tmp), "intent.", app->default_intent);
        set_prefixed(app->default_intent, sizeof(app->default_intent), "", tmp);
    }
    extract_after(text, "((US . depth) . ", app->default_projection, sizeof(app->default_projection));

    app->has_surfaces = contains(text, "(GS . surfaces)") ? 1u : 0u;
    app->has_requests = contains(text, "(GS . requests)") ? 1u : 0u;
    app->mutation_forbidden = contains(text, "((US . value) . forbidden)") ? 1u : 0u;
    app->causal_false = contains(text, "((US . causal) . false)") ? 1u : 0u;

    return app->class_name[0] != '\0' &&
           app->accepted_id[0] != '\0' &&
           app->default_intent[0] != '\0' &&
           app->default_projection[0] != '\0' &&
           app->has_surfaces &&
           app->has_requests &&
           app->mutation_forbidden &&
           app->causal_false;
}

const omi_user_model_handle_t *omi_app_model_select_handle(const omi_app_model_t *app,
                                                          const omi_user_mount_table_t *table,
                                                          const omi_model_overlay_t *overlay)
{
    if (!app || !table) {
        return 0;
    }
    const omi_user_model_handle_t *handle = omi_user_init_find_handle(table, app->accepted_id);
    if (!handle) {
        handle = omi_model_overlay_find_handle(overlay, app->accepted_id);
    }
    return handle;
}

int omi_app_model_request(const omi_app_model_t *app,
                          const omi_user_mount_table_t *table,
                          const omi_model_overlay_t *overlay,
                          omi_app_request_kind_t kind,
                          omi_app_request_result_t *result)
{
    if (!app || !table || !result) {
        return 0;
    }

    const omi_user_model_handle_t *handle = omi_app_model_select_handle(app, table, overlay);
    if (!handle) {
        return 0;
    }

    *result = (omi_app_request_result_t){0};
    result->app_id = app->id;
    result->handle_id = handle->id;
    result->request_kind = kind;

    omi_projection_depth_t depth = app_depth(app);
    if (strcmp(app->id, "app.trailer-inspector") == 0 && kind == OMI_APP_REQUEST_RENDER) {
        depth = OMI_DEPTH_FS_GS_RS_US;
    }
    if (strcmp(app->id, "app.world-browser") == 0) {
        depth = OMI_DEPTH_FS_GS_RS;
    }

    if (!omi_lazy_project_handle(handle, depth, &result->projection)) {
        return 0;
    }

    const char *intent_text = strcmp(app->id, "app.world-browser") == 0 ?
        world_render_middle_intent : trailer_render_near_intent;
    if (!omi_intent_model_parse(intent_text, &result->intent) ||
        !omi_intent_model_to_event(&result->intent, handle->id, &result->event)) {
        return 0;
    }

    omi_texture_model_t texture;
    if (!omi_texture_model_parse(aluminum_texture, &texture) ||
        !omi_texture_project(&texture, &result->projection, &result->texture)) {
        return 0;
    }

    omi_diagram_template_t diagram;
    if (!omi_diagram_template_parse(smith_diagram, &diagram) ||
        !omi_diagram_template_emit(&diagram, &result->projection, &result->diagram)) {
        return 0;
    }

    if (!omi_polyform_render_projection(&result->projection, &result->render)) {
        return 0;
    }

    int n = snprintf(result->trace,
                     sizeof(result->trace),
                     "APP_REQUEST app=%s handle=%s kind=%u intent=%s event=%s depth=%s render_hash=%u texture_hash=%u diagram_hash=%u",
                     app->id,
                     handle->id,
                     (unsigned)kind,
                     result->intent.id,
                     result->event.id,
                     result->projection.depth_name,
                     result->render.receipt_hash,
                     result->texture.receipt_hash,
                     result->diagram.receipt_hash);
    if (n < 0 || (unsigned)n >= sizeof(result->trace)) {
        *result = (omi_app_request_result_t){0};
        return 0;
    }
    result->receipt_hash = hash_text(2166136261u, result->trace);
    return result->receipt_hash != 0u;
}

int omi_app_model_trace(const omi_app_model_t *app, char *out, unsigned out_size)
{
    if (!app || !out || out_size == 0u) {
        return 0;
    }
    int n = snprintf(out, out_size, "APP id=%s accepts=%s default_intent=%s projection=%s causal=false mutation=forbidden",
                     app->id,
                     app->accepted_id,
                     app->default_intent,
                     app->default_projection);
    return n >= 0 && (unsigned)n < out_size;
}
