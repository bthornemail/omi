#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "omi_model_vfs.h"

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

static int vfs_results_equal(const omi_vfs_result_t *a, const omi_vfs_result_t *b)
{
    if (a->kind != b->kind || strcmp(a->path, b->path) != 0 || a->handle != b->handle) {
        return 0;
    }

    if (a->kind != OMI_VFS_NODE_PROJECTION) {
        return 1;
    }

    return strcmp(a->projection.handle_id, b->projection.handle_id) == 0 &&
           strcmp(a->projection.uri, b->projection.uri) == 0 &&
           a->projection.requested_depth == b->projection.requested_depth &&
           strcmp(a->projection.depth_name, b->projection.depth_name) == 0 &&
           a->projection.fs_available == b->projection.fs_available &&
           a->projection.gs_available == b->projection.gs_available &&
           a->projection.rs_available == b->projection.rs_available &&
           a->projection.us_available == b->projection.us_available &&
           a->projection.full_trace_available == b->projection.full_trace_available &&
           a->projection.expanded == b->projection.expanded;
}

static void assert_directory(const omi_user_mount_table_t *table, const char *path)
{
    omi_vfs_result_t result;
    omi_vfs_result_t again;

    assert(omi_model_vfs_resolve(table, path, &result) == 1);
    assert(omi_model_vfs_resolve(table, path, &again) == 1);
    assert(result.kind == OMI_VFS_NODE_DIRECTORY);
    assert(strcmp(result.path, path) == 0);
    assert(vfs_results_equal(&result, &again));
}

static void assert_handle_path(const omi_user_mount_table_t *table,
                               const char *path,
                               const char *id,
                               omi_user_handle_kind_t kind)
{
    omi_vfs_result_t result;
    omi_vfs_result_t again;

    assert(omi_model_vfs_resolve(table, path, &result) == 1);
    assert(omi_model_vfs_resolve(table, path, &again) == 1);
    assert(result.kind == OMI_VFS_NODE_HANDLE);
    assert(result.handle != 0);
    assert(result.handle->kind == kind);
    assert(strcmp(result.handle->id, id) == 0);
    assert(result.handle->expanded == 0u);
    assert(vfs_results_equal(&result, &again));
}

static void assert_projection_path(const omi_user_mount_table_t *table,
                                   const char *path,
                                   const char *id,
                                   const char *depth_name,
                                   unsigned rs_available,
                                   unsigned us_available,
                                   unsigned full_trace_available)
{
    omi_vfs_result_t result;
    omi_vfs_result_t again;

    assert(omi_model_vfs_resolve(table, path, &result) == 1);
    assert(omi_model_vfs_resolve(table, path, &again) == 1);
    assert(result.kind == OMI_VFS_NODE_PROJECTION);
    assert(result.handle != 0);
    assert(strcmp(result.handle->id, id) == 0);
    assert(strcmp(result.projection.depth_name, depth_name) == 0);
    assert(result.projection.fs_available == 1u);
    assert(result.projection.gs_available == 1u);
    assert(result.projection.rs_available == rs_available);
    assert(result.projection.us_available == us_available);
    assert(result.projection.full_trace_available == full_trace_available);
    assert(result.projection.expanded == 0u);
    assert(result.handle->expanded == 0u);
    assert(vfs_results_equal(&result, &again));
}

static void test_required_paths(void)
{
    printf("Testing required model VFS paths\n");

    omi_user_mount_table_t table;
    assert(omi_user_init_mount_registry(&table) == 1);

    assert_directory(&table, "/omi/models");
    assert_directory(&table, "/omi/worlds");
    assert_handle_path(&table,
                       "/omi/models/model.trailer.wike-ebike-cargo",
                       "model.trailer.wike-ebike-cargo",
                       OMI_USER_HANDLE_MODEL);
    assert_handle_path(&table,
                       "/omi/worlds/world.cargo-yard-demo",
                       "world.cargo-yard-demo",
                       OMI_USER_HANDLE_WORLD);

    assert(table.expansion_count == 0u);
    printf("  OK model and world handle paths resolve deterministically\n\n");
}

static void test_projection_paths(void)
{
    printf("Testing projection VFS paths\n");

    omi_user_mount_table_t table;
    assert(omi_user_init_mount_registry(&table) == 1);

    const char *model = "model.trailer.wike-ebike-cargo";
    assert_projection_path(&table, "/omi/projections/far/model.trailer.wike-ebike-cargo",
                           model, "FS.GS", 0u, 0u, 0u);
    assert_projection_path(&table, "/omi/projections/middle/model.trailer.wike-ebike-cargo",
                           model, "FS.GS.RS", 1u, 0u, 0u);
    assert_projection_path(&table, "/omi/projections/near/model.trailer.wike-ebike-cargo",
                           model, "FS.GS.RS.US", 1u, 1u, 0u);
    assert_projection_path(&table, "/omi/projections/inspect/model.trailer.wike-ebike-cargo",
                           model, "full-trace", 1u, 1u, 1u);

    const char *world = "world.cargo-yard-demo";
    assert_projection_path(&table, "/omi/projections/far/world.cargo-yard-demo",
                           world, "FS.GS", 0u, 0u, 0u);
    assert_projection_path(&table, "/omi/projections/middle/world.cargo-yard-demo",
                           world, "FS.GS.RS", 1u, 0u, 0u);
    assert_projection_path(&table, "/omi/projections/near/world.cargo-yard-demo",
                           world, "FS.GS.RS.US", 1u, 1u, 0u);
    assert_projection_path(&table, "/omi/projections/inspect/world.cargo-yard-demo",
                           world, "full-trace", 1u, 1u, 1u);

    assert(table.expansion_count == 0u);
    printf("  OK projection paths map to lazy evaluator depths\n\n");
}

static void test_unknown_paths(void)
{
    printf("Testing unknown model VFS paths\n");

    omi_user_mount_table_t table;
    omi_vfs_result_t result;
    assert(omi_user_init_mount_registry(&table) == 1);

    assert(omi_model_vfs_resolve(&table, "/omi/models/missing", &result) == 0);
    assert(result.kind == OMI_VFS_NODE_NONE);
    assert(omi_model_vfs_resolve(&table, "/omi/projections/far/missing", &result) == 0);
    assert(result.kind == OMI_VFS_NODE_NONE);
    assert(omi_model_vfs_resolve(&table, "/omi/projections/bad/model.trailer.wike-ebike-cargo", &result) == 0);
    assert(result.kind == OMI_VFS_NODE_NONE);
    assert(omi_model_vfs_resolve(0, "/omi/models", &result) == 0);
    assert(omi_model_vfs_resolve(&table, 0, &result) == 0);
    assert(omi_model_vfs_resolve(&table, "/omi/models", 0) == 0);

    assert(table.expansion_count == 0u);
    printf("  OK unknown paths reject deterministically\n\n");
}

int main(void)
{
    printf("Testing Phase 36 - Model VFS Projection\n");
    printf("=======================================\n\n");

    test_required_paths();
    test_projection_paths();
    test_unknown_paths();

    printf("=======================================\n");
    printf("ALL PHASE 36 MODEL VFS TESTS PASSED\n");
    return 0;
}
