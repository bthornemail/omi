#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "omi_diagram_template.h"

void omi_serial_init(void) {}
void omi_serial_write_char(char c) { (void)c; }
void omi_serial_write_string(const char *text) { (void)text; }
void omi_serial_write_u32(uint32_t value) { (void)value; }
void omi_serial_write_size(size_t value) { (void)value; }
void omi_serial_write_hex8(uint8_t value) { (void)value; }
void omi_serial_write_hex32(uint32_t value) { (void)value; }

static int read_file(const char *path, char *buf, unsigned size)
{
    FILE *f = fopen(path, "rb");
    if (!f) {
        return 0;
    }
    size_t n = fread(buf, 1u, size - 1u, f);
    fclose(f);
    buf[n] = '\0';
    return n > 0u;
}

static void test_diagram_templates(void)
{
    static const char *const paths[] = {
        "diagrams/angle-trisection.omilisp",
        "diagrams/double-cube-distance.omilisp",
        "diagrams/carry-lookahead-adder.omilisp",
        "diagrams/genaille-division-rods.omilisp",
        "diagrams/karnaugh-map-torus.omilisp",
        "diagrams/qpbo-graph.omilisp",
        "diagrams/smith-chart.omilisp",
    };

    printf("Testing diagram template declarations\n");

    omi_user_mount_table_t table;
    assert(omi_user_init_mount_registry(&table) == 1);
    const omi_user_model_handle_t *trailer =
        omi_user_init_find_handle(&table, "model.trailer.wike-ebike-cargo");
    assert(trailer != 0);

    for (unsigned i = 0; i < sizeof(paths) / sizeof(paths[0]); i++) {
        char text[2048];
        omi_diagram_template_t model;
        omi_projection_view_t projection;
        omi_diagram_trace_t trace;
        assert(read_file(paths[i], text, sizeof(text)) == 1);
        assert(omi_diagram_template_parse(text, &model) == 1);
        assert(strncmp(model.id, "diagram.", 8u) == 0);
        assert(omi_lazy_project_handle(trailer, OMI_DEPTH_FS_GS_RS, &projection) == 1);
        assert(omi_diagram_template_emit(&model, &projection, &trace) == 1);
        assert(strstr(trace.trace, "DIAGRAM id=diagram.") != 0);
        assert(strstr(trace.trace, "causal=false") != 0);
        assert(trace.receipt_hash != 0u);
    }

    assert(trailer->expanded == 0u);
    assert(table.expansion_count == 0u);

    printf("  OK all seven diagram templates emit deterministic traces\n\n");
}

int main(void)
{
    printf("Testing Phase 40D - Diagram Template Models\n");
    printf("===========================================\n\n");
    test_diagram_templates();
    printf("===========================================\n");
    printf("ALL PHASE 40D DIAGRAM TEMPLATE TESTS PASSED\n");
    return 0;
}
