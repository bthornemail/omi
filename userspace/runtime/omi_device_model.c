#include "../include/omi_device_model.h"

#include <stdio.h>
#include <string.h>

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

static omi_device_kind_t kind_from_id(const char *id)
{
    if (strcmp(id, "device.display") == 0) {
        return OMI_DEVICE_DISPLAY;
    }
    if (strcmp(id, "device.keyboard") == 0) {
        return OMI_DEVICE_KEYBOARD;
    }
    if (strcmp(id, "device.camera") == 0) {
        return OMI_DEVICE_CAMERA;
    }
    if (strcmp(id, "device.network") == 0) {
        return OMI_DEVICE_NETWORK;
    }
    if (strcmp(id, "device.storage") == 0) {
        return OMI_DEVICE_STORAGE;
    }
    return 0;
}

static void copy_string(char *dst, unsigned dst_size, const char *src)
{
    if (!dst || dst_size == 0u) {
        return;
    }
    dst[0] = '\0';
    if (src) {
        strncat(dst, src, dst_size - 1u);
    }
}

int omi_device_model_parse(const char *text, omi_device_model_t *device)
{
    if (!text || !device) {
        return 0;
    }

    *device = (omi_device_model_t){0};
    if (!extract_after(text, "(FS . ", device->id, sizeof(device->id)) ||
        strncmp(device->id, "device.", 7u) != 0) {
        return 0;
    }

    extract_after(text, "((US . class) . ", device->class_name, sizeof(device->class_name));
    extract_after(text, "((US . kind) . ", device->accepted_kind, sizeof(device->accepted_kind));
    extract_after(text, "((US . role) . ", device->surface_role, sizeof(device->surface_role));
    extract_after(text, "((US . output) . ", device->surface_output, sizeof(device->surface_output));

    const char *event_pos = strstr(text, "(GS . emits)");
    if (event_pos) {
        extract_after(event_pos, "((US . kind) . ", device->emitted_event, sizeof(device->emitted_event));
    }

    device->kind = kind_from_id(device->id);
    device->accepts = contains(text, "(GS . accepts)") ? 1u : 0u;
    device->emits = contains(text, "(GS . emits)") ? 1u : 0u;
    device->surfaces = contains(text, "(GS . surfaces)") ? 1u : 0u;
    device->mutation_law = contains(text, "(GS . law)") ? 1u : 0u;
    device->causal_false = contains(text, "((US . causal) . false)") ? 1u : 0u;

    return device->kind != 0 &&
           device->class_name[0] != '\0' &&
           device->accepted_kind[0] != '\0' &&
           device->surface_role[0] != '\0' &&
           device->surface_output[0] != '\0' &&
           device->accepts &&
           device->emits &&
           device->surfaces &&
           device->mutation_law &&
           device->causal_false;
}

int omi_device_model_accepts_render_trace(const omi_device_model_t *device)
{
    return device &&
           device->kind == OMI_DEVICE_DISPLAY &&
           strcmp(device->accepted_kind, "phase39.render-trace") == 0;
}

int omi_device_model_emit_event(const omi_device_model_t *device, omi_event_model_t *event)
{
    if (!device || !event || device->emitted_event[0] == '\0') {
        return 0;
    }

    *event = (omi_event_model_t){0};
    copy_string(event->id, sizeof(event->id), device->emitted_event);
    copy_string(event->class_name, sizeof(event->class_name), device->class_name);
    event->has_source = 1u;
    event->has_target = 1u;
    event->has_relation = 1u;
    event->has_timing = 1u;
    event->master = 5040u;
    event->public_frame = 240u;
    event->private_sweep = 60u;
    return strncmp(event->id, "event.", 6u) == 0;
}

int omi_device_model_trace(const omi_device_model_t *device, char *out, unsigned out_size)
{
    if (!device || !out || out_size == 0u) {
        return 0;
    }

    int n = snprintf(out,
                     out_size,
                     "DEVICE id=%s class=%s accepts=%s emits=%s surface=%s output=%s causal=false",
                     device->id,
                     device->class_name,
                     device->accepted_kind,
                     device->emitted_event,
                     device->surface_role,
                     device->surface_output);
    return n >= 0 && (unsigned)n < out_size;
}

int omi_device_model_observe_handle(const omi_device_model_t *device,
                                    const omi_user_mount_table_t *table,
                                    const omi_user_model_handle_t *handle)
{
    if (!device || !table || !handle) {
        return 0;
    }
    return handle->expanded == 0u && table->expansion_count == 0u;
}
