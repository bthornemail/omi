#include "omi_cons256.h"

#include <string.h>

#define OMI_CONS256_FNV64_OFFSET 0xCBF29CE484222325ULL
#define OMI_CONS256_FNV64_PRIME  0x100000001B3ULL

static void write_u64_le(uint8_t *out, uint64_t value)
{
    for (unsigned i = 0; i < 8u; i++) {
        out[i] = (uint8_t)((value >> (i * 8u)) & 0xffu);
    }
}

static uint64_t read_u64_le(const uint8_t *data)
{
    uint64_t value = 0u;
    for (unsigned i = 0; i < 8u; i++) {
        value |= ((uint64_t)data[i]) << (i * 8u);
    }
    return value;
}

static char hex_digit(uint8_t nibble)
{
    static const char digits[] = "0123456789abcdef";
    return digits[nibble & 0x0fu];
}

static void write_u64_hex_be(char *out, uint64_t value)
{
    for (unsigned i = 0; i < 16u; i++) {
        unsigned shift = (15u - i) * 4u;
        out[i] = hex_digit((uint8_t)((value >> shift) & 0x0fu));
    }
}

static void write_bytes_hex(char *out, const uint8_t *bytes, size_t count)
{
    for (size_t i = 0; i < count; i++) {
        out[i * 2u] = hex_digit((uint8_t)(bytes[i] >> 4u));
        out[i * 2u + 1u] = hex_digit(bytes[i]);
    }
}

omi_cons256_t omi_cons256_pack(uint64_t car64,
                               const uint8_t *cdr128,
                               uint64_t meta64)
{
    omi_cons256_t cons;

    cons.car64 = car64;
    if (cdr128) {
        memcpy(cons.cdr128, cdr128, OMI_CONS256_CDR_SIZE);
    } else {
        memset(cons.cdr128, 0, OMI_CONS256_CDR_SIZE);
    }
    cons.meta64 = meta64;
    return cons;
}

void omi_cons256_serialize(const omi_cons256_t *cons,
                           uint8_t out[OMI_CONS256_BINARY_SIZE])
{
    if (!cons || !out) {
        return;
    }

    write_u64_le(&out[0], cons->car64);
    memcpy(&out[8], cons->cdr128, OMI_CONS256_CDR_SIZE);
    write_u64_le(&out[24], cons->meta64);
}

void omi_cons256_deserialize(omi_cons256_t *cons,
                             const uint8_t data[OMI_CONS256_BINARY_SIZE])
{
    if (!cons || !data) {
        return;
    }

    cons->car64 = read_u64_le(&data[0]);
    memcpy(cons->cdr128, &data[8], OMI_CONS256_CDR_SIZE);
    cons->meta64 = read_u64_le(&data[24]);
}

uint64_t omi_cons256_witness(const omi_cons256_t *cons)
{
    uint8_t bytes[OMI_CONS256_BINARY_SIZE];
    uint64_t hash = OMI_CONS256_FNV64_OFFSET;

    if (!cons) {
        return 0u;
    }

    omi_cons256_serialize(cons, bytes);
    for (unsigned i = 0; i < OMI_CONS256_BINARY_SIZE; i++) {
        hash ^= bytes[i];
        hash *= OMI_CONS256_FNV64_PRIME;
    }
    return hash;
}

int omi_cons256_did(char *buf, size_t len, const omi_cons256_t *cons)
{
    static const char prefix[] = "did:omi:";
    const size_t prefix_len = sizeof(prefix) - 1u;
    const size_t car_hex_len = 16u;
    const size_t cdr_hex_len = OMI_CONS256_CDR_SIZE * 2u;
    const size_t required = prefix_len + car_hex_len + 1u + cdr_hex_len + 1u;
    size_t p = 0;

    if (!buf || !cons || len < required) {
        return -1;
    }

    memcpy(&buf[p], prefix, prefix_len);
    p += prefix_len;
    write_u64_hex_be(&buf[p], cons->car64);
    p += car_hex_len;
    buf[p++] = ':';
    write_bytes_hex(&buf[p], cons->cdr128, OMI_CONS256_CDR_SIZE);
    p += cdr_hex_len;
    buf[p] = '\0';
    return (int)p;
}
