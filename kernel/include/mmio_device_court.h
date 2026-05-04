#ifndef OMI_MMIO_DEVICE_COURT_H
#define OMI_MMIO_DEVICE_COURT_H

typedef struct {
    const char *name;
    const char *role;
    const char *event;
    const char *authority;
} omi_mmio_device_t;

unsigned omi_mmio_device_court_count(void);
const omi_mmio_device_t *omi_mmio_device_court_get(unsigned index);
void omi_emit_mmio_device_court_witness(void);

#endif
