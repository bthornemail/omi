#ifndef OMI_MODEL_REGISTRY_H
#define OMI_MODEL_REGISTRY_H

typedef struct {
    const char *model_id;
    unsigned fs_count;
    unsigned gs_count;
    unsigned rs_count;
    unsigned us_count;
    const char *authority;
} omi_model_receipt_t;

typedef struct {
    const char *world_id;
    unsigned fs_count;
    unsigned gs_count;
    unsigned rs_count;
    unsigned us_count;
    unsigned object_count;
    unsigned interaction_count;
    unsigned render_depth_count;
} omi_world_receipt_t;

typedef struct {
    const char *name;
    const char *source;
    const char *target;
} omi_world_relation_receipt_t;

typedef struct {
    const char *name;
    const char *depth;
} omi_model_projection_receipt_t;

unsigned omi_model_registry_count(void);
const omi_model_receipt_t *omi_model_registry_get(unsigned index);

unsigned omi_world_registry_count(void);
const omi_world_receipt_t *omi_world_registry_get(unsigned index);

unsigned omi_world_relation_registry_count(void);
const omi_world_relation_receipt_t *omi_world_relation_registry_get(unsigned index);

unsigned omi_model_projection_registry_count(void);
const omi_model_projection_receipt_t *omi_model_projection_registry_get(unsigned index);

void omi_emit_model_registry_witness(void);

#endif
