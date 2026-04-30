#include "../kernel/include/bom.h"
#include "../kernel/include/graph.h"
#include "../kernel/include/rules.h"
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

#define SYMBOL_TRACE_LIMIT 4u

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

static void print_tick(omi_tick_t tick, omi_memory_view_t memory)
{
    omi_cons_summary_t summary = omi_compute_cons_summary(memory);
    printf("BOM tick %u: bytes=%zu bindings=%zu null=%zu transient=%zu checksum=%08x\n",
           (unsigned)tick,
           memory.len,
           summary.bindings,
           summary.null_collapses,
           summary.transients,
           checksum(memory));
}

static void print_orbit(uint32_t step, uint32_t addr, const omi_rules_state_t *state)
{
    printf("STEP %u: addr=0x%08x steps=%u bindings=%u null=%u transient=%u cons_edges=%u regions=%u orbit=0x%08x\n",
           step,
           addr,
           state->steps,
           state->summary.bindings,
           state->summary.nulls,
           state->summary.transients,
           state->cons_edge_count,
           state->region_count,
           state->orbit_id);
}

static void print_symbols(const omi_symbol_table_t *symbols)
{
    uint32_t limit = symbols && symbols->count < SYMBOL_TRACE_LIMIT ? symbols->count : SYMBOL_TRACE_LIMIT;

    printf("SYMBOL TABLE count=%u\n", symbols ? symbols->count : 0u);
    for (uint32_t i = 0; symbols && i < limit; i++) {
        const omi_symbol_entry_t *symbol = &symbols->entries[i];
        printf("SYMBOL %u: start=0x%08x len=%u value=0x%02x orbit=0x%08x\n",
               i,
               symbol->region_start,
               symbol->region_len,
               symbol->value,
               symbol->orbit_id);
    }
    if (symbols && symbols->count > limit) {
        printf("SYMBOL ... remaining=%u\n", symbols->count - limit);
    }
}

static void print_rule_table(void)
{
    printf("RULE TABLE count=%u\n", omi_rewrite_rule_count());
    for (uint32_t i = 0; i < omi_rewrite_rule_count(); i++) {
        const omi_rewrite_rule_t *rule = omi_find_rewrite_rule((omi_rewrite_id_t)(i + 1u));
        if (!rule) {
            continue;
        }

        printf("RULE %u: %s min_region_len=%u\n",
               (unsigned)rule->id,
               rule->name,
               rule->min_region_len);
    }
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
    print_rule_table();
    omi_cons_summary_t first = omi_compute_cons_summary(memory);
    print_tick(clock.tick, memory);

    for (unsigned i = 0; i < ticks; i++) {
        omi_invert_byte_order(memory);
        omi_bom_advance(&clock);
        print_tick(clock.tick, memory);
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

    uint32_t addr = 0x00000001u;
    omi_rules_state_t previous = {0};
    omi_rules_state_t current = {0};
    omi_symbol_table_t symbols = {0};
    uint32_t rewrites = 0;
    for (uint32_t step = 0; step < 1024u; step++) {
        omi_rules_evaluate(memory, addr, 64u, &current, omi_bom_permute);
        print_orbit(step, addr, &current);

        if (current.region_count > 0) {
            printf("CONS REGION FORMED size=%u\n", current.region_count);
            omi_symbols_from_regions(current.regions, current.region_count, current.orbit_id, &symbols);
            print_symbols(&symbols);
        }

        if (step > 0 && omi_rules_summary_equal(&previous.summary, &current.summary)) {
            const omi_rewrite_rule_t *rule = omi_first_rewrite_rule();
            uint32_t symbol_index = 0;
            if (rewrites < 1u && omi_apply_rewrite_rule(memory, &symbols, rule, &symbol_index)) {
                printf("REWRITE rule=%s symbol=%u\n", rule->name, symbol_index);
                rewrites++;
                previous = (omi_rules_state_t){0};
                addr = 0x00000001u;
                continue;
            }

            puts("OMI STABLE FIXPOINT");
            break;
        }

        if (current.orbit_closed) {
            puts("OMI ORBIT CLOSED");
            break;
        }

        previous = current;
        addr = omi_bom_permute(addr);
    }

    puts("replay deterministic");
    free(memory.bytes);
    return 0;
}
