#include "../include/escape.h"
#include <string.h>

#ifndef KERNEL_MODE
#include <stdio.h>
#endif

void escape_init(omi_escape_state_t *state)
{
    state->mode = ESC_MODE_DATA;
    state->scope_depth = 0;
    state->numsys = 0;
    for (int i = 0; i < 4; i++) {
        state->scope_stack[i] = ESC_SCOPE_NONE;
    }
}

static int push_scope(omi_escape_state_t *state, uint8_t scope)
{
    if (state->scope_depth >= 4) {
        return -1;
    }
    state->scope_stack[state->scope_depth++] = scope;
    return 0;
}

static int pop_scope(omi_escape_state_t *state)
{
    if (state->scope_depth == 0) {
        return -1;
    }
    state->scope_stack[--state->scope_depth] = ESC_SCOPE_NONE;
    return 0;
}

int escape_step(omi_escape_state_t *state, uint8_t input, uint8_t *output)
{
    switch (state->mode) {
        case ESC_MODE_DATA:
            if (input == 0x1B) {
                state->mode = ESC_MODE_ESCAPE_PENDING;
                return 0;
            }
            *output = input;
            return 1;
            
        case ESC_MODE_ESCAPE_PENDING:
            switch (input) {
                case 0x1B:
                    *output = 0x1B;
                    state->mode = ESC_MODE_DATA;
                    return 1;
                    
                case 'F':
                case 'f':
                    push_scope(state, ESC_SCOPE_NEXT_FILE);
                    state->mode = ESC_MODE_CONTROL;
                    return 0;
                    
                case 'G':
                case 'g':
                    push_scope(state, ESC_SCOPE_NEXT_GROUP);
                    state->mode = ESC_MODE_CONTROL;
                    return 0;
                    
                case 'R':
                case 'r':
                    push_scope(state, ESC_SCOPE_NEXT_RECORD);
                    state->mode = ESC_MODE_CONTROL;
                    return 0;
                    
                case 'U':
                case 'u':
                    push_scope(state, ESC_SCOPE_NEXT_UNIT);
                    state->mode = ESC_MODE_CONTROL;
                    return 0;
                    
                case 'Q':
                case 'q':
                    push_scope(state, ESC_SCOPE_QUOTED);
                    state->mode = ESC_MODE_QUOTED_LITERAL;
                    return 0;
                    
                default:
                    return -1;
            }
            
        case ESC_MODE_CONTROL:
            if (state->scope_depth == 0) {
                state->mode = ESC_MODE_DATA;
                return 0;
            }
            
            {
                uint8_t current = state->scope_stack[state->scope_depth - 1];
                
                switch (current) {
                    case ESC_SCOPE_NEXT_UNIT:
                        pop_scope(state);
                        if (state->scope_depth == 0) {
                            state->mode = ESC_MODE_DATA;
                        }
                        return 0;
                        
                    case ESC_SCOPE_NEXT_FILE:
                        if (input == 0x1C) {
                            pop_scope(state);
                            if (state->scope_depth == 0) {
                                state->mode = ESC_MODE_DATA;
                            }
                            return 0;
                        }
                        return 0;
                        
                    case ESC_SCOPE_NEXT_GROUP:
                        if (input == 0x1D) {
                            pop_scope(state);
                            if (state->scope_depth == 0) {
                                state->mode = ESC_MODE_DATA;
                            }
                            return 0;
                        }
                        return 0;
                        
                    case ESC_SCOPE_NEXT_RECORD:
                        if (input == 0x1E) {
                            pop_scope(state);
                            if (state->scope_depth == 0) {
                                state->mode = ESC_MODE_DATA;
                            }
                            return 0;
                        }
                        return 0;
                        
                    default:
                        return -1;
                }
            }
            
        case ESC_MODE_QUOTED_LITERAL:
            if (state->scope_depth == 0) {
                state->mode = ESC_MODE_DATA;
                return 0;
            }
            
            {
                uint8_t current = state->scope_stack[state->scope_depth - 1];
                
                if (current == ESC_SCOPE_QUOTED) {
                    if (input == 0x1B) {
                        state->mode = ESC_MODE_ESCAPE_PENDING;
                        return 0;
                    }
                    return 1;
                }
                
                return 1;
            }
            
        default:
            return -1;
    }
}

int escape_is_valid(omi_escape_state_t *state)
{
    if (state->mode == ESC_MODE_ESCAPE_PENDING) {
        return 0;
    }
    if (state->scope_depth > 0 && state->mode == ESC_MODE_DATA) {
        return 0;
    }
    return 1;
}

#ifndef KERNEL_MODE
const char *escape_mode_name(uint8_t mode)
{
    static const char *names[] = {"DATA", "ESCAPE_PENDING", "CONTROL", "QUOTED_LITERAL"};
    if (mode >= ESC_MODE_COUNT) return "UNKNOWN";
    return names[mode];
}

const char *escape_scope_name(uint8_t scope)
{
    static const char *names[] = {"NONE", "NEXT_FILE", "NEXT_GROUP", "NEXT_RECORD", "NEXT_UNIT", "QUOTED", "EXPLICIT"};
    if (scope >= ESC_SCOPE_COUNT) return "UNKNOWN";
    return names[scope];
}
#endif