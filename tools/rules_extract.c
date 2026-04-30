#include "../kernel/include/rules.h"
#include <ctype.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int parse_rewrite_line(const char *line, char *name, size_t name_len, unsigned *min_region_len)
{
    char rewrite_kw[32];
    char min_kw[32];

    return sscanf(line,
                  " rewrite %31s %31s %u .",
                  rewrite_kw,
                  min_kw,
                  min_region_len) == 3 &&
           strcmp(rewrite_kw, "split_region") == 0 &&
           strcmp(min_kw, "min_region_len") == 0 &&
           snprintf(name, name_len, "%s", rewrite_kw) > 0;
}

static int extract_rule(const char *rules_path, char *name, size_t name_len, unsigned *min_region_len)
{
    FILE *in = fopen(rules_path, "r");
    if (!in) {
        perror(rules_path);
        return 1;
    }

    char line[256];
    while (fgets(line, sizeof(line), in)) {
        const char *p = line;
        while (isspace((unsigned char)*p)) {
            p++;
        }

        if (strncmp(p, "rewrite ", 8) == 0 &&
            parse_rewrite_line(p, name, name_len, min_region_len)) {
            fclose(in);
            return 0;
        }
    }

    fclose(in);
    fprintf(stderr, "no supported rewrite declaration found in %s\n", rules_path);
    return 1;
}

static int write_table(const char *out_path, const char *name, unsigned min_region_len)
{
    FILE *out = fopen(out_path, "w");
    if (!out) {
        perror(out_path);
        return 1;
    }

    fprintf(out, "#include \"../kernel/include/rules.h\"\n\n");
    fprintf(out, "const omi_rewrite_rule_t omi_rewrite_rules[] = {\n");
    fprintf(out, "    {\n");
    fprintf(out, "        .id = OMI_REWRITE_SPLIT_REGION,\n");
    fprintf(out, "        .name = \"%s\",\n", name);
    fprintf(out, "        .min_region_len = %uu,\n", min_region_len);
    fprintf(out, "    },\n");
    fprintf(out, "};\n\n");
    fprintf(out, "const uint32_t omi_rewrite_rules_count =\n");
    fprintf(out, "    (uint32_t)(sizeof(omi_rewrite_rules) / sizeof(omi_rewrite_rules[0]));\n");

    if (fclose(out) != 0) {
        perror(out_path);
        return 1;
    }

    return 0;
}

int main(int argc, char **argv)
{
    const char *rules_path = argc > 1 ? argv[1] : "docs/RULES.omi";
    const char *out_path = argc > 2 ? argv[2] : "build/rewrite_table.c";
    char name[64];
    unsigned min_region_len = 0;

    if (extract_rule(rules_path, name, sizeof(name), &min_region_len) != 0) {
        return 1;
    }

    if (min_region_len > UINT16_MAX) {
        fprintf(stderr, "min_region_len too large: %u\n", min_region_len);
        return 1;
    }

    if (write_table(out_path, name, min_region_len) != 0) {
        return 1;
    }

    printf("extracted rewrite %s min_region_len=%u\n", name, min_region_len);
    return 0;
}
