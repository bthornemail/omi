/* omi_blob.h - Org OMI carrier bridge
 *
 * Canonical OMIB v1 header:
 *   0..3   magic     "OMIB"
 *   4      version   0x01
 *   5      flags     0x00
 *   6..7   length    big-endian uint16 payload length
 *   8..11  receipt   big-endian uint32 FNV-1a over payload
 *   12..   payload   canonical 7-bit OMI bytes
 */
#ifndef OMI_BLOB_H
#define OMI_BLOB_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define OMI_MAGIC0 'O'
#define OMI_MAGIC1 'M'
#define OMI_MAGIC2 'I'
#define OMI_MAGIC3 'B'
#define OMI_VERSION 0x01u
#define OMI_HEADER_SIZE 12u
#define OMI_MAX_PAYLOAD 65535u

typedef enum {
    OMI_OK = 0,
    OMI_ERR_NULL = -1,
    OMI_ERR_CAPACITY = -2,
    OMI_ERR_MAGIC = -3,
    OMI_ERR_VERSION = -4,
    OMI_ERR_CHECK = -5,
    OMI_ERR_TOKEN = -6,
    OMI_ERR_UNBALANCED = -7,
    OMI_ERR_LAYER = -8,
    OMI_ERR_IO = -9
} omi_status_t;

typedef enum {
    OMI_LAYER_DECLARATIVE = 0,
    OMI_LAYER_EPISTEMIC = 1,
    OMI_LAYER_SYSTEMATIC = 2,
    OMI_LAYER_TOPOLOGICAL = 3,
    OMI_LAYER_CLOSURE = 4,
    OMI_LAYER_DEFINITIVE = 5,
    OMI_LAYER_FEDERATED = 6,
    OMI_LAYER_PROCEDURAL = 7,
    OMI_LAYER_CHRONOLOGICAL = 8,
    OMI_LAYER_CONSTRUCTIVE = 9
} omi_layer_t;

typedef enum {
    OMI_OSI_APPLICATION = 0,
    OMI_OSI_PRESENTATION = 1,
    OMI_OSI_SESSION = 2,
    OMI_OSI_TRANSPORT = 3,
    OMI_OSI_NETWORK = 4,
    OMI_OSI_DATA_LINK = 5,
    OMI_OSI_PHYSICAL = 6,
    OMI_OSI_MODIFIER = 7
} omi_osi_t;

typedef enum {
    OMI_BAND_FS = 0,
    OMI_BAND_GS = 1,
    OMI_BAND_RS = 2,
    OMI_BAND_US = 3
} omi_band_t;

typedef struct {
    omi_layer_t layer;
    omi_osi_t primary;
    omi_osi_t modifier_a;
    omi_osi_t modifier_b;
} omi_layer_projection_t;

uint8_t omi_rotl8(uint8_t x, unsigned n);
uint8_t omi_rotr8(uint8_t x, unsigned n);
uint8_t omi_delta8(uint8_t x, uint8_t c);

uint32_t omi_compute_receipt(const uint8_t *data, size_t len);

omi_status_t omi_make_token(omi_band_t band, uint8_t slot, uint8_t *out_token);
omi_status_t omi_token_band(uint8_t token, omi_band_t *out_band);
omi_status_t omi_token_slot(uint8_t token, uint8_t *out_slot);

omi_status_t omi_validate_omilisp_text(const char *src);
omi_status_t omi_encode_omilisp_payload(const char *src, uint8_t *payload, size_t cap, size_t *out_len);
omi_status_t omi_decode_payload_to_omilisp(const uint8_t *payload, size_t len, char *out, size_t cap);

omi_status_t omi_wrap_blob(const uint8_t *payload, size_t payload_len, uint8_t *blob, size_t cap, size_t *out_len);
omi_status_t omi_unwrap_blob(const uint8_t *blob, size_t blob_len, const uint8_t **payload, size_t *payload_len);

omi_status_t omi_layer_to_projection(omi_layer_t layer, omi_layer_projection_t *out);
const char *omi_layer_name(omi_layer_t layer);
const char *omi_osi_name(omi_osi_t osi);
omi_status_t omi_parse_layer_name(const char *name, omi_layer_t *out);
const char *omi_status_name(omi_status_t status);

#ifdef __cplusplus
}
#endif

#endif
