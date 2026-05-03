#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

typedef enum {
    OMI_ENDIAN_LITTLE,
    OMI_ENDIAN_BIG
} omi_endian_t;

typedef struct {
    const char *name;
    const char *qemu_binary;
    const char *qemu_machine;
    omi_endian_t endian;
    uint32_t word_bits;
} platform_profile_t;

typedef struct {
    const char *id;
    uint64_t value;
    uint32_t width_bits;
    omi_endian_t endian;
    uint8_t expected[8];
    uint64_t expected_swap;
} endian_vector_t;

static void encode32(uint32_t value, omi_endian_t endian, uint8_t out[4])
{
    if (endian == OMI_ENDIAN_LITTLE) {
        out[0] = (uint8_t)(value & 0xffu);
        out[1] = (uint8_t)((value >> 8) & 0xffu);
        out[2] = (uint8_t)((value >> 16) & 0xffu);
        out[3] = (uint8_t)((value >> 24) & 0xffu);
        return;
    }

    out[0] = (uint8_t)((value >> 24) & 0xffu);
    out[1] = (uint8_t)((value >> 16) & 0xffu);
    out[2] = (uint8_t)((value >> 8) & 0xffu);
    out[3] = (uint8_t)(value & 0xffu);
}

static uint32_t decode32(const uint8_t in[4], omi_endian_t endian)
{
    if (endian == OMI_ENDIAN_LITTLE) {
        return ((uint32_t)in[0]) |
               ((uint32_t)in[1] << 8) |
               ((uint32_t)in[2] << 16) |
               ((uint32_t)in[3] << 24);
    }

    return ((uint32_t)in[0] << 24) |
           ((uint32_t)in[1] << 16) |
           ((uint32_t)in[2] << 8) |
           ((uint32_t)in[3]);
}

static void reverse4(uint8_t bytes[4])
{
    uint8_t tmp = bytes[0];
    bytes[0] = bytes[3];
    bytes[3] = tmp;
    tmp = bytes[1];
    bytes[1] = bytes[2];
    bytes[2] = tmp;
}

static omi_endian_t opposite(omi_endian_t endian)
{
    return endian == OMI_ENDIAN_LITTLE ? OMI_ENDIAN_BIG : OMI_ENDIAN_LITTLE;
}

static void test_profile(const platform_profile_t *profile)
{
    const uint32_t word = 0x01020304u;
    uint8_t encoded[4];
    uint8_t reversed[4];
    uint8_t expected_opposite[4];

    encode32(word, profile->endian, encoded);
    assert(decode32(encoded, profile->endian) == word);

    memcpy(reversed, encoded, sizeof(reversed));
    reverse4(reversed);
    encode32(word, opposite(profile->endian), expected_opposite);
    assert(memcmp(reversed, expected_opposite, sizeof(reversed)) == 0);
    assert(decode32(reversed, opposite(profile->endian)) == word);

    reverse4(reversed);
    assert(memcmp(reversed, encoded, sizeof(reversed)) == 0);

    printf("PLATFORM_ENDIAN name=%s qemu=%s machine=%s endian=%s word_bits=%u OK\n",
           profile->name,
           profile->qemu_binary,
           profile->qemu_machine,
           profile->endian == OMI_ENDIAN_LITTLE ? "little" : "big",
           profile->word_bits);
}

static void test_vector(const endian_vector_t *vector)
{
    uint8_t encoded[8] = {0};
    uint8_t swapped[8] = {0};
    size_t byte_count = vector->width_bits / 8u;
    uint64_t decoded = 0;
    uint64_t swap_decoded = 0;

    assert(vector->width_bits == 16u || vector->width_bits == 32u || vector->width_bits == 64u);

    for (size_t i = 0; i < byte_count; i++) {
        size_t shift_index = vector->endian == OMI_ENDIAN_LITTLE ? i : byte_count - 1u - i;
        encoded[i] = (uint8_t)((vector->value >> (shift_index * 8u)) & 0xffu);
    }

    assert(memcmp(encoded, vector->expected, byte_count) == 0);

    for (size_t i = 0; i < byte_count; i++) {
        size_t shift_index = vector->endian == OMI_ENDIAN_LITTLE ? i : byte_count - 1u - i;
        decoded |= ((uint64_t)encoded[i]) << (shift_index * 8u);
    }
    assert(decoded == vector->value);

    for (size_t i = 0; i < byte_count; i++) {
        swapped[i] = encoded[byte_count - 1u - i];
    }

    for (size_t i = 0; i < byte_count; i++) {
        size_t shift_index = vector->endian == OMI_ENDIAN_LITTLE ? i : byte_count - 1u - i;
        swap_decoded |= ((uint64_t)swapped[i]) << (shift_index * 8u);
    }
    assert(swap_decoded == vector->expected_swap);

    printf("ENDIAN_VECTOR id=%s width=%u endian=%s OK\n",
           vector->id,
           vector->width_bits,
           vector->endian == OMI_ENDIAN_LITTLE ? "little" : "big");
}

int main(void)
{
    const platform_profile_t profiles[] = {
        {"riscv32-virt", "qemu-system-riscv32", "virt", OMI_ENDIAN_LITTLE, 32u},
        {"riscv64-virt", "qemu-system-riscv64", "virt", OMI_ENDIAN_LITTLE, 64u},
        {"armv7-virt-le", "qemu-system-arm", "virt", OMI_ENDIAN_LITTLE, 32u},
        {"armv7-virt-be", "qemu-system-arm", "virt", OMI_ENDIAN_BIG, 32u},
        {"aarch64-virt-le", "qemu-system-aarch64", "virt", OMI_ENDIAN_LITTLE, 64u},
        {"aarch64-virt-be", "qemu-system-aarch64", "virt", OMI_ENDIAN_BIG, 64u},
        {"esp32-s3-xtensa", "qemu-system-xtensa", "esp32s3", OMI_ENDIAN_LITTLE, 32u},
        {"esp32-c3-riscv32", "qemu-system-riscv32", "virt", OMI_ENDIAN_LITTLE, 32u},
    };
    const endian_vector_t vectors[] = {
        {"u16_bom_utf16be", 0xfeffu, 16u, OMI_ENDIAN_BIG, {0xfeu, 0xffu}, 0xfffeu},
        {"u16_bom_utf16le", 0xfffeu, 16u, OMI_ENDIAN_LITTLE, {0xfeu, 0xffu}, 0xfeffu},
        {"u16_control_window_marker_be", 0x1c1du, 16u, OMI_ENDIAN_BIG, {0x1cu, 0x1du}, 0x1d1cu},
        {"u32_state_word_be", 0x12345678u, 32u, OMI_ENDIAN_BIG, {0x12u, 0x34u, 0x56u, 0x78u}, 0x78563412u},
        {"u32_state_word_le", 0x12345678u, 32u, OMI_ENDIAN_LITTLE, {0x78u, 0x56u, 0x34u, 0x12u}, 0x78563412u},
        {"u64_runtime_lane_be", UINT64_C(0x0123456789abcdef), 64u, OMI_ENDIAN_BIG, {0x01u, 0x23u, 0x45u, 0x67u, 0x89u, 0xabu, 0xcdu, 0xefu}, UINT64_C(0xefcdab8967452301)},
        {"u64_runtime_lane_le", UINT64_C(0x0123456789abcdef), 64u, OMI_ENDIAN_LITTLE, {0xefu, 0xcdu, 0xabu, 0x89u, 0x67u, 0x45u, 0x23u, 0x01u}, UINT64_C(0xefcdab8967452301)},
    };

    for (size_t i = 0; i < sizeof(profiles) / sizeof(profiles[0]); i++) {
        test_profile(&profiles[i]);
    }

    for (size_t i = 0; i < sizeof(vectors) / sizeof(vectors[0]); i++) {
        test_vector(&vectors[i]);
    }

    printf("ALL PLATFORM ENDIAN PROFILE TESTS PASSED\n");
    return 0;
}
