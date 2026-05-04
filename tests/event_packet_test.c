#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "omi_event_packet.h"

void omi_serial_init(void) {}
void omi_serial_write_char(char c) { (void)c; }
void omi_serial_write_string(const char *text) { (void)text; }
void omi_serial_write_u32(uint32_t value) { (void)value; }
void omi_serial_write_size(size_t value) { (void)value; }
void omi_serial_write_hex8(uint8_t value) { (void)value; }
void omi_serial_write_hex32(uint32_t value) { (void)value; }

static omi_event_packet_timing_t valid_timing(void)
{
    omi_event_packet_timing_t timing = {
        .master_5040 = OMI_TIMING_MASTER_5040,
        .public_240 = OMI_TIMING_PUBLIC_240,
        .private_60 = OMI_TIMING_PRIVATE_60,
        .kernel_8 = OMI_TIMING_KERNEL_8,
        .fano_7 = OMI_TIMING_FANO_7,
    };
    return timing;
}

static omi_event_packet_t base_packet(omi_event_packet_kind_t kind)
{
    omi_event_packet_t packet;
    const char payload[] = "pkt";

    packet = (omi_event_packet_t){0};
    packet.packet_kind = kind;
    strcpy(packet.device_id, "device.camera");
    strcpy(packet.model_id, "model.trailer.wike-ebike-cargo");
    strcpy(packet.source, "device.camera.sensor");
    strcpy(packet.target, "model.trailer.wike-ebike-cargo");
    strcpy(packet.relation, "carrier-scan");
    packet.timing = valid_timing();
    packet.payload_size = (unsigned)(sizeof(payload) - 1u);
    memcpy(packet.payload, payload, packet.payload_size);
    return packet;
}

static void test_valid_packets_roundtrip(void)
{
    printf("Testing deterministic event packet encode/decode\n");

    unsigned char bytes[1024];
    unsigned encoded_size = 0u;
    char trace[OMI_EVENT_PACKET_TRACE_MAX];
    omi_event_packet_t io_packet = base_packet(OMI_PACKET_IO_CHANGE);
    omi_event_packet_t scan_packet = base_packet(OMI_PACKET_CARRIER_SCAN);
    omi_event_packet_t sync_packet = base_packet(OMI_PACKET_MODEL_SYNC);
    omi_event_packet_t decoded;
    omi_event_packet_t decoded_again;

    strcpy(io_packet.relation, "io-change");
    strcpy(sync_packet.relation, "model-sync");

    assert(omi_event_packet_encode(&io_packet, bytes, sizeof(bytes), &encoded_size) == 1);
    assert(omi_event_packet_decode(bytes, encoded_size, &decoded) == 1);
    assert(decoded.receipt_hash != 0u);
    assert(decoded.packet_kind == OMI_PACKET_IO_CHANGE);
    assert(strcmp(decoded.relation, "io-change") == 0);

    assert(omi_event_packet_encode(&scan_packet, bytes, sizeof(bytes), &encoded_size) == 1);
    assert(omi_event_packet_decode(bytes, encoded_size, &decoded) == 1);
    assert(decoded.packet_kind == OMI_PACKET_CARRIER_SCAN);
    assert(strcmp(decoded.device_id, "device.camera") == 0);

    assert(omi_event_packet_encode(&sync_packet, bytes, sizeof(bytes), &encoded_size) == 1);
    assert(omi_event_packet_decode(bytes, encoded_size, &decoded) == 1);
    assert(omi_event_packet_encode(&sync_packet, bytes, sizeof(bytes), &encoded_size) == 1);
    assert(omi_event_packet_decode(bytes, encoded_size, &decoded_again) == 1);
    assert(decoded.receipt_hash == decoded_again.receipt_hash);
    assert(strcmp(decoded.model_id, decoded_again.model_id) == 0);

    assert(omi_event_packet_trace(&decoded, trace, sizeof(trace)) == 1);
    assert(strstr(trace, "timing=5040/240/60/8/7") != 0);

    printf("  OK IO_CHANGE, CARRIER_SCAN, and MODEL_SYNC packets roundtrip deterministically\n\n");
}

static void test_invalid_packets_rejected(void)
{
    printf("Testing invalid packet rejection\n");

    unsigned char bytes[1024];
    unsigned encoded_size = 0u;
    omi_event_packet_t invalid_timing = base_packet(OMI_PACKET_IO_CHANGE);
    omi_event_packet_t invalid_kind = base_packet(OMI_PACKET_IO_CHANGE);
    omi_event_packet_t timing_observe = base_packet(OMI_PACKET_TIMING_OBSERVE);
    omi_event_packet_t decoded;

    invalid_timing.timing.kernel_8 = 9u;
    assert(omi_event_packet_validate(&invalid_timing) == 0);
    assert(omi_event_packet_encode(&invalid_timing, bytes, sizeof(bytes), &encoded_size) == 0);

    invalid_kind.packet_kind = (omi_event_packet_kind_t)99u;
    assert(omi_event_packet_validate(&invalid_kind) == 0);

    timing_observe.relation[0] = '\0';
    assert(omi_event_packet_validate(&timing_observe) == 1);
    assert(omi_event_packet_encode(&timing_observe, bytes, sizeof(bytes), &encoded_size) == 1);
    bytes[encoded_size - 1u] ^= 0xffu;
    assert(omi_event_packet_decode(bytes, encoded_size, &decoded) == 0);

    printf("  OK invalid timing receipts and packet kinds are rejected deterministically\n\n");
}

static void test_packet_projects_to_event_model(void)
{
    printf("Testing packet projection into event declarations\n");

    unsigned char bytes[1024];
    unsigned encoded_size = 0u;
    omi_event_packet_t packet = base_packet(OMI_PACKET_CARRIER_SCAN);
    omi_event_packet_t decoded;
    omi_event_model_t event;

    assert(omi_event_packet_encode(&packet, bytes, sizeof(bytes), &encoded_size) == 1);
    assert(omi_event_packet_decode(bytes, encoded_size, &decoded) == 1);
    assert(omi_event_packet_to_event_model(&decoded, &event) == 1);
    assert(strcmp(event.id, "event.carrier-scan") == 0);
    assert(strcmp(event.class_name, "carrier-scan") == 0);
    assert(event.has_source == 1u);
    assert(event.has_target == 1u);
    assert(event.has_relation == 1u);
    assert(event.has_timing == 1u);
    assert(event.master == OMI_TIMING_MASTER_5040);
    assert(event.public_frame == OMI_TIMING_PUBLIC_240);
    assert(event.private_sweep == OMI_TIMING_PRIVATE_60);

    printf("  OK packets project into Phase 40A event model declarations\n\n");
}

int main(void)
{
    printf("Testing Phase 46A - Hardware Event Packet Law\n");
    printf("=============================================\n\n");

    test_valid_packets_roundtrip();
    test_invalid_packets_rejected();
    test_packet_projects_to_event_model();

    printf("=============================================\n");
    printf("ALL PHASE 46A EVENT PACKET TESTS PASSED\n");
    return 0;
}
