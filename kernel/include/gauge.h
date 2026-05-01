#ifndef OMI_GAUGE_H
#define OMI_GAUGE_H

#include <stdint.h>
#include <stddef.h>
#include "escape.h"

#define GAUGE_TABLE_SIZE 128

typedef struct {
    uint8_t dec;
    uint8_t hex;
    const char *name;
    uint8_t op;
    int parity;
    const char *role;
} omi_gauge_entry_t;

enum {
    GAUGE_I = 0,
    GAUGE_F = 1,
    GAUGE_M = 2,
    GAUGE_P = 3,
    GAUGE_Q = 4,
    GAUGE_R = 5,
    GAUGE_S = 6,
    
    GAUGE_F_M = 7,
    GAUGE_P_Q = 8,
    GAUGE_R_Q = 9,
    GAUGE_R_P = 10,
    GAUGE_P_Q_R = 11,
    GAUGE_Q_P = 12,
    GAUGE_R_Q_P = 13,
    GAUGE_F_P = 14,
    GAUGE_F_M_F = 15,
    GAUGE_S_M = 16,
    GAUGE_S_P_Q_R = 17,
    GAUGE_M_F = 18,
    GAUGE_M_F_M = 19,
    GAUGE_F_M_F_M = 20,
    GAUGE_P_Q_R_S = 21,
    
    GAUGE_OP_COUNT,
    GAUGE_NOOP = 0xFF
};

enum {
    GAUGE_HEADER_PLAIN = 0,
    GAUGE_HEADER_CONTROL,
    GAUGE_HEADER_ESCAPE,
    GAUGE_HEADER_QUOTED,
    GAUGE_HEADER_COUNT
};

enum {
    OMICRON_LINEAR = 0,
    OMICRON_RECURSIVE = 1,
    OMICRON_REPLAY = 2,
    OMICRON_MODE_COUNT
};

typedef struct {
    uint8_t parity;
    uint8_t plane;
    uint8_t mode_bit;
} omi_gauge_core_state_t;

typedef struct {
    uint8_t depth;
    uint8_t omicron_mode;
} omi_gauge_meta_state_t;

typedef struct {
    omi_gauge_core_state_t core;
} omi_gauge_state_t;

extern const omi_gauge_entry_t omi_gauge_table[];
extern const uint32_t omi_gauge_count;

uint8_t gauge_lookup(uint8_t header, uint8_t byte);
omi_gauge_state_t gauge_apply(omi_gauge_state_t state, uint8_t op);
omi_gauge_state_t gauge_step(omi_gauge_state_t state, omi_escape_state_t *esc, uint8_t *header, uint8_t byte, uint8_t omicron_mode, uint8_t *op_out);

int gauge_set_omicron_mode(omi_gauge_state_t *state, uint8_t mode);
uint8_t gauge_get_omicron_mode(omi_gauge_state_t *state);

omi_gauge_core_state_t gauge_get_core(omi_gauge_state_t *state);
omi_gauge_meta_state_t gauge_get_meta(omi_gauge_state_t *state);

int gauge_core_equiv(omi_gauge_state_t *a, omi_gauge_state_t *b);
int gauge_meta_equiv(omi_gauge_state_t *a, omi_gauge_state_t *b);

omi_gauge_meta_state_t gauge_pi(omi_gauge_state_t *state, uint8_t *trace, size_t trace_len, uint8_t omicron_mode);

uint8_t gauge_header_decode(uint8_t current_header, uint8_t byte);

#endif