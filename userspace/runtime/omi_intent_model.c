#include "../include/omi_intent_model.h"

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

int omi_intent_model_parse(const char *text, omi_intent_model_t *intent)
{
    if (!text || !intent) {
        return 0;
    }

    *intent = (omi_intent_model_t){0};
    if (!extract_after(text, "(FS . ", intent->id, sizeof(intent->id)) ||
        strncmp(intent->id, "intent.", 7u) != 0) {
        return 0;
    }

    extract_after(text, "((US . depth) . ", intent->depth, sizeof(intent->depth));
    extract_after(text, "((US . kind) . ", intent->output_kind, sizeof(intent->output_kind));
    intent->accepts = contains(text, "(GS . accepts)") ? 1u : 0u;
    intent->request = contains(text, "(GS . request)") ? 1u : 0u;
    intent->constraints = contains(text, "(GS . constraints)") ? 1u : 0u;
    intent->output = contains(text, "(GS . output)") ? 1u : 0u;

    return intent->accepts && intent->request && intent->constraints && intent->output;
}

int omi_intent_model_selects_handle(const omi_intent_model_t *intent, const char *handle_id)
{
    return intent && handle_id && intent->id[0] != '\0' &&
           (strncmp(handle_id, "model.", 6u) == 0 || strncmp(handle_id, "world.", 6u) == 0);
}

int omi_intent_model_to_event(const omi_intent_model_t *intent,
                              const char *handle_id,
                              omi_event_model_t *event)
{
    if (!omi_intent_model_selects_handle(intent, handle_id) || !event) {
        return 0;
    }

    *event = (omi_event_model_t){0};
    if (strstr(intent->id, "texture")) {
        snprintf(event->id, sizeof(event->id), "event.texture-request");
        snprintf(event->class_name, sizeof(event->class_name), "texture-request");
    } else if (strstr(intent->id, "diagram")) {
        snprintf(event->id, sizeof(event->id), "event.diagram-request");
        snprintf(event->class_name, sizeof(event->class_name), "diagram-request");
    } else if (strstr(intent->id, "carrier")) {
        snprintf(event->id, sizeof(event->id), "event.carrier-scan");
        snprintf(event->class_name, sizeof(event->class_name), "carrier-scan");
    } else {
        snprintf(event->id, sizeof(event->id), "event.render-request");
        snprintf(event->class_name, sizeof(event->class_name), "render-request");
    }
    event->has_source = 1u;
    event->has_target = 1u;
    event->has_relation = 1u;
    event->has_timing = 1u;
    event->master = 5040u;
    event->public_frame = 240u;
    event->private_sweep = 60u;
    return 1;
}

int omi_intent_model_trace(const omi_intent_model_t *intent, char *out, unsigned out_size)
{
    if (!intent || !out || out_size == 0u) {
        return 0;
    }
    int n = snprintf(out, out_size, "INTENT id=%s depth=%s output=%s mutation=forbidden",
                     intent->id,
                     intent->depth[0] ? intent->depth : "unspecified",
                     intent->output_kind[0] ? intent->output_kind : "view");
    return n >= 0 && (unsigned)n < out_size;
}
