#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "model_registry.h"

#define SERIAL_BUFFER_SIZE 4096u

static char serial_buffer[SERIAL_BUFFER_SIZE];
static size_t serial_len = 0;

void omi_serial_init(void)
{
}

void omi_serial_write_char(char c)
{
    if (serial_len + 1u < sizeof(serial_buffer)) {
        serial_buffer[serial_len++] = c;
        serial_buffer[serial_len] = '\0';
    }
}

void omi_serial_write_string(const char *text)
{
    for (const char *p = text; p && *p; p++) {
        omi_serial_write_char(*p);
    }
}

void omi_serial_write_u32(uint32_t value)
{
    char reversed[10];
    size_t len = 0;

    if (value == 0u) {
        omi_serial_write_char('0');
        return;
    }

    while (value > 0u && len < sizeof(reversed)) {
        reversed[len++] = (char)('0' + (value % 10u));
        value /= 10u;
    }

    while (len > 0u) {
        omi_serial_write_char(reversed[--len]);
    }
}

void omi_serial_write_size(size_t value)
{
    omi_serial_write_u32((uint32_t)value);
}

void omi_serial_write_hex8(uint8_t value)
{
    (void)value;
}

void omi_serial_write_hex32(uint32_t value)
{
    (void)value;
}

static void assert_contains(const char *needle)
{
    assert(strstr(serial_buffer, needle) != NULL);
}

static void test_model_receipt(void)
{
    printf("Testing model registry receipt\n");

    assert(omi_model_registry_count() == 1u);
    assert(omi_model_registry_get(1u) == 0);

    const omi_model_receipt_t *model = omi_model_registry_get(0u);
    assert(model != 0);
    assert(strcmp(model->model_id, "model.trailer.wike-ebike-cargo") == 0);
    assert(model->fs_count == 1u);
    assert(model->gs_count == 9u);
    assert(model->rs_count == 29u);
    assert(model->us_count == 76u);
    assert(strcmp(model->authority, "declaration-trace") == 0);

    const omi_model_receipt_t *again = omi_model_registry_get(0u);
    assert(again == model);
    assert(strcmp(again->model_id, model->model_id) == 0);

    printf("  OK model.trailer.wike-ebike-cargo pinned counts and authority\n\n");
}

static void test_world_receipt(void)
{
    printf("Testing world registry receipt\n");

    assert(omi_world_registry_count() == 1u);
    assert(omi_world_registry_get(1u) == 0);

    const omi_world_receipt_t *world = omi_world_registry_get(0u);
    assert(world != 0);
    assert(strcmp(world->world_id, "world.cargo-yard-demo") == 0);
    assert(world->fs_count == 1u);
    assert(world->gs_count == 3u);
    assert(world->rs_count == 7u);
    assert(world->us_count == 22u);
    assert(world->object_count == 3u);
    assert(world->interaction_count == 3u);
    assert(world->render_depth_count == 4u);

    printf("  OK world.cargo-yard-demo pinned counts and registry summary\n\n");
}

static void test_relations_and_projections(void)
{
    printf("Testing relation and projection registry receipts\n");

    assert(omi_world_relation_registry_count() == 3u);
    assert(omi_world_relation_registry_get(3u) == 0);
    assert(strcmp(omi_world_relation_registry_get(0u)->name, "hitch-link.001") == 0);
    assert(strcmp(omi_world_relation_registry_get(0u)->source, "bicycle.001.hitch") == 0);
    assert(strcmp(omi_world_relation_registry_get(0u)->target, "trailer.001.tow-arm") == 0);
    assert(strcmp(omi_world_relation_registry_get(1u)->name, "load-support.001") == 0);
    assert(strcmp(omi_world_relation_registry_get(2u)->name, "rolling.001") == 0);

    assert(omi_model_projection_registry_count() == 4u);
    assert(omi_model_projection_registry_get(4u) == 0);
    assert(strcmp(omi_model_projection_registry_get(0u)->name, "far") == 0);
    assert(strcmp(omi_model_projection_registry_get(0u)->depth, "FS.GS") == 0);
    assert(strcmp(omi_model_projection_registry_get(1u)->depth, "FS.GS.RS") == 0);
    assert(strcmp(omi_model_projection_registry_get(2u)->depth, "FS.GS.RS.US") == 0);
    assert(strcmp(omi_model_projection_registry_get(3u)->depth, "full-trace") == 0);

    printf("  OK relation records and lazy projection depths are stable\n\n");
}

static void test_registry_witness(void)
{
    printf("Testing serial model registry witness\n");

    serial_len = 0;
    serial_buffer[0] = '\0';

    omi_emit_model_registry_witness();

    assert_contains("MODEL_REGISTRY_QEMU_BEGIN\n");
    assert_contains("MODEL_QEMU object=model.trailer.wike-ebike-cargo fs=1 gs=9 rs=29 us=76 authority=declaration-trace\n");
    assert_contains("WORLD_QEMU world=world.cargo-yard-demo fs=1 gs=3 rs=7 us=22 objects=3 interactions=3\n");
    assert_contains("WORLD_QEMU relation=hitch-link.001 source=bicycle.001.hitch target=trailer.001.tow-arm\n");
    assert_contains("WORLD_QEMU relation=load-support.001 source=cargo.001.mass target=trailer.001.panel.floor\n");
    assert_contains("WORLD_QEMU relation=rolling.001 source=bicycle.001.forward-motion target=trailer.001.motion\n");
    assert_contains("MODEL_QEMU projection=far depth=FS.GS\n");
    assert_contains("MODEL_QEMU projection=middle depth=FS.GS.RS\n");
    assert_contains("MODEL_QEMU projection=near depth=FS.GS.RS.US\n");
    assert_contains("MODEL_QEMU projection=inspect depth=full-trace\n");
    assert_contains("MODEL_REGISTRY_QEMU_END\n");

    printf("  OK registry witness emits pinned QEMU lines\n\n");
}

int main(void)
{
    printf("Testing Phase 33 - QEMU Model Registry\n");
    printf("======================================\n\n");

    test_model_receipt();
    test_world_receipt();
    test_relations_and_projections();
    test_registry_witness();

    printf("======================================\n");
    printf("ALL PHASE 33 MODEL REGISTRY TESTS PASSED\n");
    return 0;
}
