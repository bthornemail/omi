#ifndef OMI_POLYFORM_CAPSULE_H
#define OMI_POLYFORM_CAPSULE_H

#include "polyform_block.h"
#include "polyform_encode.h"
#include "../../kernel/include/layer_clock.h"
#include "../../kernel/include/term_rewriting_lexer.h"

#define POLYFORM_CAPSULE_MAGIC 0x50434150u
#define POLYFORM_CAPSULE_VERSION 1u
#define POLYFORM_CAPSULE_MAX_LINEAGE 8u
#define POLYFORM_CAPSULE_SERIALIZED_MAX 2048u

typedef enum {
    POLYFORM_ORIENTATION_NORTH = 0,
    POLYFORM_ORIENTATION_EAST = 1,
    POLYFORM_ORIENTATION_SOUTH = 2,
    POLYFORM_ORIENTATION_WEST = 3
} polyform_orientation_t;

typedef struct {
    uint32_t hop;
    uint8_t carrier_index;
    uint8_t orientation;
    uint8_t scope_depth;
    int16_t horizon_layer;
    uint8_t horizon_inversion;
    uint32_t witness_before;
    uint32_t witness_after;
} polyform_capsule_lineage_t;

typedef struct {
    uint32_t magic;
    uint32_t version;
    uint32_t root_witness;
    uint32_t current_witness;
    uint8_t carrier_index;
    uint8_t orientation;
    uint8_t scope_depth;
    int16_t horizon_layer;
    uint8_t horizon_inversion;
    uint32_t rewrite_hash;
    char rewrite_closure[TRL_CLOSURE_BUF_SIZE];
    size_t rewrite_closure_len;
    uint32_t braille[POLYFORM_BRAILLE_MAX];
    size_t braille_count;
    uint8_t carrier_bits[POLYFORM_CARRIER_BITS];
    int carrier_bit_count;
    polyform_capsule_lineage_t lineage[POLYFORM_CAPSULE_MAX_LINEAGE];
    size_t lineage_count;
} polyform_capsule_t;

int polyform_capsule_from_block(polyform_capsule_t *capsule,
                                const polyform_block_t *block,
                                uint8_t carrier_index,
                                polyform_orientation_t orientation,
                                uint8_t scope_depth,
                                const layer_clock_t *clock,
                                const term_rewriting_lexer_t *rewrite);

int polyform_capsule_verify(const polyform_capsule_t *capsule,
                            polyform_block_t *decoded);

int polyform_capsule_append_hop(polyform_capsule_t *capsule,
                                uint32_t hop,
                                uint8_t carrier_index,
                                polyform_orientation_t orientation,
                                uint8_t scope_depth,
                                const layer_clock_t *clock);

int polyform_capsule_replay_route(polyform_capsule_t *capsule,
                                  const uint8_t *carrier_indices,
                                  const uint8_t *orientations,
                                  size_t hop_count,
                                  const layer_clock_t *clock);

int polyform_capsule_serialize(const polyform_capsule_t *capsule,
                               uint8_t *buf,
                               size_t cap);

int polyform_capsule_deserialize(const uint8_t *buf,
                                 size_t len,
                                 polyform_capsule_t *capsule);

#endif
