#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int write_byte(FILE *out, uint8_t byte)
{
    return fwrite(&byte, sizeof(byte), 1, out) == 1 ? 0 : 1;
}

static uint8_t byte_for_pattern(size_t index, const char *pattern)
{
    if (strcmp(pattern, "null") == 0) {
        return 0x00;
    }

    if (strcmp(pattern, "mixed") == 0) {
        static const uint8_t mixed[] = {
            0x11, 0x11, 0x00, 0x33, 0x22, 0x22, 0x44, 0x45,
            0x00, 0x00, 0x7f, 0x7f, 0x01, 0x02, 0x80, 0x80,
        };
        return mixed[index % sizeof(mixed)];
    }

    if (strcmp(pattern, "ramp") == 0) {
        return (uint8_t)(index & 0xffu);
    }

    static const uint8_t phase1[] = {
        0x11, 0x11, 0x00, 0x33, 0x22, 0x22, 0x44, 0x45,
    };
    return phase1[index % sizeof(phase1)];
}

int main(int argc, char **argv)
{
    const char *path = argc > 1 ? argv[1] : "vm_image/omi.img";
    size_t size = argc > 2 ? (size_t)strtoul(argv[2], NULL, 10) : 4096u;
    const char *pattern = argc > 3 ? argv[3] : "phase1";

    FILE *out = fopen(path, "wb");
    if (!out) {
        perror(path);
        return 1;
    }

    for (size_t i = 0; i < size; i++) {
        if (write_byte(out, byte_for_pattern(i, pattern)) != 0) {
            perror(path);
            fclose(out);
            return 1;
        }
    }

    if (fclose(out) != 0) {
        perror(path);
        return 1;
    }

    printf("wrote %zu bytes to %s using %s pattern\n", size, path, pattern);
    return 0;
}
