#ifndef OMI_EVENT_MODEL_H
#define OMI_EVENT_MODEL_H

#define OMI_EVENT_ID_MAX 64u
#define OMI_EVENT_TRACE_MAX 256u
#define OMI_EVENT_LOG_MAX 16u

typedef struct {
    char id[OMI_EVENT_ID_MAX];
    char class_name[OMI_EVENT_ID_MAX];
    unsigned has_source;
    unsigned has_target;
    unsigned has_relation;
    unsigned has_timing;
    unsigned master;
    unsigned public_frame;
    unsigned private_sweep;
} omi_event_model_t;

typedef struct {
    omi_event_model_t events[OMI_EVENT_LOG_MAX];
    unsigned count;
    unsigned append_count;
} omi_event_log_t;

int omi_event_model_parse(const char *text, omi_event_model_t *event);
void omi_event_log_init(omi_event_log_t *log);
int omi_event_log_append(omi_event_log_t *log, const omi_event_model_t *event);
int omi_event_model_trace(const omi_event_model_t *event, char *out, unsigned out_size);

#endif
