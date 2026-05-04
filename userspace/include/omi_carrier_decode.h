#ifndef OMI_CARRIER_DECODE_H
#define OMI_CARRIER_DECODE_H

#include "omi_model_loader.h"

#define OMI_TIMING_MASTER_5040 5040u
#define OMI_TIMING_PRIVATE_60 60u
#define OMI_TIMING_OPERATOR_16 16u
#define OMI_TIMING_KERNEL_8 8u
#define OMI_TIMING_FANO_7 7u
#define OMI_TIMING_GLOBAL_360 360u
#define OMI_TIMING_PUBLIC_240 240u
#define OMI_BEECODE_MAX_15BIT 32767u

typedef enum {
    OMI_CARRIER_CODE16K = 1,
    OMI_CARRIER_AZTEC = 2,
    OMI_CARRIER_MAXICODE = 3,
    OMI_CARRIER_BEECODE = 4
} omi_carrier_kind_t;

typedef struct {
    unsigned master_5040;
    unsigned private_60;
    unsigned operator_16;
    unsigned kernel_8;
    unsigned fano_7;
} omi_code16k_timing_receipt_t;

typedef struct {
    unsigned global_360;
    const char *object_id;
} omi_aztec_object_receipt_t;

typedef struct {
    unsigned public_240;
    const char *canvas_id;
} omi_maxicode_canvas_receipt_t;

typedef struct {
    unsigned selector_15bit;
} omi_beecode_query_receipt_t;

typedef struct {
    omi_code16k_timing_receipt_t code16k;
    omi_aztec_object_receipt_t aztec;
    omi_maxicode_canvas_receipt_t maxicode;
    omi_beecode_query_receipt_t beecode;
    unsigned receipt_hash;
} omi_carrier_frame_t;

int omi_decode_code16k_timing(const omi_code16k_timing_receipt_t *payload,
                              omi_code16k_timing_receipt_t *receipt);
int omi_decode_aztec_object(const omi_aztec_object_receipt_t *payload,
                            omi_aztec_object_receipt_t *receipt);
int omi_decode_maxicode_canvas(const omi_maxicode_canvas_receipt_t *payload,
                               omi_maxicode_canvas_receipt_t *receipt);
int omi_decode_beecode_query(const omi_beecode_query_receipt_t *payload,
                             omi_beecode_query_receipt_t *receipt);
int omi_carrier_frame_build(const omi_code16k_timing_receipt_t *code16k,
                            const omi_aztec_object_receipt_t *aztec,
                            const omi_maxicode_canvas_receipt_t *maxicode,
                            const omi_beecode_query_receipt_t *beecode,
                            omi_carrier_frame_t *frame);
int omi_carrier_register_declaration(omi_model_overlay_t *overlay,
                                     const char *declaration_text,
                                     omi_model_load_result_t *result);

#endif
