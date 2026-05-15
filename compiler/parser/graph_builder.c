#include "../include/omi_compiler.h"

#include <ctype.h>
#include <string.h>

uint8_t omi_graph_builder_seed_node(uint8_t byte)
{
    return byte;
}

static omi_graph_node_class_t classify_atom(const char *text)
{
    size_t i = 0;
    if (!text || !text[0]) {
        return OMI_GRAPH_SYMBOL;
    }
    if (text[0] == '-' || text[0] == '+') {
        i = 1;
    }
    for (; text[i]; i++) {
        if (!isdigit((unsigned char)text[i])) {
            return OMI_GRAPH_SYMBOL;
        }
    }
    return i > 0 ? OMI_GRAPH_INTEGER : OMI_GRAPH_SYMBOL;
}

static uint16_t child_degree(const omi_compiler_unit_t *unit, int16_t parent)
{
    uint16_t degree = 0;
    for (size_t i = 0; i < unit->form_count; i++) {
        if (unit->forms[i].parent == parent) {
            degree++;
        }
    }
    return degree;
}

int omi_build_graph_ir(omi_compiler_unit_t *unit)
{
    if (!unit) {
        return -1;
    }

    unit->node_count = 0;
    unit->edge_count = 0;
    unit->unresolved_edges = 0;

    for (size_t i = 0; i < unit->form_count && unit->node_count < OMI_COMPILER_MAX_NODES; i++) {
        omi_form_t *form = &unit->forms[i];
        omi_graph_node_t *node = &unit->nodes[unit->node_count++];
        memset(node, 0, sizeof(*node));
        node->id = form->id;
        node->parent = form->parent;
        node->degree = child_degree(unit, (int16_t)form->id);
        if (form->kind == OMI_FORM_ROOT) {
            node->node_class = OMI_GRAPH_ROOT;
            strcpy(node->label, "program");
        } else if (form->kind == OMI_FORM_LIST) {
            node->node_class = OMI_GRAPH_LIST;
            strcpy(node->label, "list");
        } else {
            node->node_class = classify_atom(form->text);
            strncpy(node->label, form->text, sizeof(node->label) - 1);
        }
        node->ssa_value = omi_cons_ssa_value(form->id, form->depth);
        node->spectral_id = omi_spectral_basis_id((uint8_t)node->node_class, (uint8_t)node->degree);
    }

    for (size_t i = 1; i < unit->form_count && unit->edge_count < OMI_COMPILER_MAX_EDGES; i++) {
        if (unit->forms[i].parent < 0) {
            unit->unresolved_edges++;
            continue;
        }
        unit->edges[unit->edge_count].src = (uint16_t)unit->forms[i].parent;
        unit->edges[unit->edge_count].dst = unit->forms[i].id;
        unit->edges[unit->edge_count].edge_kind = 1u;
        unit->edge_count++;
    }

    unit->saturated = (uint8_t)omi_graph_is_saturated(unit->unresolved_edges);
    unit->eigen_score = omi_eigen_cons_score(unit->edge_count, unit->unresolved_edges);
    return 0;
}
