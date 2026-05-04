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

static const char box_model[] =
    "((FS . model.box.generic-cargo)\n"
    "  ((GS . identity)\n"
    "    ((RS . object)\n"
    "      ((US . class) . cargo-box)\n"
    "      ((US . authority) . hotplug-declaration)))\n"
    "  ((GS . form)\n"
    "    ((RS . body)\n"
    "      ((US . primitive) . rectangular-box)\n"
    "      ((US . function) . carried-load))))\n";

static const char invalid_model[] =
    "((FS . model.invalid)\n"
    "  ((GS . identity)))\n";

static void test_hotplug_loads_overlay_handle(void)
{
    printf("Testing hot-plug model declaration load\n");

    omi_user_mount_table_t table;
    omi_model_overlay_t overlay;
    omi_model_load_result_t result;

    assert(omi_user_init_mount_registry(&table) == 1);
    omi_model_overlay_init(&overlay);

    assert(omi_model_loader_load_text(&overlay, box_model, &result) == 1);
    assert(overlay.count == 1u);
    assert(overlay.append_count == 1u);
    assert(result.fs_count == 1u);
    assert(result.gs_count == 2u);
    assert(result.rs_count == 2u);
    assert(result.us_count == 4u);
    assert(result.receipt_hash != 0u);
    assert(strcmp(result.model_id, "model.box.generic-cargo") == 0);

    const omi_user_model_handle_t *handle =
        omi_model_overlay_find_handle(&overlay, "model.box.generic-cargo");
    assert(handle != 0);
    assert(strcmp(handle->uri, "omi://model/model.box.generic-cargo") == 0);
    assert(strcmp(handle->authority, "hotplug-declaration") == 0);
    assert(handle->expanded == 0u);
    assert(table.expansion_count == 0u);

    const omi_user_model_handle_t *boot =
        omi_user_init_find_handle(&table, "model.trailer.wike-ebike-cargo");
    assert(boot != 0);
    assert(boot->fs_count == 1u);
    assert(boot->gs_count == 9u);
    assert(boot->rs_count == 29u);
    assert(boot->us_count == 76u);
    assert(boot->expanded == 0u);

    printf("  OK hot-plug declaration appended to overlay only\n\n");
}

static void test_invalid_and_duplicate_rejection(void)
{
    printf("Testing invalid and duplicate hot-plug rejection\n");

    omi_model_overlay_t overlay;
    omi_model_load_result_t result;
    omi_model_overlay_init(&overlay);

    assert(omi_model_loader_load_text(&overlay, invalid_model, &result) == 0);
    assert(overlay.count == 0u);
    assert(overlay.append_count == 0u);

    assert(omi_model_loader_load_text(&overlay, box_model, &result) == 1);
    assert(omi_model_loader_load_text(&overlay, box_model, &result) == 0);
    assert(overlay.count == 1u);
    assert(overlay.append_count == 1u);

    printf("  OK invalid declarations reject and duplicate IDs reject deterministically\n\n");
}

static void test_hotplug_vfs_and_lazy_projection(void)
{
    printf("Testing hot-plug VFS and lazy projection\n");

    omi_user_mount_table_t table;
    omi_model_overlay_t overlay;
    omi_model_load_result_t load;
    omi_vfs_result_t result;
    omi_vfs_result_t again;

    assert(omi_user_init_mount_registry(&table) == 1);
    omi_model_overlay_init(&overlay);
    assert(omi_model_loader_load_text(&overlay, box_model, &load) == 1);

    assert(omi_model_vfs_resolve_with_overlay(&table,
                                              &overlay,
                                              "/omi/models/model.box.generic-cargo",
                                              &result) == 1);
    assert(result.kind == OMI_VFS_NODE_HANDLE);
    assert(strcmp(result.handle->id, "model.box.generic-cargo") == 0);
    assert(result.handle->expanded == 0u);

    assert(omi_model_vfs_resolve(&table,
                                 "/omi/models/model.box.generic-cargo",
                                 &again) == 0);

    assert(omi_model_vfs_resolve_with_overlay(&table,
                                              &overlay,
                                              "/omi/projections/far/model.box.generic-cargo",
                                              &result) == 1);
    assert(result.kind == OMI_VFS_NODE_PROJECTION);
    assert(strcmp(result.projection.depth_name, "FS.GS") == 0);
    assert(result.projection.rs_available == 0u);

    assert(omi_model_vfs_resolve_with_overlay(&table,
                                              &overlay,
                                              "/omi/projections/middle/model.box.generic-cargo",
                                              &result) == 1);
    assert(strcmp(result.projection.depth_name, "FS.GS.RS") == 0);
    assert(result.projection.rs_available == 1u);
    assert(result.projection.us_available == 0u);

    assert(omi_model_vfs_resolve_with_overlay(&table,
                                              &overlay,
                                              "/omi/projections/near/model.box.generic-cargo",
                                              &result) == 1);
    assert(strcmp(result.projection.depth_name, "FS.GS.RS.US") == 0);
    assert(result.projection.us_available == 1u);

    assert(omi_model_vfs_resolve_with_overlay(&table,
                                              &overlay,
                                              "/omi/projections/inspect/model.box.generic-cargo",
                                              &result) == 1);
    assert(strcmp(result.projection.depth_name, "full-trace") == 0);
    assert(result.projection.full_trace_available == 1u);

    assert(omi_model_vfs_resolve_with_overlay(&table,
                                              &overlay,
                                              "/omi/projections/inspect/model.box.generic-cargo",
                                              &again) == 1);
    assert(strcmp(result.projection.handle_id, again.projection.handle_id) == 0);
    assert(result.projection.requested_depth == again.projection.requested_depth);
    assert(result.projection.expanded == 0u);
    assert(result.handle->expanded == 0u);
    assert(table.expansion_count == 0u);
    assert(overlay.append_count == 1u);

    printf("  OK hot-plug model resolves through VFS and lazy projection\n\n");
}

int main(void)
{
    printf("Testing Phase 37 - Hot-Pluggable Model Loader\n");
    printf("=============================================\n\n");

    test_hotplug_loads_overlay_handle();
    test_invalid_and_duplicate_rejection();
    test_hotplug_vfs_and_lazy_projection();

    printf("=============================================\n");
    printf("ALL PHASE 37 HOTPLUG MODEL TESTS PASSED\n");
    return 0;
}
