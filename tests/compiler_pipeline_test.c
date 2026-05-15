#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "omi_compiler.h"

static void test_compiler_pipeline(void)
{
    printf("Testing OMI-LISP → OMI-GRAPH IR compiler pipeline\n");

    omi_compiler_unit_t unit;
    const char *source = "(bind foo x=5)";
    assert(omi_compile_source(source, &unit) == 0);
    assert(unit.token_count == 4);
    assert(strcmp(unit.tokens[0].text, "(") == 0);
    assert(strcmp(unit.tokens[1].text, "B#foo") == 0);
    assert(strcmp(unit.tokens[2].text, "x:#5") == 0);
    assert(strcmp(unit.tokens[3].text, ")") == 0);
    assert(unit.frontend_steps > 0);
    assert(unit.form_count >= 3);
    assert(unit.node_count == unit.form_count);
    assert(unit.edge_count == unit.form_count - 1);
    assert(unit.saturated == 1);
    assert(unit.eigen_score == unit.edge_count);
    printf("  OK tokens=%zu forms=%zu nodes=%zu edges=%zu normalized=\"%s\"\n\n",
           unit.token_count, unit.form_count, unit.node_count, unit.edge_count, unit.normalized_source);
}

static void test_nested_program(void)
{
    printf("Testing nested list compilation\n");

    omi_compiler_unit_t unit;
    const char *source = "(compose (cons alpha beta) target)";
    assert(omi_compile_source(source, &unit) == 0);
    assert(unit.form_count >= 6);
    assert(unit.node_count >= 6);
    assert(unit.edge_count >= 5);
    assert(unit.nodes[0].node_class == OMI_GRAPH_ROOT);
    printf("  OK nested program produces rooted graph IR\n\n");
}

int main(void)
{
    printf("Testing Compiler Pipeline\n");
    printf("=========================\n\n");

    test_compiler_pipeline();
    test_nested_program();

    printf("=========================\n");
    printf("ALL COMPILER PIPELINE TESTS PASSED\n");
    return 0;
}
