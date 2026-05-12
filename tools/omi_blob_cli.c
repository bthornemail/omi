#include "omi_blob.h"

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void usage(const char *prog) {
    fprintf(stderr,
            "Usage:\n"
            "  %s encode <input.omi> <output.blob> <receipt-or-manifest>\n"
            "  %s decode <input.blob> <output.omi>\n"
            "  %s verify <input.blob>\n"
            "  %s receipt <input.omi>\n"
            "  %s map\n",
            prog, prog, prog, prog, prog);
}

static int read_file(const char *path, uint8_t **out, size_t *out_len) {
    FILE *f;
    long n;
    uint8_t *buf;

    if (!path || !out || !out_len) return 1;
    f = fopen(path, "rb");
    if (!f) return 1;
    if (fseek(f, 0, SEEK_END) != 0) {
        fclose(f);
        return 1;
    }
    n = ftell(f);
    if (n < 0) {
        fclose(f);
        return 1;
    }
    rewind(f);

    buf = (uint8_t *)malloc((size_t)n + 1u);
    if (!buf) {
        fclose(f);
        return 1;
    }
    if ((size_t)n != 0u && fread(buf, 1u, (size_t)n, f) != (size_t)n) {
        free(buf);
        fclose(f);
        return 1;
    }
    fclose(f);

    buf[n] = 0u;
    *out = buf;
    *out_len = (size_t)n;
    return 0;
}

static int write_file(const char *path, const uint8_t *data, size_t len) {
    FILE *f = fopen(path, "wb");
    if (!f) return 1;
    if (len != 0u && fwrite(data, 1u, len, f) != len) {
        fclose(f);
        return 1;
    }
    fclose(f);
    return 0;
}

static int write_receipt_target(const char *path, uint32_t receipt) {
    FILE *f = fopen(path, "w");
    if (!f) return 1;
    fprintf(f, "fnv1a32:%08x\n", receipt);
    fclose(f);
    return 0;
}

static int cmd_encode(const char *in_path, const char *blob_path, const char *receipt_path) {
    uint8_t *src = NULL;
    size_t src_len = 0u;
    uint8_t *payload = NULL;
    uint8_t *blob = NULL;
    size_t payload_len = 0u;
    size_t blob_len = 0u;
    omi_status_t rc;
    uint32_t receipt;
    int exit_code = 1;

    if (read_file(in_path, &src, &src_len) != 0) {
        fprintf(stderr, "read failed: %s\n", in_path);
        return 1;
    }

    payload = (uint8_t *)malloc(src_len + 1u);
    blob = (uint8_t *)malloc(src_len + OMI_HEADER_SIZE + 1u);
    if (!payload || !blob) {
        fprintf(stderr, "allocation failed\n");
        goto done;
    }

    rc = omi_encode_omilisp_payload((const char *)src, payload, src_len + 1u, &payload_len);
    if (rc != OMI_OK) {
        fprintf(stderr, "encode failed: %s\n", omi_status_name(rc));
        goto done;
    }

    rc = omi_wrap_blob(payload, payload_len, blob, src_len + OMI_HEADER_SIZE + 1u, &blob_len);
    if (rc != OMI_OK) {
        fprintf(stderr, "wrap failed: %s\n", omi_status_name(rc));
        goto done;
    }

    if (write_file(blob_path, blob, blob_len) != 0) {
        fprintf(stderr, "write blob failed: %s\n", blob_path);
        goto done;
    }

    receipt = omi_compute_receipt(payload, payload_len);
    if (strcmp(receipt_path, "-") != 0 && write_receipt_target(receipt_path, receipt) != 0) {
        fprintf(stderr, "write receipt failed: %s\n", receipt_path);
        goto done;
    }

    printf("fnv1a32:%08x\n", receipt);
    exit_code = 0;

done:
    free(src);
    free(payload);
    free(blob);
    return exit_code;
}

static int cmd_decode(const char *blob_path, const char *out_path) {
    uint8_t *blob = NULL;
    size_t blob_len = 0u;
    const uint8_t *payload = NULL;
    size_t payload_len = 0u;
    char *decoded = NULL;
    omi_status_t rc;
    int exit_code = 1;

    if (read_file(blob_path, &blob, &blob_len) != 0) {
        fprintf(stderr, "read failed: %s\n", blob_path);
        return 1;
    }

    rc = omi_unwrap_blob(blob, blob_len, &payload, &payload_len);
    if (rc != OMI_OK) {
        fprintf(stderr, "unwrap failed: %s\n", omi_status_name(rc));
        goto done;
    }

    decoded = (char *)malloc(payload_len + 1u);
    if (!decoded) {
        fprintf(stderr, "allocation failed\n");
        goto done;
    }

    rc = omi_decode_payload_to_omilisp(payload, payload_len, decoded, payload_len + 1u);
    if (rc != OMI_OK) {
        fprintf(stderr, "decode failed: %s\n", omi_status_name(rc));
        goto done;
    }

    if (write_file(out_path, (const uint8_t *)decoded, strlen(decoded)) != 0) {
        fprintf(stderr, "write failed: %s\n", out_path);
        goto done;
    }

    exit_code = 0;

done:
    free(blob);
    free(decoded);
    return exit_code;
}

static int cmd_verify(const char *blob_path) {
    uint8_t *blob = NULL;
    size_t blob_len = 0u;
    const uint8_t *payload = NULL;
    size_t payload_len = 0u;
    omi_status_t rc;

    if (read_file(blob_path, &blob, &blob_len) != 0) {
        fprintf(stderr, "read failed: %s\n", blob_path);
        return 1;
    }

    rc = omi_unwrap_blob(blob, blob_len, &payload, &payload_len);
    free(blob);

    if (rc != OMI_OK) {
        printf("FAILED:%s\n", omi_status_name(rc));
        return 1;
    }

    printf("VERIFIED:%zu\n", payload_len);
    return 0;
}

static int cmd_receipt(const char *in_path) {
    uint8_t *src = NULL;
    size_t src_len = 0u;
    uint8_t *payload = NULL;
    size_t payload_len = 0u;
    omi_status_t rc;
    uint32_t receipt;

    if (read_file(in_path, &src, &src_len) != 0) {
        fprintf(stderr, "read failed: %s\n", in_path);
        return 1;
    }

    payload = (uint8_t *)malloc(src_len + 1u);
    if (!payload) {
        free(src);
        fprintf(stderr, "allocation failed\n");
        return 1;
    }

    rc = omi_encode_omilisp_payload((const char *)src, payload, src_len + 1u, &payload_len);
    if (rc != OMI_OK) {
        fprintf(stderr, "encode failed: %s\n", omi_status_name(rc));
        free(src);
        free(payload);
        return 1;
    }

    receipt = omi_compute_receipt(payload, payload_len);
    printf("fnv1a32:%08x\n", receipt);

    free(src);
    free(payload);
    return 0;
}

static int cmd_map(void) {
    for (unsigned i = 0; i < 10u; i++) {
        omi_layer_projection_t projection;
        omi_status_t rc = omi_layer_to_projection((omi_layer_t)i, &projection);
        if (rc != OMI_OK) {
            return 1;
        }

        if (projection.primary == OMI_OSI_MODIFIER) {
            printf("%s -> modifier(%s,%s)\n",
                   omi_layer_name(projection.layer),
                   omi_osi_name(projection.modifier_a),
                   omi_osi_name(projection.modifier_b));
        } else {
            printf("%s -> %s\n",
                   omi_layer_name(projection.layer),
                   omi_osi_name(projection.primary));
        }
    }
    return 0;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        usage(argv[0]);
        return 1;
    }

    if (strcmp(argv[1], "encode") == 0 && argc == 5) {
        return cmd_encode(argv[2], argv[3], argv[4]);
    }
    if (strcmp(argv[1], "decode") == 0 && argc == 4) {
        return cmd_decode(argv[2], argv[3]);
    }
    if (strcmp(argv[1], "verify") == 0 && argc == 3) {
        return cmd_verify(argv[2]);
    }
    if (strcmp(argv[1], "receipt") == 0 && argc == 3) {
        return cmd_receipt(argv[2]);
    }
    if (strcmp(argv[1], "map") == 0 && argc == 2) {
        return cmd_map();
    }

    usage(argv[0]);
    return 1;
}
