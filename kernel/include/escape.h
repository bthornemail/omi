#ifndef OMI_ESCAPE_H
#define OMI_ESCAPE_H

#include <stdint.h>
#include <stddef.h>

enum {
    ESC_MODE_DATA = 0,
    ESC_MODE_ESCAPE_PENDING,
    ESC_MODE_CONTROL,
    ESC_MODE_QUOTED_LITERAL,
    ESC_MODE_COUNT
};

enum {
    ESC_SCOPE_NONE = 0,
    ESC_SCOPE_NEXT_UNIT,
    ESC_SCOPE_NEXT_RECORD,
    ESC_SCOPE_NEXT_GROUP,
    ESC_SCOPE_NEXT_FILE,
    ESC_SCOPE_QUOTED,
    ESC_SCOPE_EXPLICIT,
    ESC_SCOPE_COUNT
};

typedef struct {
    uint8_t mode;
    uint8_t scope_stack[4];
    uint8_t scope_depth;
    uint8_t numsys;
} omi_escape_state_t;

#define ESCAPE_INITIAL_STATE { .mode = ESC_MODE_DATA, .scope_stack = {0}, .scope_depth = 0, .numsys = 0 }

void escape_init(omi_escape_state_t *state);

int escape_step(omi_escape_state_t *state, uint8_t input, uint8_t *output);

int escape_is_valid(omi_escape_state_t *state);

const char *escape_mode_name(uint8_t mode);

const char *escape_scope_name(uint8_t scope);

#endif