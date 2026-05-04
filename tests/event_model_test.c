#include <assert.h>
#include <stdio.h>
#include <string.h>

#include "omi_event_model.h"

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

static void test_required_event_declarations(void)
{
    static const char *const paths[] = {
        "events/vfs-resolve.omilisp",
        "events/lazy-project.omilisp",
        "events/render-request.omilisp",
        "events/carrier-scan.omilisp",
        "events/model-hotplug.omilisp",
        "events/pointer-select.omilisp",
        "events/query-request.omilisp",
        "events/texture-request.omilisp",
        "events/diagram-request.omilisp",
    };

    printf("Testing event declaration parsing\n");

    omi_event_log_t log;
    omi_event_log_init(&log);

    for (unsigned i = 0; i < sizeof(paths) / sizeof(paths[0]); i++) {
        char text[2048];
        omi_event_model_t event;
        char trace[OMI_EVENT_TRACE_MAX];
        assert(read_file(paths[i], text, sizeof(text)) == 1);
        assert(omi_event_model_parse(text, &event) == 1);
        assert(strncmp(event.id, "event.", 6u) == 0);
        assert(event.has_source == 1u);
        assert(event.has_target == 1u);
        assert(event.has_relation == 1u);
        assert(event.has_timing == 1u);
        assert(omi_event_model_trace(&event, trace, sizeof(trace)) == 1);
        assert(strstr(trace, "causal=false") != 0);
        assert(omi_event_log_append(&log, &event) == 1);
    }

    assert(log.count == 9u);
    assert(log.append_count == 9u);
    assert(strcmp(log.events[2].id, "event.render-request") == 0);

    printf("  OK event IDs, source/target/relation/timing, and append log are stable\n\n");
}

int main(void)
{
    printf("Testing Phase 40A - Event Models\n");
    printf("=================================\n\n");
    test_required_event_declarations();
    printf("=================================\n");
    printf("ALL PHASE 40A EVENT MODEL TESTS PASSED\n");
    return 0;
}
