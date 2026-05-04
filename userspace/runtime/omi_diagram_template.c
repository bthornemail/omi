#include "../include/omi_diagram_template.h"

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
    while (*p && *p != ')' && *p != '(' && *p != '\n' && *p != '\r') {
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

int omi_diagram_template_parse(const char *text, omi_diagram_template_t *template_model)
{
    if (!text || !template_model) {
        return 0;
    }
    *template_model = (omi_diagram_template_t){0};
    if (!extract_after(text, "(FS . ", template_model->id, sizeof(template_model->id)) ||
        strncmp(template_model->id, "diagram.", 8u) != 0) {
        return 0;
    }
    extract_after(text, "((US . primitives) . ", template_model->primitives, sizeof(template_model->primitives));
    template_model->accepts = contains(text, "(GS . accepts)") ? 1u : 0u;
    template_model->layout = contains(text, "(GS . layout)") ? 1u : 0u;
    template_model->timing = contains(text, "(GS . timing)") ? 1u : 0u;
    template_model->output = contains(text, "(GS . output)") ? 1u : 0u;
    return template_model->accepts &&
           template_model->layout &&
           template_model->timing &&
           template_model->output &&
           template_model->primitives[0] != '\0';
}

int omi_diagram_template_emit(const omi_diagram_template_t *template_model,
                              const omi_projection_view_t *projection,
                              omi_diagram_trace_t *out)
{
    if (!template_model || !projection || !out) {
        return 0;
    }
    *out = (omi_diagram_trace_t){0};
    out->template_id = template_model->id;
    out->handle_id = projection->handle_id;
    out->depth_name = projection->depth_name;
    int n = snprintf(out->trace,
                     sizeof(out->trace),
                     "DIAGRAM id=%s target=%s depth=%s primitives=%s causal=false",
                     template_model->id,
                     projection->handle_id,
                     projection->depth_name,
                     template_model->primitives);
    if (n < 0 || (unsigned)n >= sizeof(out->trace)) {
        *out = (omi_diagram_trace_t){0};
        return 0;
    }
    out->receipt_hash = hash_text(2166136261u, out->trace);
    return 1;
}
