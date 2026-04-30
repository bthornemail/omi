#include "../include/trace.h"
#include <string.h>
#include <stdio.h>

#ifndef KERNEL_MODE
#include <stdio.h>
#endif

void trace_init(omi_trace_t *trace)
{
    trace->length = 0;
    trace->canonical_length = 0;
}

int trace_append(omi_trace_t *trace, uint8_t byte, uint8_t op, uint8_t scope_depth, uint8_t in_escape, uint8_t escape_scope)
{
    if (trace->length >= OMI_TRACE_MAX_LEN) {
        return -1;
    }
    
    trace->entries[trace->length].byte = byte;
    trace->entries[trace->length].op = op;
    trace->entries[trace->length].scope_depth = scope_depth;
    trace->entries[trace->length].in_escape = in_escape;
    trace->entries[trace->length].escape_scope = escape_scope;
    trace->length++;
    
    return 0;
}

static int is_scope_token(uint8_t byte)
{
    return (byte == 'F' || byte == 'f' ||
            byte == 'G' || byte == 'g' ||
            byte == 'R' || byte == 'r' ||
            byte == 'U' || byte == 'u' ||
            byte == 'Q' || byte == 'q');
}

static uint8_t scope_from_token(uint8_t token)
{
    switch (token) {
        case 'F': case 'f': return 1;
        case 'G': case 'g': return 2;
        case 'R': case 'r': return 3;
        case 'U': case 'u': return 4;
        case 'Q': case 'q': return 5;
        default: return 0;
    }
}

static int is_structural_close(uint8_t current_scope, uint8_t byte)
{
    if (current_scope == 1 && byte == 0x1C) return 1;
    if (current_scope == 2 && byte == 0x1D) return 1;
    if (current_scope == 3 && byte == 0x1E) return 1;
    return 0;
}

int trace_normalize(omi_trace_t *input, omi_trace_t *output)
{
    trace_init(output);
    
    size_t i = 0;
    int escape_pending = 0;
    uint8_t active_scope = 0;
    uint8_t scope_depth = 0;
    
    while (i < input->length) {
        omi_trace_entry_t *e = &input->entries[i];
        
        if (escape_pending) {
            if (is_scope_token(e->byte)) {
                active_scope = scope_from_token(e->byte);
                scope_depth++;
                escape_pending = 0;
                output->entries[output->length].byte = e->byte;
                output->entries[output->length].op = e->op;
                output->entries[output->length].scope_depth = scope_depth;
                output->entries[output->length].in_escape = 1;
                output->entries[output->length].escape_scope = active_scope;
                output->length++;
            } else {
                output->entries[output->length++] = *e;
                escape_pending = 0;
            }
            i++;
            continue;
        }
        
        if (e->in_escape && e->byte == 0x1B) {
            escape_pending = 1;
            output->entries[output->length++] = *e;
            i++;
            continue;
        }
        
        if (active_scope != 0) {
            output->entries[output->length].byte = e->byte;
            output->entries[output->length].op = e->op;
            output->entries[output->length].scope_depth = scope_depth;
            output->entries[output->length].in_escape = 1;
            output->entries[output->length].escape_scope = active_scope;
            output->length++;
            
            if (is_structural_close(active_scope, e->byte)) {
                active_scope = 0;
                scope_depth--;
            }
        } else {
            output->entries[output->length++] = *e;
        }
        
        i++;
    }
    
    output->canonical_length = output->length;
    return 0;
}

int trace_equiv(omi_trace_t *a, omi_trace_t *b)
{
    if (a->canonical_length != b->canonical_length) {
        return 0;
    }
    
    for (size_t i = 0; i < a->canonical_length; i++) {
        if (a->entries[i].byte != b->entries[i].byte ||
            a->entries[i].op != b->entries[i].op ||
            a->entries[i].in_escape != b->entries[i].in_escape ||
            a->entries[i].escape_scope != b->entries[i].escape_scope) {
            return 0;
        }
    }
    
    return 1;
}

#ifndef KERNEL_MODE
void trace_print(omi_trace_t *trace)
{
    printf("TRACE len=%zu canonical=%zu\n", trace->length, trace->canonical_length);
    for (size_t i = 0; i < trace->length && i < 16; i++) {
        printf("  [%zu] byte=0x%02X op=%u esc=%u scope=%u\n",
               i,
               trace->entries[i].byte,
               trace->entries[i].op,
               trace->entries[i].in_escape,
               trace->entries[i].escape_scope);
    }
}
#endif