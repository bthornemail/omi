#include "../kernel/include/bom.h"
#include "../kernel/include/graph.h"
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

static int load_file(const char *path, omi_memory_view_t *memory)
{
    FILE *in = fopen(path, "rb");
    if (!in) {
        perror(path);
        return 1;
    }

    if (fseek(in, 0, SEEK_END) != 0) {
        perror(path);
        fclose(in);
        return 1;
    }

    long len = ftell(in);
    if (len < 0) {
        perror(path);
        fclose(in);
        return 1;
    }

    rewind(in);

    uint8_t *bytes = malloc((size_t)len);
    if (!bytes) {
        perror("malloc");
        fclose(in);
        return 1;
    }

    if (fread(bytes, 1, (size_t)len, in) != (size_t)len) {
        perror(path);
        free(bytes);
        fclose(in);
        return 1;
    }

    fclose(in);
    memory->bytes = bytes;
    memory->len = (size_t)len;
    return 0;
}

static uint32_t checksum(omi_memory_view_t memory)
{
    uint32_t hash = 2166136261u;
    for (size_t i = 0; i < memory.len; i++) {
        hash ^= memory.bytes[i];
        hash *= 16777619u;
    }
    return hash;
}

static omi_cons_summary_t print_tick(omi_tick_t tick, omi_memory_view_t memory)
{
    omi_cons_summary_t summary = omi_compute_cons_summary(memory);
    printf("BOM tick %u: bytes=%zu bindings=%zu null=%zu transient=%zu checksum=%08x\n",
           (unsigned)tick,
           memory.len,
           summary.bindings,
           summary.null_collapses,
           summary.transients,
           checksum(memory));
    return summary;
}

int main(int argc, char **argv)
{
    const char *path = argc > 1 ? argv[1] : "vm_image/omi.img";
    unsigned ticks = argc > 2 ? (unsigned)strtoul(argv[2], NULL, 10) : 3u;
    omi_memory_view_t memory = {.bytes = NULL, .len = 0};
    omi_bom_clock_t clock;

    if (load_file(path, &memory) != 0) {
        return 1;
    }

    omi_bom_init(&clock);
    omi_cons_summary_t first = print_tick(clock.tick, memory);

    for (unsigned i = 0; i < ticks; i++) {
        omi_invert_byte_order(memory);
        omi_bom_advance(&clock);
        (void)print_tick(clock.tick, memory);
    }

    omi_invert_byte_order(memory);
    omi_cons_summary_t replay = omi_compute_cons_summary(memory);
    if (first.bindings != replay.bindings ||
        first.null_collapses != replay.null_collapses ||
        first.transients != replay.transients) {
        fprintf(stderr, "replay mismatch after BOM inversion cycle\n");
        free(memory.bytes);
        return 1;
    }

    puts("replay deterministic");
    free(memory.bytes);
    return 0;
}
