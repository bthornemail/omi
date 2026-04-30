#include "../include/gauge.h"
#include <stdint.h>

#ifndef KERNEL_MODE
#include <stdio.h>
#endif

uint8_t gauge_lookup(uint8_t byte)
{
    if (byte >= GAUGE_TABLE_SIZE) {
        return GAUGE_I;
    }
    
    for (uint32_t i = 0; i < omi_gauge_count; i++) {
        if (omi_gauge_table[i].hex == byte) {
            return omi_gauge_table[i].op;
        }
    }
    
    return GAUGE_I;
}

int gauge_set_omicron_mode(omi_gauge_state_t *state, uint8_t mode)
{
    (void)state;
    (void)mode;
    return 0;
}

uint8_t gauge_get_omicron_mode(omi_gauge_state_t *state)
{
    (void)state;
    return OMICRON_LINEAR;
}

omi_gauge_meta_state_t gauge_pi(omi_gauge_state_t *state, uint8_t *trace, size_t trace_len, uint8_t omicron_mode)
{
    omi_gauge_meta_state_t meta = {
        .depth = 0,
        .omicron_mode = omicron_mode
    };
    
    (void)state;
    (void)trace;
    
    switch (omicron_mode) {
        case OMICRON_LINEAR:
            meta.depth = 0;
            break;
            
        case OMICRON_RECURSIVE:
            meta.depth = (uint8_t)trace_len;
            break;
            
        case OMICRON_REPLAY:
            meta.depth = 0;
            break;
            
        default:
            meta.depth = 0;
            break;
    }
    
    return meta;
}

omi_gauge_state_t gauge_apply(omi_gauge_state_t state, uint8_t op)
{
    switch (op) {
        case GAUGE_I:
            break;
            
        case GAUGE_F:
            state.core.mode_bit ^= 1;
            break;
            
        case GAUGE_M:
            state.core.parity ^= 1;
            break;
            
        case GAUGE_P:
            state.core.plane = (state.core.plane ^ 1) ? 1 : 0;
            break;
            
        case GAUGE_Q:
            state.core.plane = (state.core.plane ^ 2) ? 2 : 0;
            break;
            
        case GAUGE_R:
            state.core.plane = (state.core.plane ^ 4) ? 4 : 0;
            break;
            
        case GAUGE_S:
            state.core.mode_bit ^= 1;
            state.core.parity ^= 1;
            break;
            
        case GAUGE_F_M:
            state.core.mode_bit ^= 1;
            state.core.parity ^= 1;
            break;
            
        case GAUGE_P_Q:
            state.core.plane ^= 3;
            break;
            
        case GAUGE_R_Q:
            state.core.plane ^= 6;
            break;
            
        case GAUGE_R_P:
            state.core.plane ^= 5;
            break;
            
        case GAUGE_P_Q_R:
            state.core.plane ^= 7;
            break;
            
        case GAUGE_Q_P:
            state.core.plane ^= 3;
            break;
            
        case GAUGE_R_Q_P:
            state.core.plane ^= 7;
            break;
            
        case GAUGE_F_P:
            state.core.mode_bit ^= 1;
            state.core.plane ^= 1;
            break;
            
        case GAUGE_F_M_F:
            state.core.mode_bit ^= 1;
            state.core.parity ^= 1;
            state.core.mode_bit ^= 1;
            break;
            
        case GAUGE_S_M:
            state.core.mode_bit ^= 1;
            state.core.parity ^= 1;
            state.core.parity ^= 1;
            break;
            
        case GAUGE_S_P_Q_R:
            state.core.mode_bit ^= 1;
            state.core.parity ^= 1;
            state.core.plane ^= 7;
            break;
            
        case GAUGE_M_F:
            state.core.parity ^= 1;
            state.core.mode_bit ^= 1;
            break;
            
        case GAUGE_M_F_M:
            state.core.parity ^= 1;
            state.core.mode_bit ^= 1;
            state.core.parity ^= 1;
            break;
            
        case GAUGE_F_M_F_M:
            state.core.mode_bit ^= 1;
            state.core.parity ^= 1;
            state.core.mode_bit ^= 1;
            state.core.parity ^= 1;
            break;
            
        case GAUGE_P_Q_R_S:
            state.core.mode_bit ^= 1;
            state.core.plane ^= 7;
            state.core.parity ^= 1;
            break;
            
        default:
            break;
    }
    
    return state;
}

omi_gauge_core_state_t gauge_get_core(omi_gauge_state_t *state)
{
    return state->core;
}

omi_gauge_meta_state_t gauge_get_meta(omi_gauge_state_t *state)
{
    (void)state;
    
    omi_gauge_meta_state_t empty = { .depth = 0, .omicron_mode = OMICRON_LINEAR };
    return empty;
}

int gauge_core_equiv(omi_gauge_state_t *a, omi_gauge_state_t *b)
{
    return (a->core.parity == b->core.parity && a->core.plane == b->core.plane);
}

int gauge_meta_equiv(omi_gauge_state_t *a, omi_gauge_state_t *b)
{
    (void)a;
    (void)b;
    return 1;
}

omi_gauge_state_t gauge_step(omi_gauge_state_t state, uint8_t byte, uint8_t omicron_mode)
{
    uint8_t op = gauge_lookup(byte);
    
    (void)omicron_mode;
    
    return gauge_apply(state, op);
}

#ifndef KERNEL_MODE
void gauge_print_state(omi_gauge_state_t state, uint8_t omicron_mode, size_t depth)
{
    const char *mode_names[] = {"LINEAR", "RECURSIVE", "REPLAY"};
    const char *mode_name = (omicron_mode < OMICRON_MODE_COUNT) 
        ? mode_names[omicron_mode] 
        : "UNKNOWN";
    
    printf("core{parity=%u plane=0x%02X mode_bit=%u} meta{depth=%zu omicron=%s}",
           state.core.parity, state.core.plane, state.core.mode_bit, depth, mode_name);
}

void gauge_trace(uint8_t *bytes, size_t len, uint8_t omicron_mode)
{
    omi_gauge_state_t state = { .core = { .parity = 0, .plane = 0, .mode_bit = 0 } };
    
    printf("GAUGE TRACE:\n");
    for (size_t i = 0; i < len; i++) {
        uint8_t op = gauge_lookup(bytes[i]);
        state = gauge_step(state, bytes[i], omicron_mode);
        
        size_t depth = (omicron_mode == OMICRON_RECURSIVE) ? i + 1 : 0;
        
        printf("STEP %zu: byte=0x%02X op=%u ", i, bytes[i], op);
        gauge_print_state(state, omicron_mode, depth);
        printf("\n");
    }
}
#endif