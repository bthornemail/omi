#include "../include/page_court.h"
#include "../include/serial.h"

static const omi_page_region_t page_regions[] = {
    { .name = "ROM_LAW", .authority = "canonical", .mutability = "readonly" },
    { .name = "FOUNDATION_PROOF", .authority = "witness", .mutability = "readonly" },
    { .name = "MODEL_REGISTRY", .authority = "receipt", .mutability = "readonly" },
    { .name = "USERSPACE_INIT", .authority = "projection", .mutability = "readonly" },
    { .name = "OVERLAY_REGISTRY", .authority = "declaration-overlay", .mutability = "append-only" },
    { .name = "EVENT_LOG", .authority = "event-trace", .mutability = "append-only" },
    { .name = "RENDER_TRACE", .authority = "projection", .mutability = "ephemeral" },
    { .name = "DEVICE_MMIO_RESERVED", .authority = "device-boundary", .mutability = "typed-mmio" },
};

unsigned omi_page_court_count(void)
{
    return (unsigned)(sizeof(page_regions) / sizeof(page_regions[0]));
}

const omi_page_region_t *omi_page_court_get(unsigned index)
{
    if (index >= omi_page_court_count()) {
        return 0;
    }
    return &page_regions[index];
}

void omi_emit_page_court_witness(void)
{
    omi_serial_write_string("PAGE_COURT_QEMU_BEGIN\n");

    for (unsigned i = 0; i < omi_page_court_count(); i++) {
        const omi_page_region_t *region = &page_regions[i];
        omi_serial_write_string("PAGE_REGION name=");
        omi_serial_write_string(region->name);
        omi_serial_write_string(" authority=");
        omi_serial_write_string(region->authority);
        omi_serial_write_string(" mutability=");
        omi_serial_write_string(region->mutability);
        omi_serial_write_string("\n");
    }

    omi_serial_write_string("PAGE_COURT_QEMU_END\n");
}
