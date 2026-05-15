#include <stdint.h>

#include "../include/omi_compiler.h"

uint32_t omi_cons_ssa_value(uint16_t cons_id, uint16_t version)
{
    return ((uint32_t)cons_id << 16) | version;
}

int omi_compile_source(const char *source, omi_compiler_unit_t *unit)
{
    if (!unit || !source) {
        return -1;
    }
    if (omi_compile_lex(source, unit) != 0) {
        return -1;
    }
    if (omi_parse_tokens(unit) != 0) {
        return -1;
    }
    if (omi_build_graph_ir(unit) != 0) {
        return -1;
    }
    return 0;
}
