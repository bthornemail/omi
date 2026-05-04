#include <assert.h>
#include <stdio.h>
#include <string.h>

#include "omi_polyform_coordinate.h"
#include "omi_scope_multigraph.h"

static void make_fixture_block(unsigned x,
                               unsigned y,
                               unsigned z,
                               unsigned w,
                               const char *path,
                               omi_polyform_coordinate_t *out)
{
    *out = (omi_polyform_coordinate_t){0};
    snprintf(out->omi_path, sizeof(out->omi_path), "%s", path);
    snprintf(out->fs, sizeof(out->fs), "%s", "fixture");
    snprintf(out->gs, sizeof(out->gs), "%s", "multigraph");
    snprintf(out->rs, sizeof(out->rs), "%s", path);
    out->x = x;
    out->y = y;
    out->z = z;
    out->w = w;
    out->timing = (omi_polyform_timing_t){
        .master_5040 = OMI_POLYFORM_MASTER_5040,
        .public_240 = OMI_POLYFORM_PUBLIC_240,
        .local_60 = OMI_POLYFORM_LOCAL_60,
        .operator_16 = OMI_POLYFORM_OPERATOR_16,
        .fano_7 = OMI_POLYFORM_FANO_7,
        .byte_8 = OMI_POLYFORM_BYTE_8
    };
    out->receipt_hash = x ^ (y << 1u) ^ (z << 2u) ^ (w << 3u) ^ 0x54c00001u;
}

static void test_scope_roundtrip(void)
{
    static const char *expected[3][3] = {
        {"public.global", "public.local", "public.remote"},
        {"private.global", "private.local", "private.remote"},
        {"protected.global", "protected.local", "protected.remote"}
    };
    unsigned v;
    unsigned l;

    printf("Testing scope encode/decode roundtrip\n");

    for (v = 0u; v < 3u; v += 1u) {
        for (l = 0u; l < 3u; l += 1u) {
            char scope[32];
            unsigned out_v = 99u;
            unsigned out_l = 99u;

            assert(omi_scope_multigraph_encode_scope(v, l, scope, sizeof(scope)) == 1);
            assert(strcmp(scope, expected[v][l]) == 0);
            assert(omi_scope_multigraph_decode_scope(scope, &out_v, &out_l) == 1);
            assert(out_v == v);
            assert(out_l == l);
        }
    }

    assert(omi_scope_multigraph_decode_scope("invalid.scope", &v, &l) == 0);
    printf("  OK all nine scope classes roundtrip deterministically\n\n");
}

static void test_canonical_and_barcode_edges(void)
{
    omi_polyform_coordinate_t trailer;
    omi_polyform_coordinate_t relation;
    omi_sexagesimal_closure_t closure;
    omi_multigraph_edge_t canonical;
    omi_multigraph_edge_t barcode;

    printf("Testing canonical and barcode multi-graph edges\n");

    assert(omi_polyform_coordinate_from_path("model.trailer.wike-ebike-cargo/motion/wheel.left",
                                             "circle",
                                             "record",
                                             "structural",
                                             "near",
                                             &trailer) == 1);
    assert(omi_polyform_coordinate_from_path("world.cargo-yard-demo/interactions/hitch-link.001",
                                             "relation",
                                             "edge",
                                             "relation-closure",
                                             "inspect",
                                             &relation) == 1);
    assert(omi_polyform_coordinate_closure_from_points(&trailer, &relation, &closure) == 1);
    assert(omi_scope_multigraph_canonical_edge(&trailer,
                                               &relation,
                                               &closure,
                                               OMI_SCOPE_VISIBILITY_PUBLIC,
                                               OMI_SCOPE_LOCATION_GLOBAL,
                                               &canonical) == 1);
    assert(omi_scope_multigraph_validate_edge(&canonical) == 1);
    assert(canonical.carrier == OMI_SCOPE_CARRIER_NONE);

    assert(omi_scope_multigraph_barcode_edge(&trailer,
                                             &relation,
                                             &closure,
                                             OMI_SCOPE_VISIBILITY_PUBLIC,
                                             OMI_SCOPE_LOCATION_REMOTE,
                                             closure.orientation4,
                                             &barcode) == 1);
    assert(omi_scope_multigraph_validate_edge(&barcode) == 1);
    assert(barcode.closure_receipt == canonical.closure_receipt);
    assert(barcode.receipt != canonical.receipt);
    assert(barcode.carrier == closure.orientation4);
    assert(barcode.orientation4 == closure.orientation4);

    assert(omi_scope_multigraph_barcode_edge(&trailer,
                                             &relation,
                                             &closure,
                                             OMI_SCOPE_VISIBILITY_PUBLIC,
                                             OMI_SCOPE_LOCATION_REMOTE,
                                             (closure.orientation4 + 1u) % 4u,
                                             &barcode) == 0);

    printf("  OK canonical structure and barcode projection share closure but not authority\n\n");
}

static void test_fixture_orientations(void)
{
    unsigned carrier;

    printf("Testing Code16K/Aztec/MaxiCode/BeeCode orientation roundtrip\n");

    for (carrier = 0u; carrier < 4u; carrier += 1u) {
        omi_polyform_coordinate_t from;
        omi_polyform_coordinate_t to;
        omi_sexagesimal_closure_t closure;
        omi_multigraph_edge_t edge;
        unsigned x_to = carrier == 0u ? 2u : 0u;
        unsigned y_to = carrier == 1u ? 2u : 0u;
        unsigned z_to = carrier == 2u ? 2u : 0u;
        unsigned w_to = carrier == 3u ? 2u : 0u;

        make_fixture_block(0u, 0u, 0u, 0u, "fixture.from", &from);
        make_fixture_block(x_to, y_to, z_to, w_to, "fixture.to", &to);

        assert(omi_polyform_coordinate_closure_from_points(&from, &to, &closure) == 1);
        assert(closure.orientation4 == carrier);
        assert(omi_scope_multigraph_barcode_edge(&from,
                                                 &to,
                                                 &closure,
                                                 OMI_SCOPE_VISIBILITY_PROTECTED,
                                                 OMI_SCOPE_LOCATION_REMOTE,
                                                 carrier,
                                                 &edge) == 1);
        assert(omi_scope_multigraph_validate_edge(&edge) == 1);
    }

    printf("  OK all four barcode orientations map deterministically\n\n");
}

int main(void)
{
    printf("Testing Phase 54C - Canonical / Barcode Multi-Graph Scope Law\n");
    printf("==============================================================\n\n");

    test_scope_roundtrip();
    test_canonical_and_barcode_edges();
    test_fixture_orientations();

    printf("==============================================================\n");
    printf("ALL PHASE 54C SCOPE MULTIGRAPH TESTS PASSED\n");
    return 0;
}
