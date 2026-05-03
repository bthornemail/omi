#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "omi_user_init.h"

void omi_serial_init(void)
{
}

void omi_serial_write_char(char c)
{
    (void)c;
}

void omi_serial_write_string(const char *text)
{
    (void)text;
}

void omi_serial_write_u32(uint32_t value)
{
    (void)value;
}

void omi_serial_write_size(size_t value)
{
    (void)value;
}

void omi_serial_write_hex8(uint8_t value)
{
    (void)value;
}

void omi_serial_write_hex32(uint32_t value)
{
    (void)value;
}

static void assert_lazy_policy(const omi_user_model_handle_t *handle)
{
    assert(handle != 0);
    assert(strcmp(handle->default_policy, "lazy") == 0);
    assert(strcmp(handle->far_depth, "FS.GS") == 0);
    assert(strcmp(handle->middle_depth, "FS.GS.RS") == 0);
    assert(strcmp(handle->near_depth, "FS.GS.RS.US") == 0);
    assert(strcmp(handle->inspect_depth, "full-trace") == 0);
    assert(handle->expanded == 0u);
}

static int handles_equal(const omi_user_model_handle_t *a, const omi_user_model_handle_t *b)
{
    return a->kind == b->kind &&
           strcmp(a->uri, b->uri) == 0 &&
           strcmp(a->id, b->id) == 0 &&
           a->fs_count == b->fs_count &&
           a->gs_count == b->gs_count &&
           a->rs_count == b->rs_count &&
           a->us_count == b->us_count &&
           strcmp(a->authority, b->authority) == 0 &&
           strcmp(a->default_policy, b->default_policy) == 0 &&
           strcmp(a->far_depth, b->far_depth) == 0 &&
           strcmp(a->middle_depth, b->middle_depth) == 0 &&
           strcmp(a->near_depth, b->near_depth) == 0 &&
           strcmp(a->inspect_depth, b->inspect_depth) == 0 &&
           a->expanded == b->expanded;
}

static void test_mount_registry(void)
{
    printf("Testing lazy user-space registry mount\n");

    omi_user_mount_table_t table;
    assert(omi_user_init_mount_registry(&table) == 1);
    assert(table.count == 2u);
    assert(table.expansion_count == 0u);

    const omi_user_model_handle_t *trailer =
        omi_user_init_find_handle(&table, "model.trailer.wike-ebike-cargo");
    assert(trailer != 0);
    assert(trailer->kind == OMI_USER_HANDLE_MODEL);
    assert(strcmp(trailer->uri, "omi://model/model.trailer.wike-ebike-cargo") == 0);
    assert(trailer->fs_count == 1u);
    assert(trailer->gs_count == 9u);
    assert(trailer->rs_count == 29u);
    assert(trailer->us_count == 76u);
    assert(strcmp(trailer->authority, "declaration-trace") == 0);
    assert_lazy_policy(trailer);

    const omi_user_model_handle_t *world =
        omi_user_init_find_handle(&table, "world.cargo-yard-demo");
    assert(world != 0);
    assert(world->kind == OMI_USER_HANDLE_WORLD);
    assert(strcmp(world->uri, "omi://world/world.cargo-yard-demo") == 0);
    assert(world->fs_count == 1u);
    assert(world->gs_count == 3u);
    assert(world->rs_count == 7u);
    assert(world->us_count == 22u);
    assert(strcmp(world->authority, "declaration-trace") == 0);
    assert_lazy_policy(world);

    assert(omi_user_init_find_handle(&table, "missing.model") == 0);

    printf("  OK trailer and world handles mounted lazily\n\n");
}

static void test_repeated_init_is_deterministic(void)
{
    printf("Testing repeated user-space init determinism\n");

    omi_user_mount_table_t first;
    omi_user_mount_table_t second;

    assert(omi_user_init_mount_registry(&first) == 1);
    assert(omi_user_init_mount_registry(&second) == 1);

    assert(first.count == second.count);
    assert(first.expansion_count == 0u);
    assert(second.expansion_count == 0u);

    for (unsigned i = 0; i < first.count; i++) {
        assert(handles_equal(&first.handles[i], &second.handles[i]));
    }

    printf("  OK repeated init produces identical lazy mount table\n\n");
}

static void test_null_safety(void)
{
    printf("Testing user-space init null safety\n");

    assert(omi_user_init_mount_registry(0) == 0);
    assert(omi_user_init_find_handle(0, "model.trailer.wike-ebike-cargo") == 0);

    omi_user_mount_table_t table;
    assert(omi_user_init_mount_registry(&table) == 1);
    assert(omi_user_init_find_handle(&table, 0) == 0);

    printf("  OK null inputs do not create mount handles\n\n");
}

int main(void)
{
    printf("Testing Phase 34 - Lazy User-Space Init Mount\n");
    printf("=============================================\n\n");

    test_mount_registry();
    test_repeated_init_is_deterministic();
    test_null_safety();

    printf("=============================================\n");
    printf("ALL PHASE 34 USER INIT TESTS PASSED\n");
    return 0;
}
