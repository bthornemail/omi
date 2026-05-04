#ifndef OMI_INTENT_MODEL_H
#define OMI_INTENT_MODEL_H

#include "omi_event_model.h"

#define OMI_INTENT_ID_MAX 64u
#define OMI_INTENT_TRACE_MAX 256u

typedef struct {
    char id[OMI_INTENT_ID_MAX];
    char depth[32];
    char output_kind[64];
    unsigned accepts;
    unsigned request;
    unsigned constraints;
    unsigned output;
} omi_intent_model_t;

int omi_intent_model_parse(const char *text, omi_intent_model_t *intent);
int omi_intent_model_selects_handle(const omi_intent_model_t *intent, const char *handle_id);
int omi_intent_model_to_event(const omi_intent_model_t *intent,
                              const char *handle_id,
                              omi_event_model_t *event);
int omi_intent_model_trace(const omi_intent_model_t *intent, char *out, unsigned out_size);

#endif
