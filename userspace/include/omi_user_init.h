#ifndef OMI_USER_INIT_H
#define OMI_USER_INIT_H

#define OMI_USER_INIT_MAX_HANDLES 8u

typedef enum {
    OMI_USER_HANDLE_MODEL = 1,
    OMI_USER_HANDLE_WORLD = 2
} omi_user_handle_kind_t;

typedef struct {
    omi_user_handle_kind_t kind;
    const char *uri;
    const char *id;
    unsigned fs_count;
    unsigned gs_count;
    unsigned rs_count;
    unsigned us_count;
    const char *authority;
    const char *default_policy;
    const char *far_depth;
    const char *middle_depth;
    const char *near_depth;
    const char *inspect_depth;
    unsigned expanded;
} omi_user_model_handle_t;

typedef struct {
    omi_user_model_handle_t handles[OMI_USER_INIT_MAX_HANDLES];
    unsigned count;
    unsigned expansion_count;
} omi_user_mount_table_t;

int omi_user_init_mount_registry(omi_user_mount_table_t *table);
const omi_user_model_handle_t *omi_user_init_find_handle(const omi_user_mount_table_t *table,
                                                        const char *id);

#endif
