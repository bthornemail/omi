#ifndef OMI_DEVICE_MODEL_H
#define OMI_DEVICE_MODEL_H

#include "omi_event_model.h"
#include "omi_user_init.h"

#define OMI_DEVICE_ID_MAX 64u
#define OMI_DEVICE_FIELD_MAX 96u
#define OMI_DEVICE_TRACE_MAX 256u

typedef enum {
    OMI_DEVICE_DISPLAY = 1,
    OMI_DEVICE_KEYBOARD = 2,
    OMI_DEVICE_CAMERA = 3,
    OMI_DEVICE_NETWORK = 4,
    OMI_DEVICE_STORAGE = 5
} omi_device_kind_t;

typedef struct {
    char id[OMI_DEVICE_ID_MAX];
    char class_name[OMI_DEVICE_FIELD_MAX];
    char accepted_kind[OMI_DEVICE_FIELD_MAX];
    char emitted_event[OMI_DEVICE_FIELD_MAX];
    char surface_role[OMI_DEVICE_FIELD_MAX];
    char surface_output[OMI_DEVICE_FIELD_MAX];
    omi_device_kind_t kind;
    unsigned accepts;
    unsigned emits;
    unsigned surfaces;
    unsigned mutation_law;
    unsigned causal_false;
} omi_device_model_t;

int omi_device_model_parse(const char *text, omi_device_model_t *device);
int omi_device_model_accepts_render_trace(const omi_device_model_t *device);
int omi_device_model_emit_event(const omi_device_model_t *device, omi_event_model_t *event);
int omi_device_model_trace(const omi_device_model_t *device, char *out, unsigned out_size);
int omi_device_model_observe_handle(const omi_device_model_t *device,
                                    const omi_user_mount_table_t *table,
                                    const omi_user_model_handle_t *handle);

#endif
