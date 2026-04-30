#ifndef OMI_H
#define OMI_H

#include <stdint.h>

typedef uint64_t omi_tick_t;

typedef enum omi_status {
    OMI_OK = 0,
    OMI_ERR_INVALID_STATE = 1
} omi_status_t;

#endif
