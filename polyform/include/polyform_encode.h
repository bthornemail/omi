#ifndef OMI_POLYFORM_ENCODE_H
#define OMI_POLYFORM_ENCODE_H

#include "polyform_block.h"

/* Canonical serialized size for polyform_block_fields_t
   (all fields in witness order + polygon loop) */
#define POLYFORM_SERIALIZED_FIELDS_MAX 192
#define POLYFORM_SERIALIZED_PAYLOAD_MAX 256
#define POLYFORM_BRAILLE_MAX 256
#define POLYFORM_CARRIER_COUNT 10
#define POLYFORM_CARRIER_BITS 48

/* Serialize block fields to canonical byte buffer.
   Returns number of bytes written, or -1 on error. */
int polyform_serialize_fields(const polyform_block_t *block,
                              uint8_t *buf, size_t cap);

/* Deserialize canonical bytes back to block fields.
   Returns 0 on success, -1 on error. */
int polyform_deserialize_fields(const uint8_t *buf, size_t len,
                                polyform_block_t *block);

/* Encode byte payload as Braille codepoints (each byte → 0x2800 + byte).
   Returns number of codepoints written. */
int polyform_encode_braille(const uint8_t *payload, size_t payload_len,
                            uint32_t *braille, size_t max_codepoints);

/* Decode Braille codepoints back to bytes.
   Returns 0 on success, -1 on error. */
int polyform_decode_braille(const uint32_t *braille, size_t num_codepoints,
                            uint8_t *payload, size_t *payload_len);

/* Full roundtrip encode: serialize block fields + witness → Braille codepoints.
   Returns number of Braille codepoints. */
int polyform_roundtrip_encode(const polyform_block_t *block,
                              uint32_t *braille, size_t max_codepoints);

/* Full roundtrip decode: Braille codepoints → block (verifies witness).
   Returns 0 if witness matches, -1 on error/mismatch. */
int polyform_roundtrip_decode(const uint32_t *braille, size_t num_codepoints,
                              polyform_block_t *block);

/* Generate 48 carrier bits from block witness for a given carrier index.
   Uses the same LCG as the workbench JS carrierBars(). */
void polyform_carrier_bits(const polyform_block_t *block, int carrier_idx,
                           uint8_t *bits, int *bit_count);

/* Decode carrier bits back to a witness value for a given carrier index.
   Starting from the witness in the provided block, verifies a 48-bit LCG match.
   Returns 0 on match, -1 on mismatch. */
int polyform_carrier_verify(const polyform_block_t *block, int carrier_idx,
                            const uint8_t *bits, int bit_count);

#endif
