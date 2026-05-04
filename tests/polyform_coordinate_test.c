#include <assert.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

#include "omi_polyform_coordinate.h"

static void test_path_mapping(void)
{
    printf("Testing deterministic FS/GS/RS/US coordinate mapping\n");

    omi_polyform_coordinate_t wheel_a;
    omi_polyform_coordinate_t wheel_b;
    omi_polyform_coordinate_t panel;
    omi_polyform_coordinate_t interaction;
    omi_polyform_coordinate_t primitive;

    assert(omi_polyform_coordinate_from_path("model.trailer.wike-ebike-cargo/motion/wheel.left",
                                             "circle",
                                             "record",
                                             "structural",
                                             "near",
                                             &wheel_a) == 1);
    assert(omi_polyform_coordinate_from_path("model.trailer.wike-ebike-cargo/motion/wheel.left",
                                             "circle",
                                             "record",
                                             "structural",
                                             "near",
                                             &wheel_b) == 1);
    assert(omi_polyform_coordinate_from_path("model.trailer.wike-ebike-cargo/panels/panel.floor",
                                             "rectangle",
                                             "record",
                                             "structural",
                                             "near",
                                             &panel) == 1);
    assert(omi_polyform_coordinate_from_path("world.cargo-yard-demo/interactions/hitch-link.001",
                                             "relation",
                                             "edge",
                                             "relation-closure",
                                             "inspect",
                                             &interaction) == 1);
    assert(omi_polyform_coordinate_from_path("model.trailer.wike-ebike-cargo/motion/wheel.left/primitive",
                                             "circle",
                                             "unit",
                                             "structural",
                                             "inspect",
                                             &primitive) == 1);

    assert(wheel_a.x == wheel_b.x);
    assert(wheel_a.y == wheel_b.y);
    assert(wheel_a.z == wheel_b.z);
    assert(wheel_a.w == wheel_b.w);
    assert(wheel_a.receipt_hash == wheel_b.receipt_hash);
    assert(strcmp(wheel_a.fs, "model.trailer.wike-ebike-cargo") == 0);
    assert(strcmp(wheel_a.gs, "motion") == 0);
    assert(strcmp(wheel_a.rs, "wheel.left") == 0);
    assert(wheel_a.w == 0u);
    assert(primitive.w != 0u);
    assert(panel.z != wheel_a.z);
    assert(strcmp(interaction.gs, "interactions") == 0);
    assert(strcmp(interaction.rs, "hitch-link.001") == 0);

    printf("  OK canonical paths map deterministically to x/y/z/w\n\n");
}

static void test_unknown_path_and_timing(void)
{
    printf("Testing unknown path rejection and timing law\n");

    omi_polyform_coordinate_t coord;
    omi_polyform_timing_t timing = {
        .master_5040 = OMI_POLYFORM_MASTER_5040,
        .public_240 = OMI_POLYFORM_PUBLIC_240,
        .local_60 = OMI_POLYFORM_LOCAL_60,
        .operator_16 = OMI_POLYFORM_OPERATOR_16,
        .fano_7 = OMI_POLYFORM_FANO_7,
        .byte_8 = OMI_POLYFORM_BYTE_8
    };
    omi_polyform_timing_t bad = timing;
    bad.operator_16 = 15u;

    assert(omi_polyform_coordinate_from_path("invalid", "polyform", "record", "structural", "inspect", &coord) == 0);
    assert(omi_polyform_coordinate_validate_timing(&timing) == 1);
    assert(omi_polyform_coordinate_validate_timing(&bad) == 0);

    printf("  OK unknown paths reject and 240/60/16/7/8/5040 timing validates\n\n");
}

static void test_cons_geometry_and_overlay(void)
{
    printf("Testing cons geometry law and overlay preservation\n");

    omi_cons_geometry_t geometry;
    omi_polyform_coordinate_t base;
    omi_polyform_coordinate_t overlay;

    assert(omi_polyform_coordinate_cons_geometry(3.0, 4.0, &geometry) == 1);
    assert(fabs(geometry.cons - 5.0) < 1e-9);
    assert(fabs(geometry.tan_theta - (4.0 / 3.0)) < 1e-9);
    assert(fabs(geometry.cos_theta - (3.0 / 5.0)) < 1e-9);
    assert(fabs(geometry.sin_theta - (4.0 / 5.0)) < 1e-9);

    assert(omi_polyform_coordinate_from_path("model.trailer.wike-ebike-cargo/motion/wheel.left",
                                             "circle",
                                             "record",
                                             "structural",
                                             "near",
                                             &base) == 1);
    assert(omi_polyform_coordinate_apply_overlay(&base,
                                                 "red",
                                                 "mesh.wheel",
                                                 "texture.black-rubber-wheel",
                                                 "type.highlight",
                                                 &overlay) == 1);
    assert(base.receipt_hash == overlay.receipt_hash);
    assert(base.x == overlay.x);
    assert(base.y == overlay.y);
    assert(base.z == overlay.z);
    assert(base.w == overlay.w);

    printf("  OK cons geometry is deterministic and overlays preserve coordinate receipt\n\n");
}

static void make_fixture_block(unsigned x,
                               unsigned y,
                               unsigned z,
                               unsigned w,
                               const char *path,
                               omi_polyform_coordinate_t *out)
{
    *out = (omi_polyform_coordinate_t){0};
    strncpy(out->omi_path, path, sizeof(out->omi_path) - 1u);
    strncpy(out->fs, "fixture", sizeof(out->fs) - 1u);
    strncpy(out->gs, "double-cube", sizeof(out->gs) - 1u);
    strncpy(out->rs, path, sizeof(out->rs) - 1u);
    out->x = x;
    out->y = y;
    out->z = z;
    out->w = w;
    strncpy(out->basis, "fixture", sizeof(out->basis) - 1u);
    strncpy(out->degree, "closure", sizeof(out->degree) - 1u);
    strncpy(out->sign, "structural", sizeof(out->sign) - 1u);
    strncpy(out->depth, "inspect", sizeof(out->depth) - 1u);
    out->timing = (omi_polyform_timing_t){
        .master_5040 = OMI_POLYFORM_MASTER_5040,
        .public_240 = OMI_POLYFORM_PUBLIC_240,
        .local_60 = OMI_POLYFORM_LOCAL_60,
        .operator_16 = OMI_POLYFORM_OPERATOR_16,
        .fano_7 = OMI_POLYFORM_FANO_7,
        .byte_8 = OMI_POLYFORM_BYTE_8
    };
}

static void test_sexagesimal_closure_law(void)
{
    static const unsigned expected_slots[6] = {10u, 20u, 30u, 40u, 50u, 0u};
    static const unsigned fixture_points[6][4] = {
        {1u, 0u, 0u, 0u},
        {2u, 0u, 0u, 0u},
        {2u, 1u, 0u, 0u},
        {2u, 2u, 0u, 0u},
        {2u, 2u, 1u, 0u},
        {2u, 2u, 1u, 1u}
    };
    unsigned i;

    printf("Testing sexagesimal CONS extrusion closure law\n");

    for (i = 0u; i < 6u; i += 1u) {
        omi_polyform_coordinate_t car;
        omi_polyform_coordinate_t cdr;
        omi_sexagesimal_closure_t closure;
        omi_sexagesimal_closure_t reversed;
        char expected_readout[16];

        make_fixture_block(0u, 0u, 0u, 0u, "fixture.car", &car);
        make_fixture_block(fixture_points[i][0],
                           fixture_points[i][1],
                           fixture_points[i][2],
                           fixture_points[i][3],
                           "fixture.cdr",
                           &cdr);

        assert(omi_polyform_coordinate_closure_from_points(&car, &cdr, &closure) == 1);
        assert(omi_polyform_coordinate_validate_closure(&closure) == 1);
        assert(closure.distance_squared == (i + 1u));
        assert(closure.distance_class == (i + 1u));
        assert(closure.sexagesimal_slot == expected_slots[i]);
        assert(closure.public_frame240 < OMI_POLYFORM_PUBLIC_240);
        snprintf(expected_readout, sizeof(expected_readout), "%u:%u", closure.orientation4, closure.sexagesimal_slot);
        assert(strcmp(closure.sexagesimal_readout, expected_readout) == 0);

        assert(omi_polyform_coordinate_closure_reverse(&closure, &reversed) == 1);
        assert(omi_polyform_coordinate_validate_closure(&reversed) == 1);
        assert(reversed.distance_squared == closure.distance_squared);
        assert(reversed.distance_class == closure.distance_class);
        assert(reversed.orientation4 == ((closure.orientation4 + 2u) % 4u));
        assert(reversed.public_frame240 == (reversed.orientation4 * OMI_POLYFORM_LOCAL_60) + reversed.sexagesimal_slot);
        assert(strcmp(reversed.sexagesimal_readout, closure.sexagesimal_readout) != 0);
    }

    printf("  OK synthetic sqrt1..sqrt6 closures map into 60-slot and 240-frame witnesses\n\n");
}

int main(void)
{
    printf("Testing Phase 54 - OMI Polyform Coordinate Law\n");
    printf("==============================================\n\n");

    test_path_mapping();
    test_unknown_path_and_timing();
    test_cons_geometry_and_overlay();
    test_sexagesimal_closure_law();

    printf("==============================================\n");
    printf("ALL PHASE 54 POLYFORM COORDINATE TESTS PASSED\n");
    return 0;
}
