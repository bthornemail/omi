#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "omi_device_model.h"

void omi_serial_init(void) {}
void omi_serial_write_char(char c) { (void)c; }
void omi_serial_write_string(const char *text) { (void)text; }
void omi_serial_write_u32(uint32_t value) { (void)value; }
void omi_serial_write_size(size_t value) { (void)value; }
void omi_serial_write_hex8(uint8_t value) { (void)value; }
void omi_serial_write_hex32(uint32_t value) { (void)value; }

static int read_file(const char *path, char *buf, unsigned size)
{
    FILE *f = fopen(path, "rb");
    if (!f) {
        return 0;
    }
    size_t n = fread(buf, 1u, size - 1u, f);
    fclose(f);
    buf[n] = '\0';
    return n > 0u;
}

static void assert_contains(const char *text, const char *needle)
{
    assert(strstr(text, needle) != 0);
}

static void parse_device(const char *path, omi_device_model_t *device)
{
    char text[2048];
    assert(read_file(path, text, sizeof(text)) == 1);
    assert(omi_device_model_parse(text, device) == 1);
    assert(strncmp(device->id, "device.", 7u) == 0);
    assert(device->causal_false == 1u);
}

static void test_device_declarations(void)
{
    printf("Testing declarative device parsing\n");

    omi_device_model_t display;
    omi_device_model_t keyboard;
    omi_device_model_t camera;
    omi_device_model_t network;
    omi_device_model_t storage;
    char trace[OMI_DEVICE_TRACE_MAX];

    parse_device("devices/display.omilisp", &display);
    parse_device("devices/keyboard.omilisp", &keyboard);
    parse_device("devices/camera.omilisp", &camera);
    parse_device("devices/network.omilisp", &network);
    parse_device("devices/storage.omilisp", &storage);

    assert(display.kind == OMI_DEVICE_DISPLAY);
    assert(omi_device_model_accepts_render_trace(&display) == 1);
    assert(strcmp(display.surface_output, "polyform-svg-output") == 0);

    assert(keyboard.kind == OMI_DEVICE_KEYBOARD);
    assert(strcmp(keyboard.emitted_event, "event.pointer-select") == 0);

    assert(camera.kind == OMI_DEVICE_CAMERA);
    assert(strcmp(camera.emitted_event, "event.carrier-scan") == 0);

    assert(network.kind == OMI_DEVICE_NETWORK);
    assert(strcmp(network.accepted_kind, "osi-model-packet") == 0);
    assert(strcmp(network.surface_output, "osi-model-packet") == 0);

    assert(storage.kind == OMI_DEVICE_STORAGE);
    assert(strcmp(storage.surface_output, "append-only-receipt-log") == 0);

    assert(omi_device_model_trace(&display, trace, sizeof(trace)) == 1);
    assert_contains(trace, "causal=false");

    printf("  OK all five device declarations parse deterministically\n\n");
}

static void test_device_events_and_lazy_invariant(void)
{
    printf("Testing device event declarations and lazy invariants\n");

    omi_device_model_t keyboard;
    omi_device_model_t camera;
    omi_device_model_t network;
    omi_device_model_t storage;
    omi_event_model_t event;
    omi_user_mount_table_t table;

    parse_device("devices/keyboard.omilisp", &keyboard);
    parse_device("devices/camera.omilisp", &camera);
    parse_device("devices/network.omilisp", &network);
    parse_device("devices/storage.omilisp", &storage);

    assert(omi_device_model_emit_event(&keyboard, &event) == 1);
    assert(strcmp(event.id, "event.pointer-select") == 0);
    assert(event.master == 5040u);

    assert(omi_device_model_emit_event(&camera, &event) == 1);
    assert(strcmp(event.id, "event.carrier-scan") == 0);

    assert(omi_device_model_emit_event(&network, &event) == 1);
    assert(strcmp(event.id, "event.model-sync") == 0);

    assert(omi_device_model_emit_event(&storage, &event) == 1);
    assert(strcmp(event.id, "event.model-hotplug") == 0);

    assert(omi_user_init_mount_registry(&table) == 1);
    const omi_user_model_handle_t *trailer =
        omi_user_init_find_handle(&table, "model.trailer.wike-ebike-cargo");
    assert(trailer != 0);
    assert(omi_device_model_observe_handle(&keyboard, &table, trailer) == 1);
    assert(trailer->expanded == 0u);
    assert(table.expansion_count == 0u);

    printf("  OK device I/O is represented as event declarations without mutation\n\n");
}

int main(void)
{
    printf("Testing Phase 42 - Declarative Device Models\n");
    printf("============================================\n\n");

    test_device_declarations();
    test_device_events_and_lazy_invariant();

    printf("============================================\n");
    printf("ALL PHASE 42 DEVICE MODEL TESTS PASSED\n");
    return 0;
}
