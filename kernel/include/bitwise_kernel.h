#ifndef OMI_BITWISE_KERNEL_H
#define OMI_BITWISE_KERNEL_H

#include <stdint.h>

#define OMI_BITWISE_KERNEL_GS 0x1Du

typedef struct {
    uint32_t lo;
    uint32_t hi;
} sonar60_t;

typedef struct {
    uint8_t K;
    uint8_t fano;
    sonar60_t sonar;
    uint8_t GS;
} kernel_state_t;

uint8_t delta8(uint8_t k, uint8_t gs);
uint8_t fano_tick(uint8_t fano);
sonar60_t sonar_tick(sonar60_t s);
void kernel_tick(kernel_state_t *ks);

#endif
