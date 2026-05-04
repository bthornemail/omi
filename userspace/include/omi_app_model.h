#ifndef OMI_APP_MODEL_H
#define OMI_APP_MODEL_H

#include "omi_diagram_template.h"
#include "omi_intent_model.h"
#include "omi_model_vfs.h"
#include "omi_polyform_renderer.h"
#include "omi_texture_model.h"

#define OMI_APP_ID_MAX 64u
#define OMI_APP_FIELD_MAX 96u
#define OMI_APP_TRACE_MAX 384u

typedef enum {
    OMI_APP_REQUEST_RENDER = 1,
    OMI_APP_REQUEST_PROJECTION = 2,
    OMI_APP_REQUEST_EVENT = 3,
    OMI_APP_REQUEST_INTENT = 4,
    OMI_APP_REQUEST_TEXTURE = 5,
    OMI_APP_REQUEST_DIAGRAM = 6
} omi_app_request_kind_t;

typedef struct {
    char id[OMI_APP_ID_MAX];
    char class_name[OMI_APP_FIELD_MAX];
    char accepted_id[OMI_APP_FIELD_MAX];
    char default_intent[OMI_APP_FIELD_MAX];
    char default_projection[32];
    unsigned has_surfaces;
    unsigned has_requests;
    unsigned mutation_forbidden;
    unsigned causal_false;
} omi_app_model_t;

typedef struct {
    const char *app_id;
    const char *handle_id;
    omi_app_request_kind_t request_kind;
    omi_projection_view_t projection;
    omi_event_model_t event;
    omi_intent_model_t intent;
    omi_texture_projection_t texture;
    omi_diagram_trace_t diagram;
    omi_render_view_t render;
    char trace[OMI_APP_TRACE_MAX];
    unsigned receipt_hash;
} omi_app_request_result_t;

int omi_app_model_parse(const char *text, omi_app_model_t *app);
const omi_user_model_handle_t *omi_app_model_select_handle(const omi_app_model_t *app,
                                                          const omi_user_mount_table_t *table,
                                                          const omi_model_overlay_t *overlay);
int omi_app_model_request(const omi_app_model_t *app,
                          const omi_user_mount_table_t *table,
                          const omi_model_overlay_t *overlay,
                          omi_app_request_kind_t kind,
                          omi_app_request_result_t *result);
int omi_app_model_trace(const omi_app_model_t *app, char *out, unsigned out_size);

#endif
