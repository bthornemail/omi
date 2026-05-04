#ifndef OMI_MODEL_VFS_H
#define OMI_MODEL_VFS_H

#include "omi_lazy_eval.h"
#include "omi_model_loader.h"

typedef enum {
    OMI_VFS_NODE_NONE = 0,
    OMI_VFS_NODE_DIRECTORY = 1,
    OMI_VFS_NODE_HANDLE = 2,
    OMI_VFS_NODE_PROJECTION = 3
} omi_vfs_node_kind_t;

typedef struct {
    omi_vfs_node_kind_t kind;
    const char *path;
    const omi_user_model_handle_t *handle;
    omi_projection_view_t projection;
} omi_vfs_result_t;

int omi_model_vfs_resolve(const omi_user_mount_table_t *table,
                          const char *path,
                          omi_vfs_result_t *result);

int omi_model_vfs_resolve_with_overlay(const omi_user_mount_table_t *table,
                                       const omi_model_overlay_t *overlay,
                                       const char *path,
                                       omi_vfs_result_t *result);

#endif
