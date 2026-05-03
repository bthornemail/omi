#include "../include/model_registry.h"
#include "../include/serial.h"

static const omi_model_receipt_t model_receipts[] = {
    {
        .model_id = "model.trailer.wike-ebike-cargo",
        .fs_count = 1u,
        .gs_count = 9u,
        .rs_count = 29u,
        .us_count = 76u,
        .authority = "declaration-trace",
    },
};

static const omi_world_receipt_t world_receipts[] = {
    {
        .world_id = "world.cargo-yard-demo",
        .fs_count = 1u,
        .gs_count = 3u,
        .rs_count = 7u,
        .us_count = 22u,
        .object_count = 3u,
        .interaction_count = 3u,
        .render_depth_count = 4u,
    },
};

static const omi_world_relation_receipt_t world_relations[] = {
    {
        .name = "hitch-link.001",
        .source = "bicycle.001.hitch",
        .target = "trailer.001.tow-arm",
    },
    {
        .name = "load-support.001",
        .source = "cargo.001.mass",
        .target = "trailer.001.panel.floor",
    },
    {
        .name = "rolling.001",
        .source = "bicycle.001.forward-motion",
        .target = "trailer.001.motion",
    },
};

static const omi_model_projection_receipt_t render_projections[] = {
    { .name = "far", .depth = "FS.GS" },
    { .name = "middle", .depth = "FS.GS.RS" },
    { .name = "near", .depth = "FS.GS.RS.US" },
    { .name = "inspect", .depth = "full-trace" },
};

unsigned omi_model_registry_count(void)
{
    return (unsigned)(sizeof(model_receipts) / sizeof(model_receipts[0]));
}

const omi_model_receipt_t *omi_model_registry_get(unsigned index)
{
    if (index >= omi_model_registry_count()) {
        return 0;
    }
    return &model_receipts[index];
}

unsigned omi_world_registry_count(void)
{
    return (unsigned)(sizeof(world_receipts) / sizeof(world_receipts[0]));
}

const omi_world_receipt_t *omi_world_registry_get(unsigned index)
{
    if (index >= omi_world_registry_count()) {
        return 0;
    }
    return &world_receipts[index];
}

unsigned omi_world_relation_registry_count(void)
{
    return (unsigned)(sizeof(world_relations) / sizeof(world_relations[0]));
}

const omi_world_relation_receipt_t *omi_world_relation_registry_get(unsigned index)
{
    if (index >= omi_world_relation_registry_count()) {
        return 0;
    }
    return &world_relations[index];
}

unsigned omi_model_projection_registry_count(void)
{
    return (unsigned)(sizeof(render_projections) / sizeof(render_projections[0]));
}

const omi_model_projection_receipt_t *omi_model_projection_registry_get(unsigned index)
{
    if (index >= omi_model_projection_registry_count()) {
        return 0;
    }
    return &render_projections[index];
}

static void emit_model_receipt(const omi_model_receipt_t *receipt)
{
    omi_serial_write_string("MODEL_QEMU object=");
    omi_serial_write_string(receipt->model_id);
    omi_serial_write_string(" fs=");
    omi_serial_write_u32(receipt->fs_count);
    omi_serial_write_string(" gs=");
    omi_serial_write_u32(receipt->gs_count);
    omi_serial_write_string(" rs=");
    omi_serial_write_u32(receipt->rs_count);
    omi_serial_write_string(" us=");
    omi_serial_write_u32(receipt->us_count);
    omi_serial_write_string(" authority=");
    omi_serial_write_string(receipt->authority);
    omi_serial_write_string("\n");
}

static void emit_world_receipt(const omi_world_receipt_t *receipt)
{
    omi_serial_write_string("WORLD_QEMU world=");
    omi_serial_write_string(receipt->world_id);
    omi_serial_write_string(" fs=");
    omi_serial_write_u32(receipt->fs_count);
    omi_serial_write_string(" gs=");
    omi_serial_write_u32(receipt->gs_count);
    omi_serial_write_string(" rs=");
    omi_serial_write_u32(receipt->rs_count);
    omi_serial_write_string(" us=");
    omi_serial_write_u32(receipt->us_count);
    omi_serial_write_string(" objects=");
    omi_serial_write_u32(receipt->object_count);
    omi_serial_write_string(" interactions=");
    omi_serial_write_u32(receipt->interaction_count);
    omi_serial_write_string("\n");
}

static void emit_relation(const omi_world_relation_receipt_t *relation)
{
    omi_serial_write_string("WORLD_QEMU relation=");
    omi_serial_write_string(relation->name);
    omi_serial_write_string(" source=");
    omi_serial_write_string(relation->source);
    omi_serial_write_string(" target=");
    omi_serial_write_string(relation->target);
    omi_serial_write_string("\n");
}

static void emit_projection(const omi_model_projection_receipt_t *projection)
{
    omi_serial_write_string("MODEL_QEMU projection=");
    omi_serial_write_string(projection->name);
    omi_serial_write_string(" depth=");
    omi_serial_write_string(projection->depth);
    omi_serial_write_string("\n");
}

void omi_emit_model_registry_witness(void)
{
    omi_serial_write_string("MODEL_REGISTRY_QEMU_BEGIN\n");

    for (unsigned i = 0; i < omi_model_registry_count(); i++) {
        emit_model_receipt(&model_receipts[i]);
    }

    for (unsigned i = 0; i < omi_world_registry_count(); i++) {
        emit_world_receipt(&world_receipts[i]);
    }

    for (unsigned i = 0; i < omi_world_relation_registry_count(); i++) {
        emit_relation(&world_relations[i]);
    }

    for (unsigned i = 0; i < omi_model_projection_registry_count(); i++) {
        emit_projection(&render_projections[i]);
    }

    omi_serial_write_string("MODEL_REGISTRY_QEMU_END\n");
}
