#include "../include/omi_user_init.h"
#include "../../kernel/include/model_registry.h"

#include <string.h>

static const char *const depth_far = "FS.GS";
static const char *const depth_middle = "FS.GS.RS";
static const char *const depth_near = "FS.GS.RS.US";
static const char *const depth_inspect = "full-trace";
static const char *const policy_lazy = "lazy";
static const char *const world_authority = "declaration-trace";

static void clear_table(omi_user_mount_table_t *table)
{
    if (!table) {
        return;
    }

    for (unsigned i = 0; i < OMI_USER_INIT_MAX_HANDLES; i++) {
        table->handles[i] = (omi_user_model_handle_t){0};
    }
    table->count = 0;
    table->expansion_count = 0;
}

static int append_handle(omi_user_mount_table_t *table, omi_user_model_handle_t handle)
{
    if (!table || table->count >= OMI_USER_INIT_MAX_HANDLES) {
        return 0;
    }

    table->handles[table->count++] = handle;
    return 1;
}

static omi_user_model_handle_t model_handle_from_receipt(const omi_model_receipt_t *receipt)
{
    return (omi_user_model_handle_t){
        .kind = OMI_USER_HANDLE_MODEL,
        .uri = "omi://model/model.trailer.wike-ebike-cargo",
        .id = receipt->model_id,
        .fs_count = receipt->fs_count,
        .gs_count = receipt->gs_count,
        .rs_count = receipt->rs_count,
        .us_count = receipt->us_count,
        .authority = receipt->authority,
        .default_policy = policy_lazy,
        .far_depth = depth_far,
        .middle_depth = depth_middle,
        .near_depth = depth_near,
        .inspect_depth = depth_inspect,
        .expanded = 0u,
    };
}

static omi_user_model_handle_t world_handle_from_receipt(const omi_world_receipt_t *receipt)
{
    return (omi_user_model_handle_t){
        .kind = OMI_USER_HANDLE_WORLD,
        .uri = "omi://world/world.cargo-yard-demo",
        .id = receipt->world_id,
        .fs_count = receipt->fs_count,
        .gs_count = receipt->gs_count,
        .rs_count = receipt->rs_count,
        .us_count = receipt->us_count,
        .authority = world_authority,
        .default_policy = policy_lazy,
        .far_depth = depth_far,
        .middle_depth = depth_middle,
        .near_depth = depth_near,
        .inspect_depth = depth_inspect,
        .expanded = 0u,
    };
}

int omi_user_init_mount_registry(omi_user_mount_table_t *table)
{
    if (!table) {
        return 0;
    }

    clear_table(table);

    for (unsigned i = 0; i < omi_model_registry_count(); i++) {
        const omi_model_receipt_t *receipt = omi_model_registry_get(i);
        if (!receipt || !append_handle(table, model_handle_from_receipt(receipt))) {
            clear_table(table);
            return 0;
        }
    }

    for (unsigned i = 0; i < omi_world_registry_count(); i++) {
        const omi_world_receipt_t *receipt = omi_world_registry_get(i);
        if (!receipt || !append_handle(table, world_handle_from_receipt(receipt))) {
            clear_table(table);
            return 0;
        }
    }

    return 1;
}

const omi_user_model_handle_t *omi_user_init_find_handle(const omi_user_mount_table_t *table,
                                                        const char *id)
{
    if (!table || !id) {
        return 0;
    }

    for (unsigned i = 0; i < table->count; i++) {
        if (table->handles[i].id && strcmp(table->handles[i].id, id) == 0) {
            return &table->handles[i];
        }
    }

    return 0;
}
