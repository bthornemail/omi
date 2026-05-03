#include <assert.h>
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    unsigned fs;
    unsigned gs;
    unsigned rs;
    unsigned us;
} plane_counts_t;

typedef struct {
    const char *path;
    plane_counts_t counts;
} model_trace_t;

static char *read_file(const char *path)
{
    FILE *file = fopen(path, "rb");
    assert(file != NULL);

    assert(fseek(file, 0, SEEK_END) == 0);
    long size = ftell(file);
    assert(size >= 0);
    rewind(file);

    char *buffer = calloc((size_t)size + 1u, 1u);
    assert(buffer != NULL);

    size_t read_count = fread(buffer, 1u, (size_t)size, file);
    assert(read_count == (size_t)size);
    assert(fclose(file) == 0);
    return buffer;
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
    assert(*p == '"');
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

static const char *read_symbol(const char *p, char *out, size_t out_size)
{
    size_t len = 0;
    while (symbol_char(*p)) {
        if (len + 1u < out_size) {
            out[len++] = *p;
        }
        p++;
    }
    out[len] = '\0';
    return p;
}

static void count_plane(plane_counts_t *counts, const char *plane)
{
    if (strcmp(plane, "FS") == 0) {
        counts->fs++;
    } else if (strcmp(plane, "GS") == 0) {
        counts->gs++;
    } else if (strcmp(plane, "RS") == 0) {
        counts->rs++;
    } else if (strcmp(plane, "US") == 0) {
        counts->us++;
    }
}

static plane_counts_t count_planes(const char *text)
{
    plane_counts_t counts = {0};
    const char *p = text;

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
        if (*after_ws == '.') {
            count_plane(&counts, plane);
        }
        p = after_ws;
    }

    return counts;
}

static void assert_counts(plane_counts_t actual, plane_counts_t expected)
{
    assert(actual.fs == expected.fs);
    assert(actual.gs == expected.gs);
    assert(actual.rs == expected.rs);
    assert(actual.us == expected.us);
}

static void assert_contains(const char *text, const char *needle)
{
    assert(strstr(text, needle) != NULL);
}

static model_trace_t load_trace(const char *path)
{
    char *text = read_file(path);
    model_trace_t trace = {
        .path = path,
        .counts = count_planes(text)
    };
    free(text);
    return trace;
}

static void test_trailer_model_counts(void)
{
    printf("Testing trailer model declaration\n");

    model_trace_t trace = load_trace("models/trailer/wike-ebike-cargo-trailer.alist");
    plane_counts_t expected = {
        .fs = 1u,
        .gs = 9u,
        .rs = 29u,
        .us = 76u
    };

    assert_counts(trace.counts, expected);

    printf("  MODEL_TRACE object=model.trailer.wike-ebike-cargo fs=%u gs=%u rs=%u us=%u\n",
           trace.counts.fs, trace.counts.gs, trace.counts.rs, trace.counts.us);
    printf("  OK trailer model parses deterministically\n\n");
}

static void test_world_model_counts(void)
{
    printf("Testing cargo-yard world declaration\n");

    model_trace_t trace = load_trace("models/world/cargo-yard-demo.alist");
    plane_counts_t expected = {
        .fs = 1u,
        .gs = 3u,
        .rs = 7u,
        .us = 22u
    };

    assert_counts(trace.counts, expected);

    printf("  WORLD_TRACE world=world.cargo-yard-demo fs=%u gs=%u rs=%u us=%u\n",
           trace.counts.fs, trace.counts.gs, trace.counts.rs, trace.counts.us);
    printf("  OK world model parses deterministically\n\n");
}

static void test_world_interactions(void)
{
    printf("Testing stable world interaction records\n");

    char *text = read_file("models/world/cargo-yard-demo.alist");

    assert_contains(text, "((RS . hitch-link.001)");
    assert_contains(text, "((US . source)   . bicycle.001.hitch)");
    assert_contains(text, "((US . target)   . trailer.001.tow-arm)");
    assert_contains(text, "((US . relation) . coupled-traction)");

    assert_contains(text, "((RS . load-support.001)");
    assert_contains(text, "((US . source)   . cargo.001.mass)");
    assert_contains(text, "((US . target)   . trailer.001.panel.floor)");
    assert_contains(text, "((US . relation) . supported-by)");

    assert_contains(text, "((RS . rolling.001)");
    assert_contains(text, "((US . source)   . bicycle.001.forward-motion)");
    assert_contains(text, "((US . target)   . trailer.001.motion)");
    assert_contains(text, "((US . relation) . transmitted-motion)");

    printf("  WORLD_TRACE relation=hitch-link.001 source=bicycle.001.hitch target=trailer.001.tow-arm relation=coupled-traction\n");
    printf("  WORLD_TRACE relation=load-support.001 source=cargo.001.mass target=trailer.001.panel.floor relation=supported-by\n");
    printf("  WORLD_TRACE relation=rolling.001 source=bicycle.001.forward-motion target=trailer.001.motion relation=transmitted-motion\n");
    printf("  OK interactions are declarative relation records\n\n");

    free(text);
}

static void test_render_projection_depths(void)
{
    printf("Testing render projection depths\n");

    char *trailer = read_file("models/trailer/wike-ebike-cargo-trailer.alist");
    char *world = read_file("models/world/cargo-yard-demo.alist");

    assert_contains(trailer, "((RS . far)");
    assert_contains(trailer, "((US . depth)      . FS.GS)");
    assert_contains(trailer, "((RS . middle)");
    assert_contains(trailer, "((US . depth)      . FS.GS.RS)");
    assert_contains(trailer, "((RS . near)");
    assert_contains(trailer, "((US . depth)      . FS.GS.RS.US)");
    assert_contains(trailer, "((RS . inspect)");
    assert_contains(trailer, "((US . depth)      . full-trace)");

    assert_contains(world, "((US . far)     . FS.GS)");
    assert_contains(world, "((US . middle)  . FS.GS.RS)");
    assert_contains(world, "((US . near)    . FS.GS.RS.US)");
    assert_contains(world, "((US . inspect) . full-trace)");

    printf("  MODEL_TRACE projection=far depth=FS.GS\n");
    printf("  MODEL_TRACE projection=middle depth=FS.GS.RS\n");
    printf("  MODEL_TRACE projection=near depth=FS.GS.RS.US\n");
    printf("  MODEL_TRACE projection=inspect depth=full-trace\n");
    printf("  OK render depths are non-causal FS/GS/RS/US projections\n\n");

    free(trailer);
    free(world);
}

int main(void)
{
    printf("Testing Phase 32 - Canonical Model Base\n");
    printf("=======================================\n\n");

    test_trailer_model_counts();
    test_world_model_counts();
    test_world_interactions();
    test_render_projection_depths();

    printf("=======================================\n");
    printf("ALL PHASE 32 MODEL TRACE TESTS PASSED\n");
    return 0;
}
