#ifndef OMI_CONS256_H
#define OMI_CONS256_H

#include <stddef.h>
#include <stdint.h>

#define OMI_CONS256_CDR_SIZE 16u
#define OMI_CONS256_BINARY_SIZE 32u
#define OMI_CONS256_DID_MIN_SIZE 58u

typedef struct omi_cons256 {
    uint64_t car64;
    uint8_t cdr128[OMI_CONS256_CDR_SIZE];
    uint64_t meta64;
} omi_cons256_t;

omi_cons256_t omi_cons256_pack(uint64_t car64,
                               const uint8_t *cdr128,
                               uint64_t meta64);

void omi_cons256_serialize(const omi_cons256_t *cons,
                           uint8_t out[OMI_CONS256_BINARY_SIZE]);

void omi_cons256_deserialize(omi_cons256_t *cons,
                             const uint8_t data[OMI_CONS256_BINARY_SIZE]);

uint64_t omi_cons256_witness(const omi_cons256_t *cons);

int omi_cons256_did(char *buf, size_t len, const omi_cons256_t *cons);

#endif
