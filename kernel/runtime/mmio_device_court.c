#include "../include/mmio_device_court.h"
#include "../include/serial.h"

static const omi_mmio_device_t mmio_devices[] = {
    { .name = "DISPLAY_MMIO", .role = "render-trace-target", .event = "event.render-output", .authority = "projection-boundary" },
    { .name = "KEYBOARD_MMIO", .role = "input-event-source", .event = "event.pointer-select", .authority = "event-source" },
    { .name = "CAMERA_MMIO", .role = "carrier-scan-source", .event = "event.carrier-scan", .authority = "event-source" },
    { .name = "NETWORK_MMIO", .role = "model-sync-surface", .event = "event.model-sync", .authority = "event-source" },
    { .name = "STORAGE_MMIO", .role = "append-only-log", .event = "event.receipt-append", .authority = "append-only" },
    { .name = "TIMER_MMIO", .role = "timing-observer", .event = "event.timing-receipt", .authority = "observer-only" },
};

unsigned omi_mmio_device_court_count(void)
{
    return (unsigned)(sizeof(mmio_devices) / sizeof(mmio_devices[0]));
}

const omi_mmio_device_t *omi_mmio_device_court_get(unsigned index)
{
    if (index >= omi_mmio_device_court_count()) {
        return 0;
    }
    return &mmio_devices[index];
}

void omi_emit_mmio_device_court_witness(void)
{
    omi_serial_write_string("MMIO_DEVICE_COURT_QEMU_BEGIN\n");

    for (unsigned i = 0; i < omi_mmio_device_court_count(); i++) {
        const omi_mmio_device_t *device = &mmio_devices[i];
        omi_serial_write_string("MMIO_DEVICE name=");
        omi_serial_write_string(device->name);
        omi_serial_write_string(" role=");
        omi_serial_write_string(device->role);
        omi_serial_write_string(" event=");
        omi_serial_write_string(device->event);
        omi_serial_write_string(" authority=");
        omi_serial_write_string(device->authority);
        omi_serial_write_string("\n");
    }

    omi_serial_write_string("MMIO_DEVICE_COURT_QEMU_END\n");
}
