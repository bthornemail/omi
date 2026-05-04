#include <assert.h>
#include <stdio.h>
#include <string.h>

#include "omi_intent_model.h"

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

static void test_required_intents(void)
{
    static const char *const paths[] = {
        "intents/inspect-model.omilisp",
        "intents/render-far.omilisp",
        "intents/render-middle.omilisp",
        "intents/render-near.omilisp",
        "intents/render-inspect.omilisp",
        "intents/show-relations.omilisp",
        "intents/scan-carrier.omilisp",
        "intents/hotplug-declaration.omilisp",
        "intents/apply-texture.omilisp",
        "intents/generate-diagram.omilisp",
        "intents/compare-models.omilisp",
        "intents/query-synset.omilisp",
    };

    printf("Testing intent declaration parsing and event selection\n");

    for (unsigned i = 0; i < sizeof(paths) / sizeof(paths[0]); i++) {
        char text[2048];
        char trace[OMI_INTENT_TRACE_MAX];
        omi_intent_model_t intent;
        omi_event_model_t event;
        assert(read_file(paths[i], text, sizeof(text)) == 1);
        assert(omi_intent_model_parse(text, &intent) == 1);
        assert(strncmp(intent.id, "intent.", 7u) == 0);
        assert(omi_intent_model_trace(&intent, trace, sizeof(trace)) == 1);
        assert(strstr(trace, "mutation=forbidden") != 0 ||
               strstr(text, "append-only-overlay") != 0);
        assert(omi_intent_model_selects_handle(&intent, "model.trailer.wike-ebike-cargo") == 1);
        assert(omi_intent_model_to_event(&intent, "model.trailer.wike-ebike-cargo", &event) == 1);
        assert(strncmp(event.id, "event.", 6u) == 0);
        assert(event.master == 5040u);
    }

    printf("  OK intents parse, select handles, and produce event declarations\n\n");
}

int main(void)
{
    printf("Testing Phase 40B - Intent Models\n");
    printf("==================================\n\n");
    test_required_intents();
    printf("==================================\n");
    printf("ALL PHASE 40B INTENT MODEL TESTS PASSED\n");
    return 0;
}
