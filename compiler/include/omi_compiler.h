#ifndef OMI_COMPILER_H
#define OMI_COMPILER_H

#include <stddef.h>
#include <stdint.h>

#include "term_rewriting_lexer.h"

#define OMI_COMPILER_MAX_TOKENS 128
#define OMI_COMPILER_MAX_FORMS 128
#define OMI_COMPILER_MAX_NODES 128
#define OMI_COMPILER_MAX_EDGES 256
#define OMI_COMPILER_TEXT_SIZE 32

typedef enum {
    OMI_TOKEN_LPAREN = 0,
    OMI_TOKEN_RPAREN,
    OMI_TOKEN_ATOM
} omi_token_kind_t;

typedef enum {
    OMI_FORM_ROOT = 0,
    OMI_FORM_LIST,
    OMI_FORM_ATOM
} omi_form_kind_t;

typedef enum {
    OMI_GRAPH_ROOT = 0,
    OMI_GRAPH_LIST,
    OMI_GRAPH_SYMBOL,
    OMI_GRAPH_INTEGER
} omi_graph_node_class_t;

typedef struct {
    omi_token_kind_t kind;
    size_t start;
    size_t end;
    char text[OMI_COMPILER_TEXT_SIZE];
} omi_token_t;

typedef struct {
    omi_form_kind_t kind;
    uint16_t id;
    int16_t parent;
    uint16_t depth;
    uint16_t source_token;
    char text[OMI_COMPILER_TEXT_SIZE];
} omi_form_t;

typedef struct {
    uint16_t id;
    int16_t parent;
    omi_graph_node_class_t node_class;
    uint16_t degree;
    uint32_t ssa_value;
    uint32_t spectral_id;
    char label[OMI_COMPILER_TEXT_SIZE];
} omi_graph_node_t;

typedef struct {
    uint16_t src;
    uint16_t dst;
    uint8_t edge_kind;
} omi_graph_edge_t;

typedef struct {
    term_rewriting_lexer_t frontend;
    char normalized_source[TRL_OUTPUT_BUF_SIZE];
    size_t normalized_len;
    omi_token_t tokens[OMI_COMPILER_MAX_TOKENS];
    size_t token_count;
    omi_form_t forms[OMI_COMPILER_MAX_FORMS];
    size_t form_count;
    omi_graph_node_t nodes[OMI_COMPILER_MAX_NODES];
    size_t node_count;
    omi_graph_edge_t edges[OMI_COMPILER_MAX_EDGES];
    size_t edge_count;
    uint32_t frontend_steps;
    uint32_t unresolved_edges;
    uint32_t eigen_score;
    uint8_t saturated;
    int parse_error;
} omi_compiler_unit_t;

void omi_compiler_unit_init(omi_compiler_unit_t *unit);
size_t omi_lexer_count_tokens(const char *source);
int omi_compile_lex(const char *source, omi_compiler_unit_t *unit);
int omi_parse_tokens(omi_compiler_unit_t *unit);
int omi_build_graph_ir(omi_compiler_unit_t *unit);
int omi_compile_source(const char *source, omi_compiler_unit_t *unit);
uint32_t omi_cons_ssa_value(uint16_t cons_id, uint16_t version);
uint32_t omi_spectral_basis_id(uint8_t node_class, uint8_t degree);
int omi_graph_is_saturated(size_t unresolved_edges);
uint32_t omi_eigen_cons_score(uint32_t stable_edges, uint32_t oscillating_edges);

#endif
