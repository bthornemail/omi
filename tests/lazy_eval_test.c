#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "omi_lazy_eval.h"

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

static int views_equal(const omi_projection_view_t *a, const omi_projection_view_t *b)
{
    return strcmp(a->handle_id, b->handle_id) == 0 &&
           strcmp(a->uri, b->uri) == 0 &&
           a->requested_depth == b->requested_depth &&
           strcmp(a->depth_name, b->depth_name) == 0 &&
           a->fs_available == b->fs_available &&
           a->gs_available == b->gs_available &&
           a->rs_available == b->rs_available &&
           a->us_available == b->us_available &&
           a->full_trace_available == b->full_trace_available &&
           a->fs_count == b->fs_count &&
           a->gs_count == b->gs_count &&
           a->rs_count == b->rs_count &&
           a->us_count == b->us_count &&
           a->expanded == b->expanded;
}

static void assert_depth_view(const omi_projection_view_t *view,
                              const char *depth_name,
                              unsigned rs_available,
                              unsigned us_available,
                              unsigned full_trace_available)
{
    assert(view->fs_available == 1u);
    assert(view->gs_available == 1u);
    assert(view->rs_available == rs_available);
    assert(view->us_available == us_available);
    assert(view->full_trace_available == full_trace_available);
    assert(strcmp(view->depth_name, depth_name) == 0);
    assert(view->expanded == 0u);
}

static void project_all_depths(const omi_user_model_handle_t *handle)
{
    omi_projection_view_t far;
    omi_projection_view_t middle;
    omi_projection_view_t near;
    omi_projection_view_t inspect;
    omi_projection_view_t again;

    assert(omi_lazy_project_handle(handle, OMI_DEPTH_FS_GS, &far) == 1);
    assert_depth_view(&far, "FS.GS", 0u, 0u, 0u);

    assert(omi_lazy_project_handle(handle, OMI_DEPTH_FS_GS_RS, &middle) == 1);
    assert_depth_view(&middle, "FS.GS.RS", 1u, 0u, 0u);

    assert(omi_lazy_project_handle(handle, OMI_DEPTH_FS_GS_RS_US, &near) == 1);
    assert_depth_view(&near, "FS.GS.RS.US", 1u, 1u, 0u);

    assert(omi_lazy_project_handle(handle, OMI_DEPTH_FULL_TRACE, &inspect) == 1);
    assert_depth_view(&inspect, "full-trace", 1u, 1u, 1u);

    assert(omi_lazy_project_handle(handle, OMI_DEPTH_FS_GS_RS_US, &again) == 1);
    assert(views_equal(&near, &again));
}

static void test_trailer_lazy_projection(void)
{
    printf("Testing trailer lazy projection depths\n");

    omi_user_mount_table_t table;
    assert(omi_user_init_mount_registry(&table) == 1);

    const omi_user_model_handle_t *trailer =
        omi_user_init_find_handle(&table, "model.trailer.wike-ebike-cargo");
    assert(trailer != 0);

    project_all_depths(trailer);

    assert(trailer->expanded == 0u);
    assert(table.expansion_count == 0u);

    printf("  OK trailer far/middle/near/inspect projections are demand-driven\n\n");
}

static void test_world_lazy_projection(void)
{
    printf("Testing world lazy projection depths\n");

    omi_user_mount_table_t table;
    assert(omi_user_init_mount_registry(&table) == 1);

    const omi_user_model_handle_t *world =
        omi_user_init_find_handle(&table, "world.cargo-yard-demo");
    assert(world != 0);

    project_all_depths(world);

    assert(world->expanded == 0u);
    assert(table.expansion_count == 0u);

    printf("  OK world far/middle/near/inspect projections are demand-driven\n\n");
}

static void test_lazy_eval_null_safety(void)
{
    printf("Testing lazy projection null safety\n");

    omi_user_mount_table_t table;
    omi_projection_view_t view;
    assert(omi_user_init_mount_registry(&table) == 1);

    const omi_user_model_handle_t *trailer =
        omi_user_init_find_handle(&table, "model.trailer.wike-ebike-cargo");
    assert(trailer != 0);

    assert(omi_lazy_project_handle(0, OMI_DEPTH_FS_GS, &view) == 0);
    assert(omi_lazy_project_handle(trailer, OMI_DEPTH_FS_GS, 0) == 0);
    assert(omi_lazy_project_handle(trailer, (omi_projection_depth_t)99, &view) == 0);
    assert(trailer->expanded == 0u);
    assert(table.expansion_count == 0u);

    printf("  OK invalid projections do not mutate lazy handles\n\n");
}

int main(void)
{
    printf("Testing Phase 35 - Lazy Projection Evaluator\n");
    printf("============================================\n\n");

    test_trailer_lazy_projection();
    test_world_lazy_projection();
    test_lazy_eval_null_safety();

    printf("============================================\n");
    printf("ALL PHASE 35 LAZY EVAL TESTS PASSED\n");
    return 0;
}
