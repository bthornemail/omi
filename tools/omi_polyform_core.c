/*
 * omi_polyform_core.c
 * Portable C99 reference core for OMI-LISP polyforms.
 *
 * Purpose:
 *   - Read OMI-style declarations for polyomino/polyiamond/polyhex/polycube/etc.
 *   - Resolve them through the ASCII operator band 0x20..0x2F.
 *   - Compile each declared cell into a bitwise CONS-trie.
 *   - Emit deterministic OMI-LISP and SVG witness projections.
 *
 * Build:
 *   cc -std=c99 -Wall -Wextra -O2 omi_polyform_core.c -o omi_polyform_core
 *
 * Example:
 *   ./omi_polyform_core demo > out.omi
 *   ./omi_polyform_core svg  > out.svg
 */

#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define OMI_MAX_CELLS     4096
#define OMI_MAX_SYMBOLS   8192
#define OMI_MAX_TOKEN     256
#define OMI_MAX_NODES     262144
#define OMI_HASH_OFFSET   UINT64_C(1469598103934665603)
#define OMI_HASH_PRIME    UINT64_C(1099511628211)

typedef enum {
    OMI_BASIS_POLYOMINO = 1,
    OMI_BASIS_POLYIAMOND,
    OMI_BASIS_POLYHEX,
    OMI_BASIS_POLYCUBE,
    OMI_BASIS_POLYTAN,
    OMI_BASIS_POLYOCT,
    OMI_BASIS_POLYSTICK
} OmiBasis;

typedef struct {
    uint8_t code;       /* ASCII codepoint 0x20..0x2F */
    uint8_t mask;       /* four-bit truth mask */
    const char *name;
    const char *meaning;
} OmiOperator;

static const OmiOperator OMI_OPERATOR_BAND[16] = {
    {0x20, 0x0, "SP", "unasserted-empty"},
    {0x21, 0x1, "!",  "asserted-empty"},
    {0x22, 0x2, "\"", "cdr-only-assertion"},
    {0x23, 0x3, "#",  "car-null"},
    {0x24, 0x4, "$",  "car-only-assertion"},
    {0x25, 0x5, "%",  "cdr-null"},
    {0x26, 0x6, "&",  "xor-exactly-one-side"},
    {0x27, 0x7, "'",  "nand-not-both"},
    {0x28, 0x8, "(",  "and-both-declared"},
    {0x29, 0x9, ")",  "xnor-both-same"},
    {0x2A, 0xA, "*",  "project-cdr"},
    {0x2B, 0xB, "+",  "implication-p-to-q"},
    {0x2C, 0xC, ",",  "project-car"},
    {0x2D, 0xD, "-",  "converse-q-to-p"},
    {0x2E, 0xE, ".",  "or-cons-continuation"},
    {0x2F, 0xF, "/",  "tautological-enclosure"}
};

typedef struct {
    int32_t x, y, z;
    uint32_t flags;
} OmiCell;

typedef struct {
    char sid[64];
    char title[128];
    OmiBasis basis;
    OmiCell cells[OMI_MAX_CELLS];
    size_t cell_count;
} OmiPolyform;

typedef struct {
    int32_t child[2];
    int32_t value_index;
    uint64_t digest;
} OmiTrieNode;

typedef struct {
    OmiTrieNode nodes[OMI_MAX_NODES];
    size_t count;
} OmiTrie;

static uint64_t fnv1a64_update(uint64_t h, const void *data, size_t n) {
    const uint8_t *p = (const uint8_t *)data;
    for (size_t i = 0; i < n; i++) {
        h ^= (uint64_t)p[i];
        h *= OMI_HASH_PRIME;
    }
    return h;
}

static uint64_t fnv1a64_str(uint64_t h, const char *s) {
    return fnv1a64_update(h, s, strlen(s));
}

static uint8_t omi_operator_mask(uint8_t code) {
    if (code < 0x20 || code > 0x2F) return 0xFF;
    return (uint8_t)(code & 0x0F);
}

static int omi_truth(uint8_t mask, int car_admitted, int cdr_admitted) {
    /* Index order: TT, TF, FT, FF as bits 3,2,1,0. */
    uint8_t bit;
    if (car_admitted && cdr_admitted) bit = 3;
    else if (car_admitted && !cdr_admitted) bit = 2;
    else if (!car_admitted && cdr_admitted) bit = 1;
    else bit = 0;
    return (mask >> bit) & 1;
}

static const char *basis_name(OmiBasis b) {
    switch (b) {
        case OMI_BASIS_POLYOMINO: return "polyomino";
        case OMI_BASIS_POLYIAMOND: return "polyiamond";
        case OMI_BASIS_POLYHEX: return "polyhex";
        case OMI_BASIS_POLYCUBE: return "polycube";
        case OMI_BASIS_POLYTAN: return "polytan";
        case OMI_BASIS_POLYOCT: return "polyoct";
        case OMI_BASIS_POLYSTICK: return "polystick";
        default: return "unknown";
    }
}

static OmiBasis parse_basis(const char *s) {
    if (!strcmp(s, "polyomino")) return OMI_BASIS_POLYOMINO;
    if (!strcmp(s, "polyiamond")) return OMI_BASIS_POLYIAMOND;
    if (!strcmp(s, "polyhex")) return OMI_BASIS_POLYHEX;
    if (!strcmp(s, "polycube")) return OMI_BASIS_POLYCUBE;
    if (!strcmp(s, "polytan")) return OMI_BASIS_POLYTAN;
    if (!strcmp(s, "polyoct")) return OMI_BASIS_POLYOCT;
    if (!strcmp(s, "polystick")) return OMI_BASIS_POLYSTICK;
    return OMI_BASIS_POLYOMINO;
}

static void trie_init(OmiTrie *t) {
    memset(t, 0, sizeof(*t));
    t->nodes[0].child[0] = -1;
    t->nodes[0].child[1] = -1;
    t->nodes[0].value_index = -1;
    t->nodes[0].digest = OMI_HASH_OFFSET;
    t->count = 1;
}

static int32_t trie_new_node(OmiTrie *t) {
    if (t->count >= OMI_MAX_NODES) {
        fprintf(stderr, "omi: trie capacity exceeded\n");
        exit(2);
    }
    int32_t id = (int32_t)t->count++;
    t->nodes[id].child[0] = -1;
    t->nodes[id].child[1] = -1;
    t->nodes[id].value_index = -1;
    t->nodes[id].digest = OMI_HASH_OFFSET ^ (uint64_t)id;
    return id;
}

static void trie_insert_bits(OmiTrie *t, const uint8_t *bytes, size_t n, int32_t value_index) {
    int32_t cur = 0;
    for (size_t i = 0; i < n; i++) {
        uint8_t byte = bytes[i];
        for (int bit = 7; bit >= 0; bit--) {
            uint8_t b = (byte >> bit) & 1u; /* bitwise branch selection */
            if (t->nodes[cur].child[b] < 0) {
                t->nodes[cur].child[b] = trie_new_node(t);
            }
            cur = t->nodes[cur].child[b];
        }
    }
    t->nodes[cur].value_index = value_index;
}

static void encode_cell_key(const OmiPolyform *p, size_t i, char *out, size_t cap) {
    const OmiCell *c = &p->cells[i];
    snprintf(out, cap, "%s:%s:%ld:%ld:%ld:%lu",
             p->sid, basis_name(p->basis), (long)c->x, (long)c->y, (long)c->z,
             (unsigned long)c->flags);
}

static uint64_t polyform_digest(const OmiPolyform *p) {
    uint64_t h = OMI_HASH_OFFSET;
    h = fnv1a64_str(h, p->sid);
    h = fnv1a64_str(h, p->title);
    h = fnv1a64_str(h, basis_name(p->basis));
    for (size_t i = 0; i < p->cell_count; i++) {
        h = fnv1a64_update(h, &p->cells[i], sizeof(OmiCell));
    }
    return h;
}

static uint64_t trie_digest_rec(OmiTrie *t, int32_t id) {
    if (id < 0) return UINT64_C(0xcbf29ce484222325);
    OmiTrieNode *n = &t->nodes[id];
    uint64_t h = OMI_HASH_OFFSET;
    h = fnv1a64_update(h, &id, sizeof(id));
    h = fnv1a64_update(h, &n->value_index, sizeof(n->value_index));
    uint64_t left = trie_digest_rec(t, n->child[0]);
    uint64_t right = trie_digest_rec(t, n->child[1]);
    h = fnv1a64_update(h, &left, sizeof(left));
    h = fnv1a64_update(h, &right, sizeof(right));
    n->digest = h;
    return h;
}

static void emit_operator_band(FILE *f) {
    fprintf(f, "  (operator-band\n");
    for (int i = 0; i < 16; i++) {
        const OmiOperator *o = &OMI_OPERATOR_BAND[i];
        fprintf(f, "    (op (code 0x%02X) (glyph \"%s\") (mask 0b%u%u%u%u) (meaning %s))\n",
                o->code, o->name,
                (o->mask >> 3) & 1, (o->mask >> 2) & 1,
                (o->mask >> 1) & 1, (o->mask >> 0) & 1,
                o->meaning);
    }
    fprintf(f, "  )\n");
}

static void emit_polyform_omi(FILE *f, const OmiPolyform *p, const OmiTrie *t, uint64_t root_digest) {
    fprintf(f, "(omi\n");
    fprintf(f, "  (identity\n");
    fprintf(f, "    (sid %s)\n", p->sid);
    fprintf(f, "    (title \"%s\")\n", p->title);
    fprintf(f, "    (kind polyform.world-object)\n");
    fprintf(f, "    (source \"omi_polyform_core.c\"))\n");
    fprintf(f, "  (scope\n");
    fprintf(f, "    (fs polyform)\n");
    fprintf(f, "    (gs %s)\n", basis_name(p->basis));
    fprintf(f, "    (rs cell)\n");
    fprintf(f, "    (us coordinate))\n");
    fprintf(f, "  (basis\n");
    fprintf(f, "    (name %s)\n", basis_name(p->basis));
    fprintf(f, "    (cell-count %lu))\n", (unsigned long)p->cell_count);
    emit_operator_band(f);
    fprintf(f, "  (cells\n");
    for (size_t i = 0; i < p->cell_count; i++) {
        const OmiCell *c = &p->cells[i];
        fprintf(f, "    (cell (i %lu) (x %ld) (y %ld) (z %ld) (flags 0x%08lX))\n",
                (unsigned long)i, (long)c->x, (long)c->y, (long)c->z,
                (unsigned long)c->flags);
    }
    fprintf(f, "  )\n");
    fprintf(f, "  (cons-trie\n");
    fprintf(f, "    (encoding bitwise-utf8-key)\n");
    fprintf(f, "    (nodes %lu)\n", (unsigned long)t->count);
    fprintf(f, "    (root 0)\n");
    fprintf(f, "    (root-digest fnv1a64:%016llx))\n", (unsigned long long)root_digest);
    fprintf(f, "  (relations\n");
    fprintf(f, "    (declares polyform cells)\n");
    fprintf(f, "    (compiles cells cons-trie)\n");
    fprintf(f, "    (projects cons-trie svg)\n");
    fprintf(f, "    (measures after-declaration))\n");
    fprintf(f, "  (projections\n");
    fprintf(f, "    (lazy omi-lisp)\n");
    fprintf(f, "    (greedy svg)\n");
    fprintf(f, "    (static cons-trie)\n");
    fprintf(f, "    (animated shadow-canvas))\n");
    fprintf(f, "  (receipts\n");
    fprintf(f, "    (identity fnv1a64:%016llx)\n", (unsigned long long)polyform_digest(p));
    fprintf(f, "    (projection pending)\n");
    fprintf(f, "    (package pending)\n");
    fprintf(f, "    (view pending)))\n");
}

static void emit_svg(FILE *f, const OmiPolyform *p) {
    fprintf(f, "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-100 -100 400 400\">\n");
    fprintf(f, "<metadata data-omi-sid=\"%s\" data-omi-basis=\"%s\"/>\n", p->sid, basis_name(p->basis));
    fprintf(f, "<g id=\"world-objects\" fill=\"none\" stroke=\"currentColor\">\n");
    for (size_t i = 0; i < p->cell_count; i++) {
        const OmiCell *c = &p->cells[i];
        long x = (long)c->x * 30;
        long y = (long)c->y * 30;
        if (p->basis == OMI_BASIS_POLYOMINO || p->basis == OMI_BASIS_POLYCUBE) {
            fprintf(f, "  <rect data-cell=\"%lu\" x=\"%ld\" y=\"%ld\" width=\"30\" height=\"30\"/>\n",
                    (unsigned long)i, x, y);
        } else if (p->basis == OMI_BASIS_POLYSTICK) {
            fprintf(f, "  <line data-cell=\"%lu\" x1=\"%ld\" y1=\"%ld\" x2=\"%ld\" y2=\"%ld\"/>\n",
                    (unsigned long)i, x, y, x + 30, y);
        } else if (p->basis == OMI_BASIS_POLYHEX) {
            fprintf(f, "  <polygon data-cell=\"%lu\" points=\"%ld,%ld %ld,%ld %ld,%ld %ld,%ld %ld,%ld %ld,%ld\"/>\n",
                    (unsigned long)i, x, y-17, x+15, y-8, x+15, y+8, x, y+17, x-15, y+8, x-15, y-8);
        } else {
            fprintf(f, "  <polygon data-cell=\"%lu\" points=\"%ld,%ld %ld,%ld %ld,%ld\"/>\n",
                    (unsigned long)i, x, y, x+30, y, x, y+30);
        }
    }
    fprintf(f, "</g>\n<g id=\"shadow-canvas\" opacity=\"0.35\"></g>\n</svg>\n");
}

static void demo_polyform(OmiPolyform *p) {
    memset(p, 0, sizeof(*p));
    strcpy(p->sid, "demo-polyomino-cross");
    strcpy(p->title, "Demo Polyomino Cross");
    p->basis = OMI_BASIS_POLYOMINO;
    int coords[][3] = {{0,0,0},{1,0,0},{-1,0,0},{0,1,0},{0,-1,0}};
    p->cell_count = 5;
    for (size_t i = 0; i < p->cell_count; i++) {
        p->cells[i].x = coords[i][0];
        p->cells[i].y = coords[i][1];
        p->cells[i].z = coords[i][2];
        p->cells[i].flags = 0;
    }
}

static void compile_polyform(const OmiPolyform *p, OmiTrie *t) {
    trie_init(t);
    for (size_t i = 0; i < p->cell_count; i++) {
        char key[OMI_MAX_TOKEN];
        encode_cell_key(p, i, key, sizeof(key));
        trie_insert_bits(t, (const uint8_t *)key, strlen(key), (int32_t)i);
    }
}

static void usage(const char *argv0) {
    fprintf(stderr, "usage: %s [demo|svg|truth]\n", argv0);
}

int main(int argc, char **argv) {
    const char *mode = argc > 1 ? argv[1] : "demo";

    if (!strcmp(mode, "truth")) {
        for (int i = 0; i < 16; i++) {
            const OmiOperator *o = &OMI_OPERATOR_BAND[i];
            printf("0x%02X %s mask=%X TT=%d TF=%d FT=%d FF=%d %s\n",
                   o->code, o->name, o->mask,
                   omi_truth(o->mask, 1, 1), omi_truth(o->mask, 1, 0),
                   omi_truth(o->mask, 0, 1), omi_truth(o->mask, 0, 0),
                   o->meaning);
        }
        return 0;
    }

    OmiPolyform p;
    OmiTrie t;
    demo_polyform(&p);
    compile_polyform(&p, &t);
    uint64_t root_digest = trie_digest_rec(&t, 0);

    if (!strcmp(mode, "demo")) {
        emit_polyform_omi(stdout, &p, &t, root_digest);
        return 0;
    }
    if (!strcmp(mode, "svg")) {
        emit_svg(stdout, &p);
        return 0;
    }

    usage(argv[0]);
    return 1;
}
