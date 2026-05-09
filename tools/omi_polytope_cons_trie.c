/*
 * omi_polytope_cons_trie.c
 * Deterministic C bitwise compiler: TSV polytope records -> OMI-LISP cons trie.
 *
 * Input TSV columns: class<TAB>name<TAB>schlafli
 * Output: OMI-LISP declaration containing:
 *   - record leaves
 *   - bitwise trie nodes over UTF-8 key = class|name|schlafli
 *   - cons cells (car/cdr) encoding node records
 *   - FNV-1a receipts
 */
#include <ctype.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_RECORDS 4096
#define MAX_LINE 4096
#define MAX_TEXT 1024
#define MAX_NODES 262144
#define MAX_CONS 524288

#define NIL 0u

typedef struct {
    char cls[MAX_TEXT];
    char name[MAX_TEXT];
    char schlafli[MAX_TEXT];
    char sid[MAX_TEXT];
    char key[MAX_TEXT * 3];
    uint64_t digest;
} Record;

typedef struct {
    uint32_t zero;
    uint32_t one;
    int32_t leaf;     /* record index, -1 if none */
    uint64_t digest;
} TrieNode;

typedef struct {
    uint32_t car;
    uint32_t cdr;
    uint64_t tag;
} Cons;

static Record records[MAX_RECORDS];
static uint32_t record_count = 0;
static TrieNode nodes[MAX_NODES];
static uint32_t node_count = 1; /* node 0 is root */
static Cons conses[MAX_CONS];
static uint32_t cons_count = 1; /* cons 0 is NIL */

static uint64_t fnv1a_update(uint64_t h, const unsigned char *p, size_t n) {
    for (size_t i = 0; i < n; i++) {
        h ^= (uint64_t)p[i];
        h *= 1099511628211ull;
    }
    return h;
}

static uint64_t fnv1a_str(const char *s) {
    return fnv1a_update(1469598103934665603ull, (const unsigned char *)s, strlen(s));
}

static uint64_t mix64(uint64_t a, uint64_t b) {
    uint64_t h = 1469598103934665603ull;
    h = fnv1a_update(h, (unsigned char *)&a, sizeof(a));
    h = fnv1a_update(h, (unsigned char *)&b, sizeof(b));
    return h;
}

static void trim(char *s) {
    size_t n = strlen(s);
    while (n && (s[n-1] == '\n' || s[n-1] == '\r' || isspace((unsigned char)s[n-1]))) s[--n] = 0;
    size_t i = 0;
    while (s[i] && isspace((unsigned char)s[i])) i++;
    if (i) memmove(s, s+i, strlen(s+i)+1);
}

static void sidify(const char *in, char *out, size_t outsz) {
    size_t j = 0;
    int dash = 0;
    for (size_t i = 0; in[i] && j + 1 < outsz; i++) {
        unsigned char c = (unsigned char)in[i];
        if (isalnum(c)) {
            out[j++] = (char)tolower(c);
            dash = 0;
        } else if (!dash && j && j + 1 < outsz) {
            out[j++] = '-';
            dash = 1;
        }
    }
    while (j && out[j-1] == '-') j--;
    if (!j && outsz > 1) out[j++] = 'x';
    out[j] = 0;
}

static void escape_omi(const char *in, FILE *out) {
    fputc('"', out);
    for (const unsigned char *p = (const unsigned char *)in; *p; p++) {
        if (*p == '"' || *p == '\\') { fputc('\\', out); fputc(*p, out); }
        else if (*p == '\n') fputs("\\n", out);
        else if (*p == '\r') fputs("\\r", out);
        else if (*p == '\t') fputs("\\t", out);
        else fputc(*p, out);
    }
    fputc('"', out);
}

static uint32_t new_node(void) {
    if (node_count >= MAX_NODES) { fprintf(stderr, "node overflow\n"); exit(2); }
    nodes[node_count] = (TrieNode){0,0,-1,0};
    return node_count++;
}

static uint32_t cons(uint32_t car, uint32_t cdr, uint64_t tag) {
    if (cons_count >= MAX_CONS) { fprintf(stderr, "cons overflow\n"); exit(2); }
    conses[cons_count] = (Cons){car,cdr,tag};
    return cons_count++;
}

static uint32_t atom_id(uint64_t h) {
    /* atoms live above cons address space; low bit pattern makes them distinct */
    return (uint32_t)((h & 0x7fffffffu) | 0x80000000u);
}

static void trie_insert(const unsigned char *key, size_t n, int32_t rec_index) {
    uint32_t cur = 0;
    for (size_t i = 0; i < n; i++) {
        unsigned char b = key[i];
        for (int bit = 7; bit >= 0; bit--) {
            uint32_t one = (uint32_t)((b >> bit) & 1u);
            uint32_t *next = one ? &nodes[cur].one : &nodes[cur].zero;
            if (*next == 0) *next = new_node();
            cur = *next;
        }
    }
    nodes[cur].leaf = rec_index;
}

static uint64_t digest_node(uint32_t idx) {
    if (idx == 0 && node_count == 0) return 0;
    TrieNode *n = &nodes[idx];
    uint64_t z = n->zero ? digest_node(n->zero) : 0x00ull;
    uint64_t o = n->one  ? digest_node(n->one)  : 0x01ull;
    uint64_t l = (n->leaf >= 0) ? records[n->leaf].digest : 0xffffffffffffffffull;
    uint64_t h = mix64(z, o);
    h = mix64(h, l);
    n->digest = h;
    return h;
}

static uint32_t consify_node(uint32_t idx) {
    TrieNode *n = &nodes[idx];
    uint32_t z = n->zero ? consify_node(n->zero) : NIL;
    uint32_t o = n->one  ? consify_node(n->one)  : NIL;
    uint32_t leaf = (n->leaf >= 0) ? atom_id(records[n->leaf].digest) : NIL;
    uint32_t pair_01 = cons(z, o, 0x01);
    uint32_t pair_leaf = cons(leaf, pair_01, 0x02);
    return pair_leaf;
}

static void read_tsv(const char *path) {
    FILE *f = fopen(path, "rb");
    if (!f) { perror(path); exit(1); }
    char line[MAX_LINE];
    while (fgets(line, sizeof(line), f)) {
        trim(line);
        if (!line[0] || line[0] == '#') continue;
        char *a = strtok(line, "\t");
        char *b = strtok(NULL, "\t");
        char *c = strtok(NULL, "\t");
        if (!a || !b) continue;
        if (!c) c = "";
        if (record_count >= MAX_RECORDS) { fprintf(stderr, "record overflow\n"); exit(2); }
        Record *r = &records[record_count];
        snprintf(r->cls, sizeof(r->cls), "%s", a);
        snprintf(r->name, sizeof(r->name), "%s", b);
        snprintf(r->schlafli, sizeof(r->schlafli), "%s", c);
        sidify(r->name, r->sid, sizeof(r->sid));
        char cls_tmp[MAX_TEXT], name_tmp[MAX_TEXT], sch_tmp[MAX_TEXT];
        snprintf(cls_tmp, sizeof(cls_tmp), "%s", r->cls);
        snprintf(name_tmp, sizeof(name_tmp), "%s", r->name);
        snprintf(sch_tmp, sizeof(sch_tmp), "%s", r->schlafli);
        snprintf(r->key, sizeof(r->key), "%s|%s|%s", cls_tmp, name_tmp, sch_tmp);
        r->digest = fnv1a_str(r->key);
        trie_insert((const unsigned char *)r->key, strlen(r->key), (int32_t)record_count);
        record_count++;
    }
    fclose(f);
}

static void emit_omi(FILE *out, uint64_t root_digest, uint32_t root_cons) {
    fprintf(out, "(omi\n");
    fprintf(out, "  (identity\n");
    fprintf(out, "    (sid regular-polytope-cons-trie)\n");
    fprintf(out, "    (title \"Regular Polytopes Cons Trie\")\n");
    fprintf(out, "    (kind geometry.cons-trie)\n");
    fprintf(out, "    (source \"List of regular polytopes - Wikipedia\"))\n");
    fprintf(out, "  (scope\n    (fs regular-polytopes)\n    (gs geometry)\n    (rs cons-trie)\n    (us bitwise-key))\n");
    fprintf(out, "  (compiler\n    (language c)\n    (operations bitwise)\n    (key utf8-byte-bitstring)\n    (branch zero one)\n    (cell cons)\n    (nil 0))\n");
    fprintf(out, "  (summary\n    (record-count %u)\n    (trie-node-count %u)\n    (cons-cell-count %u)\n    (root-cons %u)\n    (root-digest \"fnv1a64:%016llx\"))\n", record_count, node_count, cons_count - 1, root_cons, (unsigned long long)root_digest);

    fprintf(out, "  (records\n");
    for (uint32_t i = 0; i < record_count; i++) {
        Record *r = &records[i];
        fprintf(out, "    (polytope\n      (sid %s)\n      (class ", r->sid); escape_omi(r->cls, out); fprintf(out, ")\n      (name "); escape_omi(r->name, out); fprintf(out, ")\n      (schlafli "); escape_omi(r->schlafli, out); fprintf(out, ")\n      (key "); escape_omi(r->key, out); fprintf(out, ")\n      (digest \"fnv1a64:%016llx\"))\n", (unsigned long long)r->digest);
    }
    fprintf(out, "  )\n");

    fprintf(out, "  (trie\n");
    for (uint32_t i = 0; i < node_count; i++) {
        fprintf(out, "    (node (id %u) (zero %u) (one %u) (leaf %d) (digest \"fnv1a64:%016llx\"))\n",
                i, nodes[i].zero, nodes[i].one, nodes[i].leaf, (unsigned long long)nodes[i].digest);
    }
    fprintf(out, "  )\n");

    fprintf(out, "  (cons-cells\n");
    fprintf(out, "    (nil 0)\n");
    for (uint32_t i = 1; i < cons_count; i++) {
        fprintf(out, "    (cons (id %u) (car %u) (cdr %u) (tag \"%016llx\"))\n",
                i, conses[i].car, conses[i].cdr, (unsigned long long)conses[i].tag);
    }
    fprintf(out, "  )\n");

    fprintf(out, "  (relations\n");
    fprintf(out, "    (compiles source regular-polytope-cons-trie)\n");
    fprintf(out, "    (indexes utf8-byte-bitstring polytope)\n");
    fprintf(out, "    (encodes trie cons-cells)\n");
    fprintf(out, "    (binds root-cons root-digest))\n");
    fprintf(out, "  (projections\n    (lazy ndjson)\n    (greedy omi-cons-trie)\n    (static polytope-codex)\n    (animated traversal))\n");
    fprintf(out, "  (receipts\n    (identity \"fnv1a64:%016llx\")\n    (projection pending)\n    (package pending)\n    (view pending)))\n", (unsigned long long)root_digest);
}

int main(int argc, char **argv) {
    if (argc != 3) {
        fprintf(stderr, "usage: %s polytope_records.tsv out.omi\n", argv[0]);
        return 64;
    }
    nodes[0] = (TrieNode){0,0,-1,0};
    read_tsv(argv[1]);
    uint64_t root_digest = digest_node(0);
    uint32_t root_cons = consify_node(0);
    FILE *out = fopen(argv[2], "wb");
    if (!out) { perror(argv[2]); return 1; }
    emit_omi(out, root_digest, root_cons);
    fclose(out);
    fprintf(stderr, "records=%u trie_nodes=%u cons_cells=%u root_cons=%u root_digest=fnv1a64:%016llx\n",
            record_count, node_count, cons_count - 1, root_cons, (unsigned long long)root_digest);
    return 0;
}
