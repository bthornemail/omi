#ifndef OMI_ESP32_WITNESS_H
#define OMI_ESP32_WITNESS_H

#include "omi_event_packet.h"

#define OMI_ESP32_ID_MAX 64u
#define OMI_ESP32_TRACE_MAX 256u

typedef enum {
    OMI_ESP32_GPIO_SCENARIO = 1,
    OMI_ESP32_CAMERA_SCENARIO = 2,
    OMI_ESP32_NETWORK_SCENARIO = 3,
    OMI_ESP32_TIMER_SCENARIO = 4,
    OMI_ESP32_STORAGE_SCENARIO = 5
} omi_esp32_scenario_t;

typedef struct {
    char id[OMI_ESP32_ID_MAX];
    unsigned emits_gpio;
    unsigned emits_camera;
    unsigned emits_network;
    unsigned emits_storage;
    unsigned emits_timer;
    unsigned observer_only_timing;
    unsigned uses_phase46a_packets;
} omi_esp32_witness_profile_t;

typedef struct {
    omi_event_packet_t packet;
    unsigned char encoded[OMI_EVENT_PACKET_ENCODED_SIZE];
    unsigned encoded_size;
    omi_event_model_t event;
} omi_esp32_packet_result_t;

int omi_esp32_witness_parse(const char *text, omi_esp32_witness_profile_t *profile);
int omi_esp32_witness_simulate(const omi_esp32_witness_profile_t *profile,
                               omi_esp32_scenario_t scenario,
                               const char *model_id,
                               const char *detail,
                               omi_esp32_packet_result_t *result);
int omi_esp32_witness_trace(const omi_esp32_witness_profile_t *profile,
                            char *out,
                            unsigned out_size);

#endif
