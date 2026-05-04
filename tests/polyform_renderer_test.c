#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "omi_polyform_renderer.h"

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

static void assert_contains(const char *text, const char *needle)
{
    assert(strstr(text, needle) != 0);
}

static void test_trailer_depth_renders(void)
{
    printf("Testing trailer polyform render depths\n");

    omi_user_mount_table_t table;
    assert(omi_user_init_mount_registry(&table) == 1);

    const omi_user_model_handle_t *trailer =
        omi_user_init_find_handle(&table, "model.trailer.wike-ebike-cargo");
    assert(trailer != 0);

    omi_render_view_t far;
    omi_render_view_t middle;
    omi_render_view_t near;
    omi_render_view_t inspect;
    assert(omi_polyform_render_handle(trailer, OMI_DEPTH_FS_GS, &far) == 1);
    assert(omi_polyform_render_handle(trailer, OMI_DEPTH_FS_GS_RS, &middle) == 1);
    assert(omi_polyform_render_handle(trailer, OMI_DEPTH_FS_GS_RS_US, &near) == 1);
    assert(omi_polyform_render_handle(trailer, OMI_DEPTH_FULL_TRACE, &inspect) == 1);

    assert_contains(far.trace, "output=box.two-wheels.tow-arm");
    assert_contains(middle.trace, "output=panels.frame.wheels.tow-arm");
    assert_contains(near.trace, "output=rails.latches.reflectors.hinges.spokes");
    assert_contains(inspect.trace, "labels=form,function");
    assert_contains(inspect.trace, "rectangular-container,rectangle,line,circle,triangle,point-joint,bent-line");
    assert_contains(far.svg, "<svg");
    assert_contains(far.svg, "data-omi-id=\"model.trailer.wike-ebike-cargo\"");

    omi_render_view_t again;
    assert(omi_polyform_render_handle(trailer, OMI_DEPTH_FS_GS_RS_US, &again) == 1);
    assert(strcmp(near.trace, again.trace) == 0);
    assert(strcmp(near.svg, again.svg) == 0);
    assert(near.receipt_hash == again.receipt_hash);

    assert(trailer->expanded == 0u);
    assert(table.expansion_count == 0u);

    printf("  OK trailer far/middle/near/inspect renders are deterministic\n\n");
}

static void test_world_render_and_vfs_path(void)
{
    printf("Testing world render and VFS render path\n");

    omi_user_mount_table_t table;
    assert(omi_user_init_mount_registry(&table) == 1);

    const omi_user_model_handle_t *world =
        omi_user_init_find_handle(&table, "world.cargo-yard-demo");
    assert(world != 0);

    omi_render_view_t world_render;
    assert(omi_polyform_render_handle(world, OMI_DEPTH_FS_GS_RS, &world_render) == 1);
    assert_contains(world_render.trace, "trailer,bicycle,cargo");
    assert_contains(world_render.trace, "hitch-link.001");
    assert_contains(world_render.trace, "load-support.001");
    assert_contains(world_render.trace, "rolling.001");

    omi_render_view_t vfs_render;
    assert(omi_polyform_render_vfs_path(&table,
                                        0,
                                        "/omi/projections/middle/model.trailer.wike-ebike-cargo",
                                        &vfs_render) == 1);
    assert_contains(vfs_render.trace, "depth=FS.GS.RS");
    assert_contains(vfs_render.trace, "output=panels.frame.wheels.tow-arm");

    omi_render_view_t handle_path_render;
    assert(omi_polyform_render_vfs_path(&table,
                                        0,
                                        "/omi/models/model.trailer.wike-ebike-cargo",
                                        &handle_path_render) == 1);
    assert_contains(handle_path_render.trace, "depth=FS.GS");
    assert_contains(handle_path_render.trace, "output=box.two-wheels.tow-arm");

    assert(world->expanded == 0u);
    assert(table.expansion_count == 0u);

    printf("  OK world and VFS renders stay projection-only\n\n");
}

static void test_carrier_object_render_selection(void)
{
    printf("Testing carrier-validated object render selection\n");

    omi_user_mount_table_t table;
    assert(omi_user_init_mount_registry(&table) == 1);

    omi_aztec_object_receipt_t aztec = {
        .global_360 = OMI_TIMING_GLOBAL_360,
        .object_id = "model.trailer.wike-ebike-cargo",
    };

    omi_render_view_t render;
    assert(omi_polyform_render_carrier_object(&table,
                                              0,
                                              &aztec,
                                              OMI_DEPTH_FS_GS_RS_US,
                                              &render) == 1);
    assert_contains(render.trace, "model.trailer.wike-ebike-cargo");
    assert_contains(render.trace, "output=rails.latches.reflectors.hinges.spokes");

    aztec.global_360 = 359u;
    assert(omi_polyform_render_carrier_object(&table,
                                              0,
                                              &aztec,
                                              OMI_DEPTH_FS_GS_RS_US,
                                              &render) == 0);

    assert(table.expansion_count == 0u);

    printf("  OK carrier receipt selects existing handle through validation\n\n");
}

int main(void)
{
    printf("Testing Phase 39 - Polyform/SVG Renderer Projection\n");
    printf("===================================================\n\n");

    test_trailer_depth_renders();
    test_world_render_and_vfs_path();
    test_carrier_object_render_selection();

    printf("===================================================\n");
    printf("ALL PHASE 39 POLYFORM RENDERER TESTS PASSED\n");
    return 0;
}
