#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

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

static void test_texture_models(void)
{
    static const char *const paths[] = {
        "textures/aluminum-panel.omilisp",
        "textures/black-rubber-wheel.omilisp",
        "textures/red-reflector.omilisp",
        "textures/orange-safety-triangle.omilisp",
        "textures/black-corner-block.omilisp",
        "textures/stainless-tow-arm.omilisp",
        "textures/barcode-ink.omilisp",
    };

    printf("Testing texture declarations and projections\n");

    omi_user_mount_table_t table;
    assert(omi_user_init_mount_registry(&table) == 1);
    const omi_user_model_handle_t *trailer =
        omi_user_init_find_handle(&table, "model.trailer.wike-ebike-cargo");
    assert(trailer != 0);

    for (unsigned i = 0; i < sizeof(paths) / sizeof(paths[0]); i++) {
        char text[2048];
        omi_texture_model_t texture;
        omi_projection_view_t projection;
        omi_texture_projection_t out;
        assert(read_file(paths[i], text, sizeof(text)) == 1);
        assert(omi_texture_model_parse(text, &texture) == 1);
        assert(strncmp(texture.id, "texture.", 8u) == 0);
        assert(omi_lazy_project_handle(trailer, OMI_DEPTH_FS_GS_RS_US, &projection) == 1);
        assert(omi_texture_project(&texture, &projection, &out) == 1);
        assert(strstr(out.trace, "projection-only") != 0);
        assert(out.receipt_hash != 0u);
    }

    assert(trailer->expanded == 0u);
    assert(table.expansion_count == 0u);

    printf("  OK textures bind to model parts by depth without mutation\n\n");
}

int main(void)
{
    printf("Testing Phase 40C - Texture Models\n");
    printf("===================================\n\n");
    test_texture_models();
    printf("===================================\n");
    printf("ALL PHASE 40C TEXTURE MODEL TESTS PASSED\n");
    return 0;
}
