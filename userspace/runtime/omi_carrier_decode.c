#include "../include/omi_carrier_decode.h"

#include <stdint.h>

static unsigned hash_mix(unsigned hash, unsigned value)
{
    hash ^= value;
    hash *= 16777619u;
    return hash;
}

static unsigned hash_text(unsigned hash, const char *text)
{
    for (const unsigned char *p = (const unsigned char *)text; p && *p; p++) {
        hash = hash_mix(hash, (unsigned)*p);
    }
    return hash;
}

int omi_decode_code16k_timing(const omi_code16k_timing_receipt_t *payload,
                              omi_code16k_timing_receipt_t *receipt)
{
    if (!payload || !receipt) {
        return 0;
    }

    if (payload->master_5040 != OMI_TIMING_MASTER_5040 ||
        payload->private_60 != OMI_TIMING_PRIVATE_60 ||
        payload->operator_16 != OMI_TIMING_OPERATOR_16 ||
        payload->kernel_8 != OMI_TIMING_KERNEL_8 ||
        payload->fano_7 != OMI_TIMING_FANO_7) {
        return 0;
    }

    *receipt = *payload;
    return 1;
}

int omi_decode_aztec_object(const omi_aztec_object_receipt_t *payload,
                            omi_aztec_object_receipt_t *receipt)
{
    if (!payload || !receipt || !payload->object_id || payload->object_id[0] == '\0') {
        return 0;
    }

    if (payload->global_360 != OMI_TIMING_GLOBAL_360) {
        return 0;
    }

    *receipt = *payload;
    return 1;
}

int omi_decode_maxicode_canvas(const omi_maxicode_canvas_receipt_t *payload,
                               omi_maxicode_canvas_receipt_t *receipt)
{
    if (!payload || !receipt || !payload->canvas_id || payload->canvas_id[0] == '\0') {
        return 0;
    }

    if (payload->public_240 != OMI_TIMING_PUBLIC_240) {
        return 0;
    }

    *receipt = *payload;
    return 1;
}

int omi_decode_beecode_query(const omi_beecode_query_receipt_t *payload,
                             omi_beecode_query_receipt_t *receipt)
{
    if (!payload || !receipt) {
        return 0;
    }

    if (payload->selector_15bit > OMI_BEECODE_MAX_15BIT) {
        return 0;
    }

    *receipt = *payload;
    return 1;
}

int omi_carrier_frame_build(const omi_code16k_timing_receipt_t *code16k,
                            const omi_aztec_object_receipt_t *aztec,
                            const omi_maxicode_canvas_receipt_t *maxicode,
                            const omi_beecode_query_receipt_t *beecode,
                            omi_carrier_frame_t *frame)
{
    if (!frame) {
        return 0;
    }

    omi_carrier_frame_t next = {0};
    if (!omi_decode_code16k_timing(code16k, &next.code16k) ||
        !omi_decode_aztec_object(aztec, &next.aztec) ||
        !omi_decode_maxicode_canvas(maxicode, &next.maxicode) ||
        !omi_decode_beecode_query(beecode, &next.beecode)) {
        return 0;
    }

    unsigned hash = 2166136261u;
    hash = hash_mix(hash, next.code16k.master_5040);
    hash = hash_mix(hash, next.code16k.private_60);
    hash = hash_mix(hash, next.code16k.operator_16);
    hash = hash_mix(hash, next.code16k.kernel_8);
    hash = hash_mix(hash, next.code16k.fano_7);
    hash = hash_mix(hash, next.aztec.global_360);
    hash = hash_text(hash, next.aztec.object_id);
    hash = hash_mix(hash, next.maxicode.public_240);
    hash = hash_text(hash, next.maxicode.canvas_id);
    hash = hash_mix(hash, next.beecode.selector_15bit);
    next.receipt_hash = hash;

    *frame = next;
    return 1;
}

int omi_carrier_register_declaration(omi_model_overlay_t *overlay,
                                     const char *declaration_text,
                                     omi_model_load_result_t *result)
{
    return omi_model_loader_load_text(overlay, declaration_text, result);
}
