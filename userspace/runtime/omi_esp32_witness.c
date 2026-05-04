#include "../include/omi_esp32_witness.h"

#include <stdio.h>
#include <string.h>

static int contains(const char *text, const char *needle)
{
    return text && strstr(text, needle) != 0;
}

static int extract_after(const char *text, const char *prefix, char *out, unsigned out_size)
{
    const char *p = strstr(text, prefix);
    unsigned i = 0;

    if (!p || out_size == 0u) {
        return 0;
    }
    p += strlen(prefix);
    while (*p && *p != ')' && *p != '(' && *p != '\n' && *p != '\r' &&
           *p != ' ' && *p != '\t') {
        if (i + 1u < out_size) {
            out[i++] = *p;
        }
        p++;
    }
    out[i] = '\0';
    return i != 0u;
}

static void copy_string(char *dst, unsigned dst_size, const char *src)
{
    if (!dst || dst_size == 0u) {
        return;
    }
    if (!src) {
        dst[0] = '\0';
        return;
    }
    strncpy(dst, src, dst_size - 1u);
    dst[dst_size - 1u] = '\0';
}

static omi_event_packet_timing_t default_timing(void)
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

static int fill_packet_for_scenario(omi_esp32_scenario_t scenario,
                                    const char *model_id,
                                    const char *detail,
                                    omi_event_packet_t *packet)
{
    if (!packet || !model_id || model_id[0] == '\0') {
        return 0;
    }

    *packet = (omi_event_packet_t){0};
    packet->timing = default_timing();
    copy_string(packet->device_id, sizeof(packet->device_id),
                "device.esp32-event-witness");
    copy_string(packet->model_id, sizeof(packet->model_id), model_id);

    switch (scenario) {
    case OMI_ESP32_GPIO_SCENARIO:
        packet->packet_kind = OMI_PACKET_IO_CHANGE;
        copy_string(packet->source, sizeof(packet->source), "esp32.gpio");
        copy_string(packet->target, sizeof(packet->target), model_id);
        copy_string(packet->relation, sizeof(packet->relation), "io-change");
        break;
    case OMI_ESP32_CAMERA_SCENARIO:
        packet->packet_kind = OMI_PACKET_CARRIER_SCAN;
        copy_string(packet->source, sizeof(packet->source), "esp32.camera");
        copy_string(packet->target, sizeof(packet->target), model_id);
        copy_string(packet->relation, sizeof(packet->relation), "carrier-scan");
        break;
    case OMI_ESP32_NETWORK_SCENARIO:
        packet->packet_kind = OMI_PACKET_MODEL_SYNC;
        copy_string(packet->source, sizeof(packet->source), "esp32.network");
        copy_string(packet->target, sizeof(packet->target), model_id);
        copy_string(packet->relation, sizeof(packet->relation), "model-sync");
        break;
    case OMI_ESP32_TIMER_SCENARIO:
        packet->packet_kind = OMI_PACKET_TIMING_OBSERVE;
        copy_string(packet->source, sizeof(packet->source), "esp32.timer");
        copy_string(packet->target, sizeof(packet->target), model_id);
        break;
    case OMI_ESP32_STORAGE_SCENARIO:
        packet->packet_kind = OMI_PACKET_RECEIPT_APPEND;
        copy_string(packet->source, sizeof(packet->source), "esp32.storage");
        copy_string(packet->target, sizeof(packet->target), model_id);
        copy_string(packet->relation, sizeof(packet->relation), "receipt-append");
        break;
    default:
        return 0;
    }

    if (detail && detail[0] != '\0') {
        unsigned len = (unsigned)strlen(detail);
        if (len > OMI_EVENT_PACKET_PAYLOAD_MAX) {
            len = OMI_EVENT_PACKET_PAYLOAD_MAX;
        }
        memcpy(packet->payload, detail, len);
        packet->payload_size = len;
    }

    return 1;
}

int omi_esp32_witness_parse(const char *text, omi_esp32_witness_profile_t *profile)
{
    if (!text || !profile) {
        return 0;
    }

    *profile = (omi_esp32_witness_profile_t){0};
    if (!extract_after(text, "(FS . ", profile->id, sizeof(profile->id)) ||
        strcmp(profile->id, "device.esp32-event-witness") != 0) {
        return 0;
    }

    profile->emits_gpio = contains(text, "event.io-change") ? 1u : 0u;
    profile->emits_camera = contains(text, "event.carrier-scan") ? 1u : 0u;
    profile->emits_network = contains(text, "event.model-sync") ? 1u : 0u;
    profile->emits_storage = contains(text, "event.receipt-append") ? 1u : 0u;
    profile->emits_timer = contains(text, "event.timing-receipt") ? 1u : 0u;
    profile->observer_only_timing = contains(text, "observer-only") ? 1u : 0u;
    profile->uses_phase46a_packets = contains(text, "phase46a.event-packet") ? 1u : 0u;

    return profile->emits_gpio &&
           profile->emits_camera &&
           profile->emits_network &&
           profile->emits_storage &&
           profile->emits_timer &&
           profile->observer_only_timing &&
           profile->uses_phase46a_packets;
}

int omi_esp32_witness_simulate(const omi_esp32_witness_profile_t *profile,
                               omi_esp32_scenario_t scenario,
                               const char *model_id,
                               const char *detail,
                               omi_esp32_packet_result_t *result)
{
    if (!profile || !result || !profile->uses_phase46a_packets ||
        !profile->observer_only_timing) {
        return 0;
    }

    *result = (omi_esp32_packet_result_t){0};
    if (!fill_packet_for_scenario(scenario, model_id, detail, &result->packet)) {
        return 0;
    }
    if (!omi_event_packet_encode(&result->packet,
                                 result->encoded,
                                 sizeof(result->encoded),
                                 &result->encoded_size)) {
        return 0;
    }
    if (!omi_event_packet_decode(result->encoded,
                                 result->encoded_size,
                                 &result->packet)) {
        return 0;
    }
    return omi_event_packet_to_event_model(&result->packet, &result->event);
}

int omi_esp32_witness_trace(const omi_esp32_witness_profile_t *profile,
                            char *out,
                            unsigned out_size)
{
    int n;
    if (!profile || !out || out_size == 0u) {
        return 0;
    }
    n = snprintf(out, out_size,
                 "ESP32_WITNESS id=%s packet-law=phase46a timing=observer-only",
                 profile->id);
    return n >= 0 && (unsigned)n < out_size;
}
