#include "../include/omi_model_loader.h"

#include <ctype.h>
#include <string.h>

typedef struct {
    unsigned fs;
    unsigned gs;
    unsigned rs;
    unsigned us;
    char id[OMI_MODEL_ID_MAX];
} parsed_declaration_t;

static const char *const policy_lazy = "lazy";
static const char *const authority_hotplug = "hotplug-declaration";
static const char *const depth_far = "FS.GS";
static const char *const depth_middle = "FS.GS.RS";
static const char *const depth_near = "FS.GS.RS.US";
static const char *const depth_inspect = "full-trace";

void omi_model_overlay_init(omi_model_overlay_t *overlay)
{
    if (overlay) {
        *overlay = (omi_model_overlay_t){0};
    }
}

static const char *skip_ws_and_comments(const char *p)
{
    for (;;) {
        while (*p != '\0' && isspace((unsigned char)*p)) {
            p++;
        }
        if (*p != ';') {
            return p;
        }
        while (*p != '\0' && *p != '\n') {
            p++;
        }
    }
}

static const char *skip_string(const char *p)
{
    p++;
    while (*p != '\0') {
        if (*p == '\\' && p[1] != '\0') {
            p += 2;
            continue;
        }
        if (*p == '"') {
            return p + 1;
        }
        p++;
    }
    return p;
}

static int symbol_char(char c)
{
    return c != '\0' &&
           !isspace((unsigned char)c) &&
           c != '(' &&
           c != ')' &&
           c != ';';
}

static const char *read_symbol(const char *p, char *out, unsigned out_size)
{
    unsigned len = 0;
    while (symbol_char(*p)) {
        if (len + 1u < out_size) {
            out[len++] = *p;
        }
        p++;
    }
    out[len] = '\0';
    return p;
}

static void count_plane(parsed_declaration_t *parsed, const char *plane)
{
    if (strcmp(plane, "FS") == 0) {
        parsed->fs++;
    } else if (strcmp(plane, "GS") == 0) {
        parsed->gs++;
    } else if (strcmp(plane, "RS") == 0) {
        parsed->rs++;
    } else if (strcmp(plane, "US") == 0) {
        parsed->us++;
    }
}

static int accepted_id(const char *id)
{
    return strncmp(id, "model.", 6u) == 0 || strncmp(id, "world.", 6u) == 0;
}

static int parse_declaration(const char *text, parsed_declaration_t *parsed)
{
    const char *p = text;
    *parsed = (parsed_declaration_t){0};

    while (*p != '\0') {
        p = skip_ws_and_comments(p);
        if (*p == '"') {
            p = skip_string(p);
            continue;
        }
        if (*p != '(') {
            p++;
            continue;
        }

        p++;
        p = skip_ws_and_comments(p);

        char plane[8];
        const char *after_plane = read_symbol(p, plane, sizeof(plane));
        if (strcmp(plane, "FS") != 0 &&
            strcmp(plane, "GS") != 0 &&
            strcmp(plane, "RS") != 0 &&
            strcmp(plane, "US") != 0) {
            p = after_plane;
            continue;
        }

        const char *after_ws = skip_ws_and_comments(after_plane);
        if (*after_ws != '.') {
            p = after_ws;
            continue;
        }

        after_ws++;
        after_ws = skip_ws_and_comments(after_ws);
        char value[OMI_MODEL_ID_MAX];
        read_symbol(after_ws, value, sizeof(value));

        count_plane(parsed, plane);
        if (strcmp(plane, "FS") == 0 && accepted_id(value)) {
            if (parsed->id[0] == '\0') {
                strncpy(parsed->id, value, sizeof(parsed->id) - 1u);
            }
        }

        p = after_ws;
    }

    return parsed->fs == 1u &&
           parsed->gs >= 1u &&
           parsed->rs >= 1u &&
           parsed->us >= 1u &&
           parsed->id[0] != '\0';
}

static unsigned fnv1a(const char *text)
{
    unsigned hash = 2166136261u;
    for (const unsigned char *p = (const unsigned char *)text; p && *p; p++) {
        hash ^= (unsigned)*p;
        hash *= 16777619u;
    }
    return hash;
}

static void copy_string(char *dst, unsigned dst_size, const char *src)
{
    if (dst_size == 0u) {
        return;
    }
    strncpy(dst, src, dst_size - 1u);
    dst[dst_size - 1u] = '\0';
}

static void build_uri(char *dst, unsigned dst_size, const char *id)
{
    const char *prefix = strncmp(id, "world.", 6u) == 0 ? "omi://world/" : "omi://model/";
    if (dst_size == 0u) {
        return;
    }
    dst[0] = '\0';
    strncat(dst, prefix, dst_size - 1u);
    strncat(dst, id, dst_size - strlen(dst) - 1u);
}

const omi_user_model_handle_t *omi_model_overlay_find_handle(const omi_model_overlay_t *overlay,
                                                            const char *id)
{
    if (!overlay || !id) {
        return 0;
    }

    for (unsigned i = 0; i < overlay->count; i++) {
        if (strcmp(overlay->entries[i].id_storage, id) == 0) {
            return &overlay->entries[i].handle;
        }
    }

    return 0;
}

int omi_model_loader_load_text(omi_model_overlay_t *overlay,
                               const char *text,
                               omi_model_load_result_t *result)
{
    if (result) {
        *result = (omi_model_load_result_t){0};
    }

    if (!overlay || !text || overlay->count >= OMI_MODEL_OVERLAY_MAX) {
        return 0;
    }

    parsed_declaration_t parsed;
    if (!parse_declaration(text, &parsed)) {
        return 0;
    }

    if (omi_model_overlay_find_handle(overlay, parsed.id) != 0) {
        return 0;
    }

    omi_overlay_model_entry_t *entry = &overlay->entries[overlay->count];
    *entry = (omi_overlay_model_entry_t){0};
    copy_string(entry->id_storage, sizeof(entry->id_storage), parsed.id);
    build_uri(entry->uri_storage, sizeof(entry->uri_storage), parsed.id);
    entry->receipt_hash = fnv1a(text);

    entry->handle = (omi_user_model_handle_t){
        .kind = strncmp(parsed.id, "world.", 6u) == 0 ? OMI_USER_HANDLE_WORLD : OMI_USER_HANDLE_MODEL,
        .uri = entry->uri_storage,
        .id = entry->id_storage,
        .fs_count = parsed.fs,
        .gs_count = parsed.gs,
        .rs_count = parsed.rs,
        .us_count = parsed.us,
        .authority = authority_hotplug,
        .default_policy = policy_lazy,
        .far_depth = depth_far,
        .middle_depth = depth_middle,
        .near_depth = depth_near,
        .inspect_depth = depth_inspect,
        .expanded = 0u,
    };

    overlay->count++;
    overlay->append_count++;

    if (result) {
        *result = (omi_model_load_result_t){
            .fs_count = parsed.fs,
            .gs_count = parsed.gs,
            .rs_count = parsed.rs,
            .us_count = parsed.us,
            .receipt_hash = entry->receipt_hash,
            .model_id = entry->id_storage,
        };
    }

    return 1;
}
