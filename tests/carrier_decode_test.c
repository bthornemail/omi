#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "omi_carrier_decode.h"

void omi_serial_init(void)
{
}

void omi_serial_write_char(char c)
{
    (void)c;
}

void omi_serial_write_string(const char *text)
{
    (void)text;
}

void omi_serial_write_u32(uint32_t value)
{
    (void)value;
}

void omi_serial_write_size(size_t value)
{
    (void)value;
}

void omi_serial_write_hex8(uint8_t value)
{
    (void)value;
}

void omi_serial_write_hex32(uint32_t value)
{
    (void)value;
}

static const char box_model[] =
    "((FS . model.box.carrier-cargo)\n"
    "  ((GS . identity)\n"
    "    ((RS . object)\n"
    "      ((US . class) . cargo-box)\n"
    "      ((US . authority) . carrier-declaration)))\n"
    "  ((GS . form)\n"
    "    ((RS . body)\n"
    "      ((US . primitive) . rectangular-box)\n"
    "      ((US . function) . carried-load))))\n";

static void test_individual_carriers(void)
{
    printf("Testing timed carrier receipt decoders\n");

    omi_code16k_timing_receipt_t code16k = {
        .master_5040 = OMI_TIMING_MASTER_5040,
        .private_60 = OMI_TIMING_PRIVATE_60,
        .operator_16 = OMI_TIMING_OPERATOR_16,
        .kernel_8 = OMI_TIMING_KERNEL_8,
        .fano_7 = OMI_TIMING_FANO_7,
    };
    omi_code16k_timing_receipt_t invalid_code16k = code16k;
    invalid_code16k.operator_16 = 15u;
    omi_code16k_timing_receipt_t code16k_out;
    assert(omi_decode_code16k_timing(&code16k, &code16k_out) == 1);
    assert(omi_decode_code16k_timing(&invalid_code16k, &code16k_out) == 0);

    omi_aztec_object_receipt_t aztec = {
        .global_360 = OMI_TIMING_GLOBAL_360,
        .object_id = "model.trailer.wike-ebike-cargo",
    };
    omi_aztec_object_receipt_t invalid_aztec = aztec;
    invalid_aztec.global_360 = 359u;
    omi_aztec_object_receipt_t empty_aztec = aztec;
    empty_aztec.object_id = "";
    omi_aztec_object_receipt_t aztec_out;
    assert(omi_decode_aztec_object(&aztec, &aztec_out) == 1);
    assert(omi_decode_aztec_object(&invalid_aztec, &aztec_out) == 0);
    assert(omi_decode_aztec_object(&empty_aztec, &aztec_out) == 0);

    omi_maxicode_canvas_receipt_t maxicode = {
        .public_240 = OMI_TIMING_PUBLIC_240,
        .canvas_id = "canvas.public.cargo-yard",
    };
    omi_maxicode_canvas_receipt_t invalid_maxicode = maxicode;
    invalid_maxicode.public_240 = 241u;
    omi_maxicode_canvas_receipt_t empty_maxicode = maxicode;
    empty_maxicode.canvas_id = "";
    omi_maxicode_canvas_receipt_t maxicode_out;
    assert(omi_decode_maxicode_canvas(&maxicode, &maxicode_out) == 1);
    assert(omi_decode_maxicode_canvas(&invalid_maxicode, &maxicode_out) == 0);
    assert(omi_decode_maxicode_canvas(&empty_maxicode, &maxicode_out) == 0);

    omi_beecode_query_receipt_t beecode = { .selector_15bit = OMI_BEECODE_MAX_15BIT };
    omi_beecode_query_receipt_t invalid_beecode = {
        .selector_15bit = OMI_BEECODE_MAX_15BIT + 1u
    };
    omi_beecode_query_receipt_t beecode_out;
    assert(omi_decode_beecode_query(&beecode, &beecode_out) == 1);
    assert(omi_decode_beecode_query(&invalid_beecode, &beecode_out) == 0);

    printf("  OK Code16K, Aztec, MaxiCode, and BeeCode receipts validate\n\n");
}

static void test_combined_trailer_carrier_frame(void)
{
    printf("Testing combined trailer carrier frame\n");

    omi_code16k_timing_receipt_t code16k = {
        .master_5040 = OMI_TIMING_MASTER_5040,
        .private_60 = OMI_TIMING_PRIVATE_60,
        .operator_16 = OMI_TIMING_OPERATOR_16,
        .kernel_8 = OMI_TIMING_KERNEL_8,
        .fano_7 = OMI_TIMING_FANO_7,
    };
    omi_aztec_object_receipt_t aztec = {
        .global_360 = OMI_TIMING_GLOBAL_360,
        .object_id = "model.trailer.wike-ebike-cargo",
    };
    omi_maxicode_canvas_receipt_t maxicode = {
        .public_240 = OMI_TIMING_PUBLIC_240,
        .canvas_id = "canvas.public.cargo-yard",
    };
    omi_beecode_query_receipt_t beecode = {
        .selector_15bit = 42u,
    };

    omi_carrier_frame_t frame;
    omi_carrier_frame_t again;
    assert(omi_carrier_frame_build(&code16k, &aztec, &maxicode, &beecode, &frame) == 1);
    assert(omi_carrier_frame_build(&code16k, &aztec, &maxicode, &beecode, &again) == 1);
    assert(frame.receipt_hash != 0u);
    assert(frame.receipt_hash == again.receipt_hash);
    assert(frame.code16k.master_5040 == OMI_TIMING_MASTER_5040);
    assert(frame.aztec.global_360 == OMI_TIMING_GLOBAL_360);
    assert(frame.maxicode.public_240 == OMI_TIMING_PUBLIC_240);
    assert(frame.beecode.selector_15bit == 42u);

    code16k.operator_16 = 15u;
    assert(omi_carrier_frame_build(&code16k, &aztec, &maxicode, &beecode, &frame) == 0);

    printf("  OK combined carrier frame produces stable timed receipt\n\n");
}

static void test_declaration_payload_registers_through_loader(void)
{
    printf("Testing carrier declaration payload registration\n");

    omi_user_mount_table_t table;
    omi_model_overlay_t overlay;
    omi_model_load_result_t result;

    assert(omi_user_init_mount_registry(&table) == 1);
    omi_model_overlay_init(&overlay);

    assert(omi_carrier_register_declaration(&overlay, box_model, &result) == 1);
    assert(overlay.count == 1u);
    assert(overlay.append_count == 1u);
    assert(result.fs_count == 1u);
    assert(result.gs_count == 2u);
    assert(result.rs_count == 2u);
    assert(result.us_count == 4u);
    assert(strcmp(result.model_id, "model.box.carrier-cargo") == 0);

    const omi_user_model_handle_t *handle =
        omi_model_overlay_find_handle(&overlay, "model.box.carrier-cargo");
    assert(handle != 0);
    assert(handle->expanded == 0u);
    assert(table.expansion_count == 0u);

    const omi_user_model_handle_t *boot =
        omi_user_init_find_handle(&table, "model.trailer.wike-ebike-cargo");
    assert(boot != 0);
    assert(boot->fs_count == 1u);
    assert(boot->gs_count == 9u);
    assert(boot->expanded == 0u);

    printf("  OK carrier declaration payload uses Phase 37 overlay loader\n\n");
}

int main(void)
{
    printf("Testing Phase 38 - Timed Scannable Model Carriers\n");
    printf("=================================================\n\n");

    test_individual_carriers();
    test_combined_trailer_carrier_frame();
    test_declaration_payload_registers_through_loader();

    printf("=================================================\n");
    printf("ALL PHASE 38 CARRIER DECODE TESTS PASSED\n");
    return 0;
}
