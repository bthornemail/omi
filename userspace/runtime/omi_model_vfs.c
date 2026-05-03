#include "../include/omi_model_vfs.h"

#include <string.h>

static void clear_result(omi_vfs_result_t *result)
{
    if (result) {
        *result = (omi_vfs_result_t){0};
    }
}

static int resolve_directory(const char *path, omi_vfs_result_t *result)
{
    if (strcmp(path, "/omi/models") == 0 ||
        strcmp(path, "/omi/worlds") == 0) {
        *result = (omi_vfs_result_t){
            .kind = OMI_VFS_NODE_DIRECTORY,
            .path = path,
        };
        return 1;
    }

    return 0;
}

static int resolve_handle(const omi_user_mount_table_t *table,
                          const char *path,
                          omi_vfs_result_t *result)
{
    const char *model_prefix = "/omi/models/";
    const char *world_prefix = "/omi/worlds/";
    const char *id = 0;

    if (strncmp(path, model_prefix, strlen(model_prefix)) == 0) {
        id = path + strlen(model_prefix);
    } else if (strncmp(path, world_prefix, strlen(world_prefix)) == 0) {
        id = path + strlen(world_prefix);
    }

    if (!id || *id == '\0') {
        return 0;
    }

    const omi_user_model_handle_t *handle = omi_user_init_find_handle(table, id);
    if (!handle) {
        return 0;
    }

    *result = (omi_vfs_result_t){
        .kind = OMI_VFS_NODE_HANDLE,
        .path = path,
        .handle = handle,
    };
    return 1;
}

static int projection_prefix_depth(const char *path,
                                   const char **id,
                                   omi_projection_depth_t *depth)
{
    struct prefix_map {
        const char *prefix;
        omi_projection_depth_t depth;
    };

    static const struct prefix_map prefixes[] = {
        { "/omi/projections/far/", OMI_DEPTH_FS_GS },
        { "/omi/projections/middle/", OMI_DEPTH_FS_GS_RS },
        { "/omi/projections/near/", OMI_DEPTH_FS_GS_RS_US },
        { "/omi/projections/inspect/", OMI_DEPTH_FULL_TRACE },
    };

    for (unsigned i = 0; i < sizeof(prefixes) / sizeof(prefixes[0]); i++) {
        size_t len = strlen(prefixes[i].prefix);
        if (strncmp(path, prefixes[i].prefix, len) == 0) {
            *id = path + len;
            *depth = prefixes[i].depth;
            return **id != '\0';
        }
    }

    return 0;
}

static int resolve_projection(const omi_user_mount_table_t *table,
                              const char *path,
                              omi_vfs_result_t *result)
{
    const char *id = 0;
    omi_projection_depth_t depth = OMI_DEPTH_FS_GS;

    if (!projection_prefix_depth(path, &id, &depth)) {
        return 0;
    }

    const omi_user_model_handle_t *handle = omi_user_init_find_handle(table, id);
    if (!handle) {
        return 0;
    }

    omi_projection_view_t view;
    if (!omi_lazy_project_handle(handle, depth, &view)) {
        return 0;
    }

    *result = (omi_vfs_result_t){
        .kind = OMI_VFS_NODE_PROJECTION,
        .path = path,
        .handle = handle,
        .projection = view,
    };
    return 1;
}

int omi_model_vfs_resolve(const omi_user_mount_table_t *table,
                          const char *path,
                          omi_vfs_result_t *result)
{
    clear_result(result);

    if (!table || !path || !result) {
        return 0;
    }

    if (resolve_directory(path, result)) {
        return 1;
    }

    if (resolve_handle(table, path, result)) {
        return 1;
    }

    if (resolve_projection(table, path, result)) {
        return 1;
    }

    clear_result(result);
    return 0;
}
