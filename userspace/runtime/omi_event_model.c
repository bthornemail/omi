#include "../include/omi_event_model.h"

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

int omi_event_model_parse(const char *text, omi_event_model_t *event)
{
    if (!text || !event) {
        return 0;
    }

    *event = (omi_event_model_t){0};
    if (!extract_after(text, "(FS . ", event->id, sizeof(event->id)) ||
        strncmp(event->id, "event.", 6u) != 0) {
        return 0;
    }

    extract_after(text, "((US . class) . ", event->class_name, sizeof(event->class_name));
    event->has_source = contains(text, "(GS . source)") ? 1u : 0u;
    event->has_target = contains(text, "(GS . target)") ? 1u : 0u;
    event->has_relation = contains(text, "(GS . relation)") ? 1u : 0u;
    event->has_timing = contains(text, "(GS . timing)") ? 1u : 0u;
    event->master = contains(text, "((US . master) . 5040)") ? 5040u : 0u;
    event->public_frame = contains(text, "((US . public-frame) . 240)") ? 240u : 0u;
    event->private_sweep = contains(text, "((US . private-sweep) . 60)") ? 60u : 0u;

    return event->class_name[0] != '\0' &&
           event->has_source &&
           event->has_target &&
           event->has_relation &&
           event->has_timing &&
           event->master == 5040u &&
           event->public_frame == 240u &&
           event->private_sweep == 60u;
}

void omi_event_log_init(omi_event_log_t *log)
{
    if (log) {
        *log = (omi_event_log_t){0};
    }
}

int omi_event_log_append(omi_event_log_t *log, const omi_event_model_t *event)
{
    if (!log || !event || log->count >= OMI_EVENT_LOG_MAX) {
        return 0;
    }
    log->events[log->count++] = *event;
    log->append_count++;
    return 1;
}

int omi_event_model_trace(const omi_event_model_t *event, char *out, unsigned out_size)
{
    if (!event || !out || out_size == 0u) {
        return 0;
    }
    int n = snprintf(out, out_size, "EVENT id=%s class=%s timing=5040/240/60 causal=false",
                     event->id, event->class_name);
    return n >= 0 && (unsigned)n < out_size;
}
