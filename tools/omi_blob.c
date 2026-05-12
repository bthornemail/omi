#include "omi_blob.h"

#include <string.h>

uint8_t omi_rotl8(uint8_t x, unsigned n) {
    n &= 7u;
    if (n == 0u) return x;
    return (uint8_t)((uint8_t)(x << n) | (uint8_t)(x >> (8u - n)));
}

uint8_t omi_rotr8(uint8_t x, unsigned n) {
    n &= 7u;
    if (n == 0u) return x;
    return (uint8_t)((uint8_t)(x >> n) | (uint8_t)(x << (8u - n)));
}

uint8_t omi_delta8(uint8_t x, uint8_t c) {
    return (uint8_t)(omi_rotl8(x, 1u) ^ omi_rotl8(x, 3u) ^ omi_rotr8(x, 2u) ^ c);
}

uint32_t omi_compute_receipt(const uint8_t *data, size_t len) {
    uint32_t h = 2166136261u;
    if (!data && len != 0u) return 0u;

    for (size_t i = 0; i < len; i++) {
        h ^= (uint32_t)data[i];
        h *= 16777619u;
    }
    return h;
}

omi_status_t omi_make_token(omi_band_t band, uint8_t slot, uint8_t *out_token) {
    if (!out_token) return OMI_ERR_NULL;
    if ((unsigned)band > 3u || slot > 0x1Fu) return OMI_ERR_TOKEN;
    *out_token = (uint8_t)(((uint8_t)band << 5) | (slot & 0x1Fu));
    return OMI_OK;
}

omi_status_t omi_token_band(uint8_t token, omi_band_t *out_band) {
    if (!out_band) return OMI_ERR_NULL;
    *out_band = (omi_band_t)((token >> 5) & 0x03u);
    return OMI_OK;
}

omi_status_t omi_token_slot(uint8_t token, uint8_t *out_slot) {
    if (!out_slot) return OMI_ERR_NULL;
    *out_slot = token & 0x1Fu;
    return OMI_OK;
}

static int omi_is_allowed_payload_byte(unsigned char ch) {
    return ch == '\n' || ch == '\r' || ch == '\t' || (ch >= 0x20u && ch <= 0x7Eu);
}

omi_status_t omi_validate_omilisp_text(const char *src) {
    int balance = 0;
    int saw_open = 0;
    int saw_close = 0;

    if (!src) return OMI_ERR_NULL;

    for (const unsigned char *p = (const unsigned char *)src; *p; p++) {
        unsigned char ch = *p;
        if (!omi_is_allowed_payload_byte(ch)) return OMI_ERR_TOKEN;

        if (ch == '(') {
            balance++;
            saw_open = 1;
        } else if (ch == ')') {
            balance--;
            saw_close = 1;
            if (balance < 0) return OMI_ERR_UNBALANCED;
        }
    }

    if (balance != 0) return OMI_ERR_UNBALANCED;
    if (!saw_open || !saw_close) return OMI_ERR_TOKEN;
    return OMI_OK;
}

omi_status_t omi_encode_omilisp_payload(const char *src, uint8_t *payload, size_t cap, size_t *out_len) {
    size_t pos = 0;
    omi_status_t rc;

    if (!src || !payload || !out_len) return OMI_ERR_NULL;

    rc = omi_validate_omilisp_text(src);
    if (rc != OMI_OK) return rc;

    for (const unsigned char *p = (const unsigned char *)src; *p; p++) {
        unsigned char ch = *p;
        if (!omi_is_allowed_payload_byte(ch)) return OMI_ERR_TOKEN;
        if (pos >= cap) return OMI_ERR_CAPACITY;
        payload[pos++] = (uint8_t)(ch & 0x7Fu);
    }

    *out_len = pos;
    return OMI_OK;
}

omi_status_t omi_decode_payload_to_omilisp(const uint8_t *payload, size_t len, char *out, size_t cap) {
    if (!payload || !out) return OMI_ERR_NULL;
    if (cap == 0u) return OMI_ERR_CAPACITY;
    if (len + 1u > cap) return OMI_ERR_CAPACITY;

    for (size_t i = 0; i < len; i++) {
        uint8_t b = payload[i];
        if (!omi_is_allowed_payload_byte(b)) return OMI_ERR_TOKEN;
        out[i] = (char)b;
    }
    out[len] = '\0';
    return OMI_OK;
}

omi_status_t omi_wrap_blob(const uint8_t *payload, size_t payload_len, uint8_t *blob, size_t cap, size_t *out_len) {
    uint32_t receipt;

    if (!payload || !blob || !out_len) return OMI_ERR_NULL;
    if (payload_len > OMI_MAX_PAYLOAD) return OMI_ERR_CAPACITY;
    if (cap < OMI_HEADER_SIZE + payload_len) return OMI_ERR_CAPACITY;

    receipt = omi_compute_receipt(payload, payload_len);

    blob[0] = (uint8_t)OMI_MAGIC0;
    blob[1] = (uint8_t)OMI_MAGIC1;
    blob[2] = (uint8_t)OMI_MAGIC2;
    blob[3] = (uint8_t)OMI_MAGIC3;
    blob[4] = (uint8_t)OMI_VERSION;
    blob[5] = 0x00u;
    blob[6] = (uint8_t)((payload_len >> 8) & 0xFFu);
    blob[7] = (uint8_t)(payload_len & 0xFFu);
    blob[8] = (uint8_t)((receipt >> 24) & 0xFFu);
    blob[9] = (uint8_t)((receipt >> 16) & 0xFFu);
    blob[10] = (uint8_t)((receipt >> 8) & 0xFFu);
    blob[11] = (uint8_t)(receipt & 0xFFu);

    memcpy(blob + OMI_HEADER_SIZE, payload, payload_len);
    *out_len = OMI_HEADER_SIZE + payload_len;
    return OMI_OK;
}

omi_status_t omi_unwrap_blob(const uint8_t *blob, size_t blob_len, const uint8_t **payload, size_t *payload_len) {
    uint16_t payload_len_val;
    uint32_t expected_receipt;
    uint32_t got_receipt;
    const uint8_t *payload_ptr;

    if (!blob || !payload || !payload_len) return OMI_ERR_NULL;
    if (blob_len < OMI_HEADER_SIZE) return OMI_ERR_MAGIC;

    if (blob[0] != (uint8_t)OMI_MAGIC0 || blob[1] != (uint8_t)OMI_MAGIC1 ||
        blob[2] != (uint8_t)OMI_MAGIC2 || blob[3] != (uint8_t)OMI_MAGIC3) {
        return OMI_ERR_MAGIC;
    }
    if (blob[4] != (uint8_t)OMI_VERSION) return OMI_ERR_VERSION;

    payload_len_val = (uint16_t)(((uint16_t)blob[6] << 8) | (uint16_t)blob[7]);
    expected_receipt =
        ((uint32_t)blob[8] << 24) |
        ((uint32_t)blob[9] << 16) |
        ((uint32_t)blob[10] << 8) |
        ((uint32_t)blob[11]);

    if (blob_len != OMI_HEADER_SIZE + (size_t)payload_len_val) return OMI_ERR_CAPACITY;

    payload_ptr = blob + OMI_HEADER_SIZE;
    got_receipt = omi_compute_receipt(payload_ptr, payload_len_val);
    if (expected_receipt != got_receipt) return OMI_ERR_CHECK;

    for (size_t i = 0; i < payload_len_val; i++) {
        if (!omi_is_allowed_payload_byte(payload_ptr[i])) return OMI_ERR_TOKEN;
    }

    *payload = payload_ptr;
    *payload_len = payload_len_val;
    return OMI_OK;
}

const char *omi_layer_name(omi_layer_t layer) {
    static const char *names[] = {
        "declarative", "epistemic", "systematic", "topological", "closure",
        "definitive", "federated", "procedural", "chronological", "constructive"
    };
    return ((unsigned)layer < 10u) ? names[layer] : "unknown";
}

const char *omi_osi_name(omi_osi_t osi) {
    static const char *names[] = {
        "application", "presentation", "session", "transport",
        "network", "data-link", "physical", "modifier"
    };
    return ((unsigned)osi < 8u) ? names[osi] : "unknown";
}

omi_status_t omi_layer_to_projection(omi_layer_t layer, omi_layer_projection_t *out) {
    if (!out) return OMI_ERR_NULL;

    out->layer = layer;
    out->modifier_a = OMI_OSI_MODIFIER;
    out->modifier_b = OMI_OSI_MODIFIER;

    switch (layer) {
        case OMI_LAYER_DECLARATIVE:
            out->primary = OMI_OSI_APPLICATION;
            return OMI_OK;
        case OMI_LAYER_EPISTEMIC:
            out->primary = OMI_OSI_PRESENTATION;
            return OMI_OK;
        case OMI_LAYER_SYSTEMATIC:
            out->primary = OMI_OSI_SESSION;
            return OMI_OK;
        case OMI_LAYER_TOPOLOGICAL:
            out->primary = OMI_OSI_TRANSPORT;
            return OMI_OK;
        case OMI_LAYER_CLOSURE:
            out->primary = OMI_OSI_NETWORK;
            return OMI_OK;
        case OMI_LAYER_DEFINITIVE:
            out->primary = OMI_OSI_DATA_LINK;
            return OMI_OK;
        case OMI_LAYER_CONSTRUCTIVE:
            out->primary = OMI_OSI_PHYSICAL;
            return OMI_OK;
        case OMI_LAYER_FEDERATED:
            out->primary = OMI_OSI_MODIFIER;
            out->modifier_a = OMI_OSI_NETWORK;
            out->modifier_b = OMI_OSI_TRANSPORT;
            return OMI_OK;
        case OMI_LAYER_PROCEDURAL:
            out->primary = OMI_OSI_MODIFIER;
            out->modifier_a = OMI_OSI_SESSION;
            out->modifier_b = OMI_OSI_APPLICATION;
            return OMI_OK;
        case OMI_LAYER_CHRONOLOGICAL:
            out->primary = OMI_OSI_MODIFIER;
            out->modifier_a = OMI_OSI_TRANSPORT;
            out->modifier_b = OMI_OSI_PHYSICAL;
            return OMI_OK;
        default:
            return OMI_ERR_LAYER;
    }
}

omi_status_t omi_parse_layer_name(const char *name, omi_layer_t *out) {
    if (!name || !out) return OMI_ERR_NULL;
    for (unsigned i = 0; i < 10u; i++) {
        if (strcmp(name, omi_layer_name((omi_layer_t)i)) == 0) {
            *out = (omi_layer_t)i;
            return OMI_OK;
        }
    }
    return OMI_ERR_LAYER;
}

const char *omi_status_name(omi_status_t status) {
    switch (status) {
        case OMI_OK: return "ok";
        case OMI_ERR_NULL: return "null";
        case OMI_ERR_CAPACITY: return "capacity";
        case OMI_ERR_MAGIC: return "magic";
        case OMI_ERR_VERSION: return "version";
        case OMI_ERR_CHECK: return "receipt-check";
        case OMI_ERR_TOKEN: return "token";
        case OMI_ERR_UNBALANCED: return "unbalanced";
        case OMI_ERR_LAYER: return "layer";
        case OMI_ERR_IO: return "io";
        default: return "unknown";
    }
}
