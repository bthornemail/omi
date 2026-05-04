#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "omi_esp32_witness.h"

void omi_serial_init(void) {}
void omi_serial_write_char(char c) { (void)c; }
void omi_serial_write_string(const char *text) { (void)text; }
void omi_serial_write_u32(uint32_t value) { (void)value; }
void omi_serial_write_size(size_t value) { (void)value; }
void omi_serial_write_hex8(uint8_t value) { (void)value; }
void omi_serial_write_hex32(uint32_t value) { (void)value; }

static int read_file(const char *path, char *buf, unsigned size)
{
    FILE *f = fopen(path, "rb");
    size_t n;
    if (!f) {
        return 0;
    }
    n = fread(buf, 1u, size - 1u, f);
    fclose(f);
    buf[n] = '\0';
    return n > 0u;
}

static void test_profile_parse(void)
{
    char text[4096];
    char trace[OMI_ESP32_TRACE_MAX];
    omi_esp32_witness_profile_t profile;

    printf("Testing ESP32 witness profile declaration\n");

    assert(read_file("devices/esp32-event-witness.omilisp", text, sizeof(text)) == 1);
    assert(omi_esp32_witness_parse(text, &profile) == 1);
    assert(strcmp(profile.id, "device.esp32-event-witness") == 0);
    assert(profile.emits_gpio == 1u);
    assert(profile.emits_camera == 1u);
    assert(profile.emits_network == 1u);
    assert(profile.emits_storage == 1u);
    assert(profile.emits_timer == 1u);
    assert(profile.observer_only_timing == 1u);
    assert(profile.uses_phase46a_packets == 1u);
    assert(omi_esp32_witness_trace(&profile, trace, sizeof(trace)) == 1);
    assert(strstr(trace, "observer-only") != 0);

    printf("  OK ESP32 witness profile parses deterministically\n\n");
}

static void test_packet_scenarios(void)
{
    char text[4096];
    omi_esp32_witness_profile_t profile;
    omi_esp32_packet_result_t gpio;
    omi_esp32_packet_result_t camera;
    omi_esp32_packet_result_t network;
    omi_esp32_packet_result_t timer;
    omi_esp32_packet_result_t storage;
    omi_esp32_packet_result_t again;

    printf("Testing ESP32 packet scenarios\n");

    assert(read_file("devices/esp32-event-witness.omilisp", text, sizeof(text)) == 1);
    assert(omi_esp32_witness_parse(text, &profile) == 1);

    assert(omi_esp32_witness_simulate(&profile,
                                      OMI_ESP32_GPIO_SCENARIO,
                                      "model.trailer.wike-ebike-cargo",
                                      "gpio=21:1",
                                      &gpio) == 1);
    assert(gpio.packet.packet_kind == OMI_PACKET_IO_CHANGE);
    assert(strcmp(gpio.event.id, "event.io-change") == 0);

    assert(omi_esp32_witness_simulate(&profile,
                                      OMI_ESP32_CAMERA_SCENARIO,
                                      "model.trailer.wike-ebike-cargo",
                                      "carrier=aztec",
                                      &camera) == 1);
    assert(camera.packet.packet_kind == OMI_PACKET_CARRIER_SCAN);
    assert(strcmp(camera.event.id, "event.carrier-scan") == 0);

    assert(omi_esp32_witness_simulate(&profile,
                                      OMI_ESP32_NETWORK_SCENARIO,
                                      "world.cargo-yard-demo",
                                      "peer=node-b",
                                      &network) == 1);
    assert(network.packet.packet_kind == OMI_PACKET_MODEL_SYNC);
    assert(strcmp(network.event.id, "event.model-sync") == 0);

    assert(omi_esp32_witness_simulate(&profile,
                                      OMI_ESP32_TIMER_SCENARIO,
                                      "model.trailer.wike-ebike-cargo",
                                      "tick=84",
                                      &timer) == 1);
    assert(timer.packet.packet_kind == OMI_PACKET_TIMING_OBSERVE);
    assert(strcmp(timer.event.id, "event.timing-receipt") == 0);

    assert(omi_esp32_witness_simulate(&profile,
                                      OMI_ESP32_STORAGE_SCENARIO,
                                      "model.trailer.wike-ebike-cargo",
                                      "receipt=append",
                                      &storage) == 1);
    assert(storage.packet.packet_kind == OMI_PACKET_RECEIPT_APPEND);
    assert(strcmp(storage.event.id, "event.receipt-append") == 0);

    assert(omi_esp32_witness_simulate(&profile,
                                      OMI_ESP32_NETWORK_SCENARIO,
                                      "world.cargo-yard-demo",
                                      "peer=node-b",
                                      &again) == 1);
    assert(network.encoded_size == again.encoded_size);
    assert(memcmp(network.encoded, again.encoded, network.encoded_size) == 0);
    assert(network.packet.receipt_hash == again.packet.receipt_hash);

    printf("  OK all five ESP32 packet scenarios are deterministic\n\n");
}

static void test_invalid_timing_rejected(void)
{
    omi_event_packet_t packet = {0};
    unsigned char encoded[OMI_EVENT_PACKET_ENCODED_SIZE];
    unsigned encoded_size = 0u;

    printf("Testing invalid ESP32 timing rejection\n");

    packet.packet_kind = OMI_PACKET_MODEL_SYNC;
    strcpy(packet.device_id, "device.esp32-event-witness");
    strcpy(packet.model_id, "world.cargo-yard-demo");
    strcpy(packet.source, "esp32.network");
    strcpy(packet.target, "world.cargo-yard-demo");
    strcpy(packet.relation, "model-sync");
    packet.timing.master_5040 = OMI_TIMING_MASTER_5040;
    packet.timing.public_240 = OMI_TIMING_PUBLIC_240;
    packet.timing.private_60 = OMI_TIMING_PRIVATE_60;
    packet.timing.kernel_8 = 9u;
    packet.timing.fano_7 = OMI_TIMING_FANO_7;
    memcpy(packet.payload, "bad", 3u);
    packet.payload_size = 3u;

    assert(omi_event_packet_encode(&packet, encoded, sizeof(encoded), &encoded_size) == 0);

    printf("  OK invalid timing receipts fail\n\n");
}

int main(void)
{
    printf("Testing Phase 46B - ESP32 Event Witness Profile\n");
    printf("===============================================\n\n");

    test_profile_parse();
    test_packet_scenarios();
    test_invalid_timing_rejected();

    printf("===============================================\n");
    printf("ALL PHASE 46B ESP32 WITNESS TESTS PASSED\n");
    return 0;
}
