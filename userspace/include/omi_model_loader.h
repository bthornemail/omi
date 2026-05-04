#ifndef OMI_MODEL_LOADER_H
#define OMI_MODEL_LOADER_H

#include "omi_user_init.h"

#define OMI_MODEL_OVERLAY_MAX 8u
#define OMI_MODEL_ID_MAX 96u
#define OMI_MODEL_URI_MAX 128u

typedef struct {
    omi_user_model_handle_t handle;
    char id_storage[OMI_MODEL_ID_MAX];
    char uri_storage[OMI_MODEL_URI_MAX];
    unsigned receipt_hash;
} omi_overlay_model_entry_t;

typedef struct {
    omi_overlay_model_entry_t entries[OMI_MODEL_OVERLAY_MAX];
    unsigned count;
    unsigned append_count;
} omi_model_overlay_t;

typedef struct {
    unsigned fs_count;
    unsigned gs_count;
    unsigned rs_count;
    unsigned us_count;
    unsigned receipt_hash;
    const char *model_id;
} omi_model_load_result_t;

void omi_model_overlay_init(omi_model_overlay_t *overlay);
int omi_model_loader_load_text(omi_model_overlay_t *overlay,
                               const char *text,
                               omi_model_load_result_t *result);
const omi_user_model_handle_t *omi_model_overlay_find_handle(const omi_model_overlay_t *overlay,
                                                            const char *id);

#endif
