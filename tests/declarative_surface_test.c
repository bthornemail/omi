#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "omi_diagram_template.h"
#include "omi_intent_model.h"
#include "omi_model_vfs.h"
#include "omi_polyform_renderer.h"
#include "omi_texture_model.h"

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

static void test_declarative_surface_path(void)
{
    printf("Testing intent -> event -> VFS -> lazy -> texture -> diagram/render\n");

    char intent_text[2048];
    char texture_text[2048];
    char diagram_text[2048];
    omi_intent_model_t intent;
    omi_event_model_t event;
    omi_user_mount_table_t table;
    omi_vfs_result_t vfs;
    omi_texture_model_t texture;
    omi_texture_projection_t texture_trace;
    omi_diagram_template_t diagram;
    omi_diagram_trace_t diagram_trace;
    omi_render_view_t render;

    assert(read_file("intents/render-near.omilisp", intent_text, sizeof(intent_text)) == 1);
    assert(read_file("textures/aluminum-panel.omilisp", texture_text, sizeof(texture_text)) == 1);
    assert(read_file("diagrams/smith-chart.omilisp", diagram_text, sizeof(diagram_text)) == 1);

    assert(omi_intent_model_parse(intent_text, &intent) == 1);
    assert(omi_intent_model_to_event(&intent, "model.trailer.wike-ebike-cargo", &event) == 1);
    assert(strcmp(event.id, "event.render-request") == 0);

    assert(omi_user_init_mount_registry(&table) == 1);
    assert(omi_model_vfs_resolve(&table,
                                 "/omi/projections/near/model.trailer.wike-ebike-cargo",
                                 &vfs) == 1);
    assert(vfs.kind == OMI_VFS_NODE_PROJECTION);
    assert(strcmp(vfs.projection.depth_name, "FS.GS.RS.US") == 0);

    assert(omi_texture_model_parse(texture_text, &texture) == 1);
    assert(omi_texture_project(&texture, &vfs.projection, &texture_trace) == 1);
    assert(strstr(texture_trace.trace, "texture.aluminum-panel") != 0);

    assert(omi_diagram_template_parse(diagram_text, &diagram) == 1);
    assert(omi_diagram_template_emit(&diagram, &vfs.projection, &diagram_trace) == 1);
    assert(strstr(diagram_trace.trace, "diagram.smith-chart") != 0);

    assert(omi_polyform_render_projection(&vfs.projection, &render) == 1);
    assert(strstr(render.trace, "output=rails.latches.reflectors.hinges.spokes") != 0);

    assert(vfs.handle->expanded == 0u);
    assert(table.expansion_count == 0u);
    assert(texture_trace.receipt_hash != 0u);
    assert(diagram_trace.receipt_hash != 0u);
    assert(render.receipt_hash != 0u);

    printf("  OK declarative surface composes without an app or mutation\n\n");
}

int main(void)
{
    printf("Testing Phase 40E - Declarative Surface Integration\n");
    printf("===================================================\n\n");
    test_declarative_surface_path();
    printf("===================================================\n");
    printf("ALL PHASE 40E DECLARATIVE SURFACE TESTS PASSED\n");
    return 0;
}
