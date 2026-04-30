#include "../kernel/include/gauge.h"
#include <ctype.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define GAUGE_TABLE_SIZE 128

typedef struct {
    uint8_t dec;
    uint8_t hex;
    char name[8];
    char action[16];
    char parity[16];
    char role[48];
} gauge_entry_t;

static gauge_entry_t gauge_table[GAUGE_TABLE_SIZE];
static size_t gauge_count = 0;

static int parse_action(const char *str, uint8_t *op_out)
{
    if (strcmp(str, "I") == 0) {
        *op_out = GAUGE_I;
    } else if (strcmp(str, "F") == 0) {
        *op_out = GAUGE_F;
    } else if (strcmp(str, "M") == 0) {
        *op_out = GAUGE_M;
    } else if (strcmp(str, "p") == 0) {
        *op_out = GAUGE_P;
    } else if (strcmp(str, "q") == 0) {
        *op_out = GAUGE_Q;
    } else if (strcmp(str, "r") == 0) {
        *op_out = GAUGE_R;
    } else if (strcmp(str, "s") == 0) {
        *op_out = GAUGE_S;
    } else if (strcmp(str, "F∘M") == 0) {
        *op_out = GAUGE_F_M;
    } else if (strcmp(str, "p∘q") == 0) {
        *op_out = GAUGE_P_Q;
    } else if (strcmp(str, "q∘p") == 0) {
        *op_out = GAUGE_P_Q;
    } else if (strcmp(str, "r∘q") == 0) {
        *op_out = GAUGE_R_Q;
    } else if (strcmp(str, "q∘r") == 0) {
        *op_out = GAUGE_R_Q;
    } else if (strcmp(str, "r∘p") == 0) {
        *op_out = GAUGE_R_P;
    } else if (strcmp(str, "p∘r") == 0) {
        *op_out = GAUGE_R_P;
    } else if (strcmp(str, "p∘q∘r") == 0) {
        *op_out = GAUGE_P_Q_R;
    } else if (strcmp(str, "p∘p") == 0) {
        *op_out = GAUGE_I;
    } else if (strcmp(str, "q∘p") == 0) {
        *op_out = GAUGE_Q_P;
    } else if (strcmp(str, "r∘q∘p") == 0) {
        *op_out = GAUGE_R_Q_P;
    } else if (strcmp(str, "F∘p") == 0) {
        *op_out = GAUGE_F_P;
    } else if (strcmp(str, "F∘M∘F") == 0) {
        *op_out = GAUGE_F_M_F;
    } else if (strcmp(str, "s∘M") == 0) {
        *op_out = GAUGE_S_M;
    } else if (strcmp(str, "s∘p∘q∘r") == 0) {
        *op_out = GAUGE_S_P_Q_R;
    } else if (strcmp(str, "M∘F") == 0) {
        *op_out = GAUGE_M_F;
    } else if (strcmp(str, "M∘F∘M") == 0) {
        *op_out = GAUGE_M_F_M;
    } else if (strcmp(str, "F∘M∘F∘M") == 0) {
        *op_out = GAUGE_F_M_F_M;
    } else if (strcmp(str, "p∘q∘r∘s") == 0) {
        *op_out = GAUGE_P_Q_R_S;
    } else if (strcmp(str, "p∘p∘p") == 0) {
        *op_out = GAUGE_P;
    } else if (strcmp(str, "p∘p") == 0) {
        *op_out = GAUGE_I;
    } else if (strcmp(str, "q∘p") == 0) {
        *op_out = GAUGE_Q_P;
    } else if (strcmp(str, "r∘q∘p") == 0) {
        *op_out = GAUGE_R_Q_P;
    } else if (strcmp(str, "r∘p") == 0) {
        *op_out = GAUGE_R_P;
    } else if (strcmp(str, "r∘q") == 0) {
        *op_out = GAUGE_R_Q;
    } else {
        fprintf(stderr, "unknown action: %s\n", str);
        return -1;
    }
    return 0;
}

static int parse_parity(const char *str)
{
    if (strcmp(str, "invariant") == 0) {
        return 0;
    }
    if (strcmp(str, "invert") == 0) {
        return 1;
    }
    if (strcmp(str, "flip") == 0) {
        return 2;
    }
    fprintf(stderr, "unknown parity: %s\n", str);
    return -1;
}

static int parse_gauge_line(const char *line, gauge_entry_t *entry)
{
    unsigned dec, hex;
    char name[8], action[16], parity[16], role[48];
    
    int fields = sscanf(line, "gauge %u 0x%02X %7s %15s %15s %47s",
                  &dec, &hex, name, action, parity, role);
    
    if (fields != 6) {
        return 0;
    }
    
    entry->dec = (uint8_t)dec;
    entry->hex = (uint8_t)hex;
    
    size_t name_len = strlen(name);
    if (name_len > 0 && name[name_len - 1] == '.') {
        name[name_len - 1] = '\0';
    }
    snprintf(entry->name, sizeof(entry->name), "%s", name);
    
    size_t action_len = strlen(action);
    if (action_len > 0 && action[action_len - 1] == '.') {
        action[action_len - 1] = '\0';
    }
    snprintf(entry->action, sizeof(entry->action), "%s", action);
    
    size_t parity_len = strlen(parity);
    if (parity_len > 0 && parity[parity_len - 1] == '.') {
        parity[parity_len - 1] = '\0';
    }
    snprintf(entry->parity, sizeof(entry->parity), "%s", parity);
    
    size_t role_len = strlen(role);
    if (role_len > 0 && role[role_len - 1] == '.') {
        role[role_len - 1] = '\0';
    }
    snprintf(entry->role, sizeof(entry->role), "%s", role);
    
    return 1;
}

static int extract_gauge_table(const char *gauge_path)
{
    FILE *in = fopen(gauge_path, "r");
    if (!in) {
        perror(gauge_path);
        return 1;
    }
    
    char line[256];
    while (fgets(line, sizeof(line), in)) {
        const char *p = line;
        while (isspace((unsigned char)*p)) {
            p++;
        }
        
        if (strncmp(p, "gauge ", 6) == 0) {
            gauge_entry_t entry;
            if (parse_gauge_line(p, &entry) == 1) {
                if (gauge_count >= GAUGE_TABLE_SIZE) {
                    fprintf(stderr, "too many gauge entries\n");
                    fclose(in);
                    return 1;
                }
                gauge_table[gauge_count++] = entry;
            }
        }
    }
    
    fclose(in);
    
    if (gauge_count != GAUGE_TABLE_SIZE) {
        fprintf(stderr, "expected %d entries, found %zu\n", GAUGE_TABLE_SIZE, gauge_count);
        return 1;
    }
    
    return 0;
}

static int write_gauge_table(const char *out_path)
{
    FILE *out = fopen(out_path, "w");
    if (!out) {
        perror(out_path);
        return 1;
    }
    
    fprintf(out, "#include \"../kernel/include/gauge.h\"\n\n");
    fprintf(out, "const omi_gauge_entry_t omi_gauge_table[] = {\n");
    
    for (size_t i = 0; i < gauge_count; i++) {
        gauge_entry_t *e = &gauge_table[i];
        
        uint8_t op;
        if (parse_action(e->action, &op) != 0) {
            fprintf(stderr, "failed to parse action for %s\n", e->name);
            fclose(out);
            return 1;
        }
        
        int parity = parse_parity(e->parity);
        if (parity < 0) {
            fclose(out);
            return 1;
        }
        
        fprintf(out, "    {\n");
        fprintf(out, "        .dec = %u,\n", e->dec);
        fprintf(out, "        .hex = 0x%02X,\n", e->hex);
        fprintf(out, "        .name = \"%s\",\n", e->name);
        fprintf(out, "        .op = 0x%02X,\n", op);
        fprintf(out, "        .parity = %d,\n", parity);
        fprintf(out, "        .role = \"%s\",\n", e->role);
        fprintf(out, "    },\n");
    }
    
    fprintf(out, "};\n\n");
    fprintf(out, "const uint32_t omi_gauge_count =\n");
    fprintf(out, "    (uint32_t)(sizeof(omi_gauge_table) / sizeof(omi_gauge_table[0]));\n");
    
    if (fclose(out) != 0) {
        perror(out_path);
        return 1;
    }
    
    return 0;
}

int main(int argc, char **argv)
{
    const char *gauge_path = argc > 1 ? argv[1] : "docs/GAUGE_TABLE.omi";
    const char *out_path = argc > 2 ? argv[2] : "build/gauge_table.c";
    
    if (extract_gauge_table(gauge_path) != 0) {
        fprintf(stderr, "failed to extract gauge table from %s\n", gauge_path);
        return 1;
    }
    
    printf("extracted gauge table count=%zu\n", gauge_count);
    
    if (write_gauge_table(out_path) != 0) {
        fprintf(stderr, "failed to write gauge table to %s\n", out_path);
        return 1;
    }
    
    printf("wrote gauge table to %s\n", out_path);
    return 0;
}