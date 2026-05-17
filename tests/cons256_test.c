#include "omi_cons256.h"

#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

static void test_pack_serialize_deserialize(void)
{
    uint8_t cdr[OMI_CONS256_CDR_SIZE] = {
        0x01u, 0x02u, 0x03u, 0x04u,
        0x05u, 0x06u, 0x07u, 0x08u,
        0x09u, 0x0au, 0x0bu, 0x0cu,
        0x0du, 0x0eu, 0x0fu, 0x10u
    };
    omi_cons256_t cons = omi_cons256_pack(0x123456789abcdef0ULL,
                                          cdr,
                                          0xfedcba9876543210ULL);
    uint8_t bytes[OMI_CONS256_BINARY_SIZE];
    omi_cons256_t decoded;

    omi_cons256_serialize(&cons, bytes);

    assert(bytes[0] == 0xf0u);
    assert(bytes[1] == 0xdeu);
    assert(bytes[7] == 0x12u);
    assert(memcmp(&bytes[8], cdr, OMI_CONS256_CDR_SIZE) == 0);
    assert(bytes[24] == 0x10u);
    assert(bytes[31] == 0xfeu);

    memset(&decoded, 0, sizeof(decoded));
    omi_cons256_deserialize(&decoded, bytes);
    assert(decoded.car64 == cons.car64);
    assert(memcmp(decoded.cdr128, cons.cdr128, OMI_CONS256_CDR_SIZE) == 0);
    assert(decoded.meta64 == cons.meta64);

    printf("  OK 32-byte car64/cdr128/meta64 roundtrip\n");
}

static void test_witness(void)
{
    uint8_t cdr[OMI_CONS256_CDR_SIZE] = {
        0x01u, 0x02u, 0x03u, 0x04u,
        0x05u, 0x06u, 0x07u, 0x08u,
        0x09u, 0x0au, 0x0bu, 0x0cu,
        0x0du, 0x0eu, 0x0fu, 0x10u
    };
    omi_cons256_t a = omi_cons256_pack(0x123456789abcdef0ULL,
                                       cdr,
                                       0xfedcba9876543210ULL);
    omi_cons256_t b = omi_cons256_pack(0x123456789abcdef0ULL,
                                       cdr,
                                       0xfedcba9876543210ULL);
    uint64_t wa = omi_cons256_witness(&a);
    uint64_t wb = omi_cons256_witness(&b);

    b.cdr128[15] ^= 0x01u;
    assert(wa != 0u);
    assert(wa == wb);
    assert(wa != omi_cons256_witness(&b));
    assert(omi_cons256_witness(0) == 0u);

    printf("  witness=0x%016llX\n", (unsigned long long)wa);
    printf("  OK FNV-1a64 witness is deterministic and content-sensitive\n");
}

static void test_did(void)
{
    uint8_t cdr[OMI_CONS256_CDR_SIZE] = {
        0x01u, 0x02u, 0x03u, 0x04u,
        0x05u, 0x06u, 0x07u, 0x08u,
        0x09u, 0x0au, 0x0bu, 0x0cu,
        0x0du, 0x0eu, 0x0fu, 0x10u
    };
    omi_cons256_t cons = omi_cons256_pack(0x123456789abcdef0ULL,
                                          cdr,
                                          0xfedcba9876543210ULL);
    char did[128];
    int len = omi_cons256_did(did, sizeof(did), &cons);

    assert(len > 0);
    assert(strcmp(did,
                  "did:omi:123456789abcdef0:0102030405060708090a0b0c0d0e0f10") == 0);
    assert(omi_cons256_did(did, 8, &cons) == -1);
    assert(omi_cons256_did(0, sizeof(did), &cons) == -1);
    assert(omi_cons256_did(did, sizeof(did), 0) == -1);

    printf("  DID: %s\n", did);
    printf("  OK DID maps car64 and cdr128 into browser-compatible form\n");
}

static void test_null_cdr_pack(void)
{
    omi_cons256_t cons = omi_cons256_pack(1u, 0, 2u);
    for (size_t i = 0; i < OMI_CONS256_CDR_SIZE; i++) {
        assert(cons.cdr128[i] == 0u);
    }
    printf("  OK null cdr128 packs as zero continuation\n");
}

int main(void)
{
    printf("Testing CONS256 kernel memory model\n");
    printf("===================================\n\n");

    test_pack_serialize_deserialize();
    test_witness();
    test_did();
    test_null_cdr_pack();

    printf("\n===================================\n");
    printf("ALL CONS256 TESTS PASSED\n");
    return 0;
}
