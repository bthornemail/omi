#include "../kernel/include/rules.h"
#include <ctype.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct diagnostic_decl {
    char severity[16];
    char name[64];
} diagnostic_decl_t;

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

static int parse_diagnostic_line(const char *line,
                                 diagnostic_decl_t *diagnostics,
                                 size_t *diagnostic_count,
                                 size_t diagnostic_capacity)
{
    char severity[16];
    char name[64];

    if (sscanf(line, " diagnostic %15s %63s .", severity, name) != 2) {
        return 0;
    }

    if (*diagnostic_count >= diagnostic_capacity) {
        fprintf(stderr, "too many diagnostic declarations\n");
        return -1;
    }

    size_t len = strlen(name);
    if (len > 0 && name[len - 1] == '.') {
        name[len - 1] = '\0';
    }

    snprintf(diagnostics[*diagnostic_count].severity,
             sizeof(diagnostics[*diagnostic_count].severity),
             "%s",
             severity);
    snprintf(diagnostics[*diagnostic_count].name,
             sizeof(diagnostics[*diagnostic_count].name),
             "%s",
             name);
    (*diagnostic_count)++;
    return 1;
}

static int extract_rules(const char *rules_path,
                         char *rewrite_name,
                         size_t rewrite_name_len,
                         unsigned *min_region_len,
                         diagnostic_decl_t *diagnostics,
                         size_t *diagnostic_count,
                         size_t diagnostic_capacity)
{
    FILE *in = fopen(rules_path, "r");
    if (!in) {
        perror(rules_path);
        return 1;
    }

    char line[256];
    int found_rewrite = 0;
    while (fgets(line, sizeof(line), in)) {
        const char *p = line;
        while (isspace((unsigned char)*p)) {
            p++;
        }

        if (strncmp(p, "rewrite ", 8) == 0 &&
            parse_rewrite_line(p, rewrite_name, rewrite_name_len, min_region_len)) {
            found_rewrite = 1;
            continue;
        }

        if (strncmp(p, "diagnostic ", 11) == 0) {
            int parsed = parse_diagnostic_line(p, diagnostics, diagnostic_count, diagnostic_capacity);
            if (parsed < 0) {
                fclose(in);
                return 1;
            }
        }
    }

    fclose(in);
    if (!found_rewrite) {
        fprintf(stderr, "no supported rewrite declaration found in %s\n", rules_path);
        return 1;
    }
    if (*diagnostic_count == 0) {
        fprintf(stderr, "no diagnostic declarations found in %s\n", rules_path);
        return 1;
    }
    return 0;
}

static const char *diagnostic_id(const char *name)
{
    if (strcmp(name, "null_cons") == 0) {
        return "OMI_DIAGNOSTIC_NULL_CONS";
    }
    if (strcmp(name, "null_edge") == 0) {
        return "OMI_DIAGNOSTIC_NULL_EDGE";
    }
    if (strcmp(name, "transient_pressure") == 0) {
        return "OMI_DIAGNOSTIC_TRANSIENT_PRESSURE";
    }
    return NULL;
}

static const char *diagnostic_severity(const char *severity)
{
    if (strcmp(severity, "violation") == 0) {
        return "OMI_DIAGNOSTIC_VIOLATION";
    }
    if (strcmp(severity, "warning") == 0) {
        return "OMI_DIAGNOSTIC_WARNING";
    }
    return NULL;
}

static int write_table(const char *out_path,
                       const char *name,
                       unsigned min_region_len,
                       const diagnostic_decl_t *diagnostics,
                       size_t diagnostic_count)
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
    fprintf(out, "\n");
    fprintf(out, "const omi_diagnostic_rule_t omi_diagnostic_rules[] = {\n");
    for (size_t i = 0; i < diagnostic_count; i++) {
        const char *id = diagnostic_id(diagnostics[i].name);
        const char *severity = diagnostic_severity(diagnostics[i].severity);
        if (!id || !severity) {
            fprintf(stderr,
                    "unsupported diagnostic declaration: %s %s\n",
                    diagnostics[i].severity,
                    diagnostics[i].name);
            fclose(out);
            return 1;
        }

        fprintf(out, "    {\n");
        fprintf(out, "        .id = %s,\n", id);
        fprintf(out, "        .severity = %s,\n", severity);
        fprintf(out, "        .name = \"%s\",\n", diagnostics[i].name);
        fprintf(out, "    },\n");
    }
    fprintf(out, "};\n\n");
    fprintf(out, "const uint32_t omi_diagnostic_rules_count =\n");
    fprintf(out, "    (uint32_t)(sizeof(omi_diagnostic_rules) / sizeof(omi_diagnostic_rules[0]));\n");

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
    diagnostic_decl_t diagnostics[8];
    size_t diagnostic_count = 0;

    if (extract_rules(rules_path,
                      name,
                      sizeof(name),
                      &min_region_len,
                      diagnostics,
                      &diagnostic_count,
                      sizeof(diagnostics) / sizeof(diagnostics[0])) != 0) {
        return 1;
    }

    if (min_region_len > UINT16_MAX) {
        fprintf(stderr, "min_region_len too large: %u\n", min_region_len);
        return 1;
    }

    if (write_table(out_path, name, min_region_len, diagnostics, diagnostic_count) != 0) {
        return 1;
    }

    printf("extracted rewrite %s min_region_len=%u diagnostics=%zu\n",
           name,
           min_region_len,
           diagnostic_count);
    return 0;
}
