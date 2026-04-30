#ifndef OMI_TRACE_H
#define OMI_TRACE_H

#include <stdint.h>
#include <stddef.h>

#define OMI_TRACE_MAX_LEN 256

typedef struct {
    uint8_t byte;
    uint8_t op;
    uint8_t scope_depth;
    uint8_t in_escape;
    uint8_t escape_scope;
} omi_trace_entry_t;

typedef struct {
    omi_trace_entry_t entries[OMI_TRACE_MAX_LEN];
    size_t length;
    size_t canonical_length;
} omi_trace_t;

void trace_init(omi_trace_t *trace);

int trace_append(omi_trace_t *trace, uint8_t byte, uint8_t op, uint8_t scope_depth, uint8_t in_escape, uint8_t escape_scope);

int trace_normalize(omi_trace_t *input, omi_trace_t *output);

int trace_equiv(omi_trace_t *a, omi_trace_t *b);

void trace_print(omi_trace_t *trace);

#endif