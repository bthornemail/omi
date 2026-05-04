#include "../include/omi_texture_model.h"

#include <stdio.h>
#include <string.h>

static int contains(const char *text, const char *needle)
{
    return text && strstr(text, needle) != 0;
}

static int extract_after(const char *text, const char *prefix, char *out, unsigned out_size)
{
    const char *p = strstr(text, prefix);
    if (!p || out_size == 0u) {
        return 0;
    }
    p += strlen(prefix);
    unsigned i = 0;
    while (*p && *p != ')' && *p != '(' && *p != '\n' && *p != '\r' && *p != ' ' && *p != '\t') {
        if (i + 1u < out_size) {
            out[i++] = *p;
        }
        p++;
    }
    out[i] = '\0';
    return i != 0u;
}

static unsigned hash_text(unsigned hash, const char *text)
{
    for (const unsigned char *p = (const unsigned char *)text; p && *p; p++) {
        hash ^= (unsigned)*p;
        hash *= 16777619u;
    }
    return hash;
}

int omi_texture_model_parse(const char *text, omi_texture_model_t *texture)
{
    if (!text || !texture) {
        return 0;
    }
    *texture = (omi_texture_model_t){0};
    if (!extract_after(text, "(FS . ", texture->id, sizeof(texture->id)) ||
        strncmp(texture->id, "texture.", 8u) != 0) {
        return 0;
    }
    extract_after(text, "((US . value) . ", texture->material, sizeof(texture->material));
    extract_after(text, "((US . primitive) . ", texture->primitive, sizeof(texture->primitive));
    texture->target = contains(text, "(GS . target)") ? 1u : 0u;
    texture->resolution = contains(text, "(GS . resolution)") ? 1u : 0u;
    return texture->target && texture->resolution && texture->material[0] && texture->primitive[0];
}

int omi_texture_project(const omi_texture_model_t *texture,
                        const omi_projection_view_t *projection,
                        omi_texture_projection_t *out)
{
    if (!texture || !projection || !out) {
        return 0;
    }
    *out = (omi_texture_projection_t){0};
    out->texture_id = texture->id;
    out->handle_id = projection->handle_id;
    out->depth_name = projection->depth_name;
    int n = snprintf(out->trace,
                     sizeof(out->trace),
                     "TEXTURE id=%s target=%s depth=%s material=%s primitive=%s projection-only",
                     texture->id,
                     projection->handle_id,
                     projection->depth_name,
                     texture->material,
                     texture->primitive);
    if (n < 0 || (unsigned)n >= sizeof(out->trace)) {
        *out = (omi_texture_projection_t){0};
        return 0;
    }
    out->receipt_hash = hash_text(2166136261u, out->trace);
    return 1;
}
