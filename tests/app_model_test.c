#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "omi_app_model.h"

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

static void assert_contains(const char *text, const char *needle)
{
    assert(strstr(text, needle) != 0);
}

static void test_app_declarations_parse(void)
{
    printf("Testing app declaration parsing\n");

    char trailer_text[4096];
    char world_text[4096];
    char trace[OMI_APP_TRACE_MAX];
    omi_app_model_t trailer;
    omi_app_model_t world;

    assert(read_file("apps/trailer-inspector.omilisp", trailer_text, sizeof(trailer_text)) == 1);
    assert(read_file("apps/world-browser.omilisp", world_text, sizeof(world_text)) == 1);
    assert(omi_app_model_parse(trailer_text, &trailer) == 1);
    assert(omi_app_model_parse(world_text, &world) == 1);

    assert(strcmp(trailer.id, "app.trailer-inspector") == 0);
    assert(strcmp(trailer.accepted_id, "model.trailer.wike-ebike-cargo") == 0);
    assert(strcmp(trailer.default_intent, "intent.inspect-model") == 0);
    assert(strcmp(trailer.default_projection, "inspect") == 0);
    assert(strcmp(world.id, "app.world-browser") == 0);
    assert(strcmp(world.accepted_id, "world.cargo-yard-demo") == 0);
    assert(strcmp(world.default_intent, "intent.render-middle") == 0);
    assert(strcmp(world.default_projection, "middle") == 0);

    assert(omi_app_model_trace(&trailer, trace, sizeof(trace)) == 1);
    assert_contains(trace, "mutation=forbidden");
    assert(omi_app_model_trace(&world, trace, sizeof(trace)) == 1);
    assert_contains(trace, "causal=false");

    printf("  OK app declarations parse deterministically\n\n");
}

static void test_app_selects_handles_and_requests(void)
{
    printf("Testing app handle selection and request composition\n");

    char trailer_text[4096];
    char world_text[4096];
    omi_app_model_t trailer_app;
    omi_app_model_t world_app;
    omi_user_mount_table_t table;

    assert(read_file("apps/trailer-inspector.omilisp", trailer_text, sizeof(trailer_text)) == 1);
    assert(read_file("apps/world-browser.omilisp", world_text, sizeof(world_text)) == 1);
    assert(omi_app_model_parse(trailer_text, &trailer_app) == 1);
    assert(omi_app_model_parse(world_text, &world_app) == 1);
    assert(omi_user_init_mount_registry(&table) == 1);

    const omi_user_model_handle_t *trailer =
        omi_app_model_select_handle(&trailer_app, &table, 0);
    const omi_user_model_handle_t *world =
        omi_app_model_select_handle(&world_app, &table, 0);
    assert(trailer != 0);
    assert(world != 0);
    assert(strcmp(trailer->id, "model.trailer.wike-ebike-cargo") == 0);
    assert(strcmp(world->id, "world.cargo-yard-demo") == 0);

    omi_app_request_result_t render;
    omi_app_request_result_t again;
    assert(omi_app_model_request(&trailer_app,
                                 &table,
                                 0,
                                 OMI_APP_REQUEST_RENDER,
                                 &render) == 1);
    assert(omi_app_model_request(&trailer_app,
                                 &table,
                                 0,
                                 OMI_APP_REQUEST_RENDER,
                                 &again) == 1);
    assert(strcmp(render.trace, again.trace) == 0);
    assert(render.receipt_hash == again.receipt_hash);
    assert(strcmp(render.projection.depth_name, "FS.GS.RS.US") == 0);
    assert(strcmp(render.event.id, "event.render-request") == 0);
    assert(strncmp(render.intent.id, "intent.", 7u) == 0);
    assert_contains(render.texture.trace, "TEXTURE id=texture.aluminum-panel");
    assert_contains(render.diagram.trace, "DIAGRAM id=diagram.smith-chart");
    assert_contains(render.render.trace, "POLYFORM_RENDER");
    assert_contains(render.render.trace, "output=rails.latches.reflectors.hinges.spokes");

    omi_app_request_result_t projection;
    assert(omi_app_model_request(&trailer_app,
                                 &table,
                                 0,
                                 OMI_APP_REQUEST_PROJECTION,
                                 &projection) == 1);
    assert(strcmp(projection.projection.depth_name, "full-trace") == 0);
    assert(projection.projection.full_trace_available == 1u);

    omi_app_request_result_t event;
    assert(omi_app_model_request(&trailer_app,
                                 &table,
                                 0,
                                 OMI_APP_REQUEST_EVENT,
                                 &event) == 1);
    assert(strcmp(event.event.id, "event.render-request") == 0);

    omi_app_request_result_t intent;
    assert(omi_app_model_request(&trailer_app,
                                 &table,
                                 0,
                                 OMI_APP_REQUEST_INTENT,
                                 &intent) == 1);
    assert(strncmp(intent.intent.id, "intent.", 7u) == 0);

    omi_app_request_result_t texture;
    assert(omi_app_model_request(&trailer_app,
                                 &table,
                                 0,
                                 OMI_APP_REQUEST_TEXTURE,
                                 &texture) == 1);
    assert_contains(texture.texture.trace, "projection-only");

    omi_app_request_result_t diagram;
    assert(omi_app_model_request(&trailer_app,
                                 &table,
                                 0,
                                 OMI_APP_REQUEST_DIAGRAM,
                                 &diagram) == 1);
    assert_contains(diagram.diagram.trace, "causal=false");

    omi_app_request_result_t world_render;
    assert(omi_app_model_request(&world_app,
                                 &table,
                                 0,
                                 OMI_APP_REQUEST_RENDER,
                                 &world_render) == 1);
    assert(strcmp(world_render.projection.depth_name, "FS.GS.RS") == 0);
    assert_contains(world_render.render.trace, "trailer,bicycle,cargo");
    assert_contains(world_render.render.trace, "hitch-link.001");

    assert(trailer->expanded == 0u);
    assert(world->expanded == 0u);
    assert(table.expansion_count == 0u);

    printf("  OK apps compose existing surfaces without mutation\n\n");
}

int main(void)
{
    printf("Testing Phase 41 - Declarative Applications as Models\n");
    printf("=====================================================\n\n");

    test_app_declarations_parse();
    test_app_selects_handles_and_requests();

    printf("=====================================================\n");
    printf("ALL PHASE 41 APP MODEL TESTS PASSED\n");
    return 0;
}
