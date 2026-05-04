#include "../include/omi_event_packet.h"

#include <stdio.h>
#include <string.h>

static int string_present(const char *text)
{
    return text && text[0] != '\0';
}

static unsigned fnv1a_append_u8(unsigned hash, unsigned char value)
{
    hash ^= (unsigned)value;
    return hash * 16777619u;
}

static unsigned fnv1a_append_u32(unsigned hash, unsigned value)
{
    hash = fnv1a_append_u8(hash, (unsigned char)(value & 0xffu));
    hash = fnv1a_append_u8(hash, (unsigned char)((value >> 8) & 0xffu));
    hash = fnv1a_append_u8(hash, (unsigned char)((value >> 16) & 0xffu));
    hash = fnv1a_append_u8(hash, (unsigned char)((value >> 24) & 0xffu));
    return hash;
}

static unsigned fnv1a_append_bytes(unsigned hash, const unsigned char *bytes, unsigned size)
{
    unsigned i;
    for (i = 0; i < size; i++) {
        hash = fnv1a_append_u8(hash, bytes[i]);
    }
    return hash;
}

static unsigned fnv1a_append_string(unsigned hash, const char *text)
{
    if (!text) {
        return fnv1a_append_u8(hash, 0u);
    }
    while (*text) {
        hash = fnv1a_append_u8(hash, (unsigned char)*text++);
    }
    return fnv1a_append_u8(hash, 0u);
}

static unsigned omi_event_packet_hash(const omi_event_packet_t *packet)
{
    unsigned hash = 2166136261u;
    hash = fnv1a_append_u32(hash, (unsigned)packet->packet_kind);
    hash = fnv1a_append_string(hash, packet->device_id);
    hash = fnv1a_append_string(hash, packet->model_id);
    hash = fnv1a_append_string(hash, packet->source);
    hash = fnv1a_append_string(hash, packet->target);
    hash = fnv1a_append_string(hash, packet->relation);
    hash = fnv1a_append_u32(hash, packet->timing.master_5040);
    hash = fnv1a_append_u32(hash, packet->timing.public_240);
    hash = fnv1a_append_u32(hash, packet->timing.private_60);
    hash = fnv1a_append_u32(hash, packet->timing.kernel_8);
    hash = fnv1a_append_u32(hash, packet->timing.fano_7);
    hash = fnv1a_append_u32(hash, packet->payload_size);
    hash = fnv1a_append_bytes(hash, packet->payload, packet->payload_size);
    return hash;
}

static int valid_kind(omi_event_packet_kind_t kind)
{
    return kind >= OMI_PACKET_IO_CHANGE && kind <= OMI_PACKET_TIMING_OBSERVE;
}

static int relation_required(omi_event_packet_kind_t kind)
{
    return kind != OMI_PACKET_TIMING_OBSERVE;
}

static const char *packet_event_id(omi_event_packet_kind_t kind)
{
    switch (kind) {
    case OMI_PACKET_IO_CHANGE:
        return "event.io-change";
    case OMI_PACKET_POINTER_SELECT:
        return "event.pointer-select";
    case OMI_PACKET_CARRIER_SCAN:
        return "event.carrier-scan";
    case OMI_PACKET_MODEL_SYNC:
        return "event.model-sync";
    case OMI_PACKET_RECEIPT_APPEND:
        return "event.receipt-append";
    case OMI_PACKET_TIMING_OBSERVE:
        return "event.timing-receipt";
    default:
        return "";
    }
}

static const char *packet_class_name(omi_event_packet_kind_t kind)
{
    switch (kind) {
    case OMI_PACKET_IO_CHANGE:
        return "io-change";
    case OMI_PACKET_POINTER_SELECT:
        return "pointer-select";
    case OMI_PACKET_CARRIER_SCAN:
        return "carrier-scan";
    case OMI_PACKET_MODEL_SYNC:
        return "model-sync";
    case OMI_PACKET_RECEIPT_APPEND:
        return "receipt-append";
    case OMI_PACKET_TIMING_OBSERVE:
        return "timing-receipt";
    default:
        return "";
    }
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

static void write_u32_le(unsigned char *out, unsigned value)
{
    out[0] = (unsigned char)(value & 0xffu);
    out[1] = (unsigned char)((value >> 8) & 0xffu);
    out[2] = (unsigned char)((value >> 16) & 0xffu);
    out[3] = (unsigned char)((value >> 24) & 0xffu);
}

static unsigned read_u32_le(const unsigned char *in)
{
    return (unsigned)in[0] |
           ((unsigned)in[1] << 8) |
           ((unsigned)in[2] << 16) |
           ((unsigned)in[3] << 24);
}

int omi_event_packet_validate_timing(const omi_event_packet_timing_t *timing)
{
    if (!timing) {
        return 0;
    }
    return timing->master_5040 == OMI_TIMING_MASTER_5040 &&
           timing->public_240 == OMI_TIMING_PUBLIC_240 &&
           timing->private_60 == OMI_TIMING_PRIVATE_60 &&
           timing->kernel_8 == OMI_TIMING_KERNEL_8 &&
           timing->fano_7 == OMI_TIMING_FANO_7;
}

int omi_event_packet_validate(const omi_event_packet_t *packet)
{
    if (!packet || !valid_kind(packet->packet_kind) ||
        !omi_event_packet_validate_timing(&packet->timing) ||
        !string_present(packet->device_id) ||
        !string_present(packet->model_id) ||
        !string_present(packet->source) ||
        !string_present(packet->target) ||
        packet->payload_size > OMI_EVENT_PACKET_PAYLOAD_MAX) {
        return 0;
    }

    if (relation_required(packet->packet_kind) && !string_present(packet->relation)) {
        return 0;
    }

    if (packet->packet_kind == OMI_PACKET_TIMING_OBSERVE &&
        !string_present(packet->relation)) {
        return 1;
    }

    return 1;
}

int omi_event_packet_encode(const omi_event_packet_t *packet,
                            unsigned char *out,
                            unsigned out_size,
                            unsigned *encoded_size)
{
    const unsigned needed = 4u + 5u * OMI_EVENT_PACKET_FIELD_MAX + 5u * 4u +
                            4u + OMI_EVENT_PACKET_PAYLOAD_MAX + 4u;
    omi_event_packet_t normalized;

    if (encoded_size) {
        *encoded_size = 0u;
    }
    if (!packet || !out || out_size < needed) {
        return 0;
    }

    normalized = *packet;
    if (!omi_event_packet_validate(&normalized)) {
        return 0;
    }
    normalized.receipt_hash = omi_event_packet_hash(&normalized);

    memset(out, 0, needed);
    write_u32_le(out, (unsigned)normalized.packet_kind);
    memcpy(out + 4u, normalized.device_id, OMI_EVENT_PACKET_FIELD_MAX);
    memcpy(out + 4u + OMI_EVENT_PACKET_FIELD_MAX, normalized.model_id, OMI_EVENT_PACKET_FIELD_MAX);
    memcpy(out + 4u + 2u * OMI_EVENT_PACKET_FIELD_MAX, normalized.source, OMI_EVENT_PACKET_FIELD_MAX);
    memcpy(out + 4u + 3u * OMI_EVENT_PACKET_FIELD_MAX, normalized.target, OMI_EVENT_PACKET_FIELD_MAX);
    memcpy(out + 4u + 4u * OMI_EVENT_PACKET_FIELD_MAX, normalized.relation, OMI_EVENT_PACKET_FIELD_MAX);

    {
        unsigned timing_offset = 4u + 5u * OMI_EVENT_PACKET_FIELD_MAX;
        write_u32_le(out + timing_offset, normalized.timing.master_5040);
        write_u32_le(out + timing_offset + 4u, normalized.timing.public_240);
        write_u32_le(out + timing_offset + 8u, normalized.timing.private_60);
        write_u32_le(out + timing_offset + 12u, normalized.timing.kernel_8);
        write_u32_le(out + timing_offset + 16u, normalized.timing.fano_7);
        write_u32_le(out + timing_offset + 20u, normalized.payload_size);
        memcpy(out + timing_offset + 24u, normalized.payload, normalized.payload_size);
        write_u32_le(out + timing_offset + 24u + OMI_EVENT_PACKET_PAYLOAD_MAX,
                     normalized.receipt_hash);
    }

    if (encoded_size) {
        *encoded_size = needed;
    }
    return 1;
}

int omi_event_packet_decode(const unsigned char *bytes,
                            unsigned size,
                            omi_event_packet_t *packet)
{
    const unsigned needed = 4u + 5u * OMI_EVENT_PACKET_FIELD_MAX + 5u * 4u +
                            4u + OMI_EVENT_PACKET_PAYLOAD_MAX + 4u;
    unsigned timing_offset = 4u + 5u * OMI_EVENT_PACKET_FIELD_MAX;
    unsigned expected_hash;

    if (!bytes || !packet || size != needed) {
        return 0;
    }

    *packet = (omi_event_packet_t){0};
    packet->packet_kind = (omi_event_packet_kind_t)read_u32_le(bytes);
    memcpy(packet->device_id, bytes + 4u, OMI_EVENT_PACKET_FIELD_MAX);
    memcpy(packet->model_id, bytes + 4u + OMI_EVENT_PACKET_FIELD_MAX, OMI_EVENT_PACKET_FIELD_MAX);
    memcpy(packet->source, bytes + 4u + 2u * OMI_EVENT_PACKET_FIELD_MAX, OMI_EVENT_PACKET_FIELD_MAX);
    memcpy(packet->target, bytes + 4u + 3u * OMI_EVENT_PACKET_FIELD_MAX, OMI_EVENT_PACKET_FIELD_MAX);
    memcpy(packet->relation, bytes + 4u + 4u * OMI_EVENT_PACKET_FIELD_MAX, OMI_EVENT_PACKET_FIELD_MAX);
    packet->device_id[OMI_EVENT_PACKET_FIELD_MAX - 1u] = '\0';
    packet->model_id[OMI_EVENT_PACKET_FIELD_MAX - 1u] = '\0';
    packet->source[OMI_EVENT_PACKET_FIELD_MAX - 1u] = '\0';
    packet->target[OMI_EVENT_PACKET_FIELD_MAX - 1u] = '\0';
    packet->relation[OMI_EVENT_PACKET_FIELD_MAX - 1u] = '\0';

    packet->timing.master_5040 = read_u32_le(bytes + timing_offset);
    packet->timing.public_240 = read_u32_le(bytes + timing_offset + 4u);
    packet->timing.private_60 = read_u32_le(bytes + timing_offset + 8u);
    packet->timing.kernel_8 = read_u32_le(bytes + timing_offset + 12u);
    packet->timing.fano_7 = read_u32_le(bytes + timing_offset + 16u);
    packet->payload_size = read_u32_le(bytes + timing_offset + 20u);
    if (packet->payload_size > OMI_EVENT_PACKET_PAYLOAD_MAX) {
        return 0;
    }
    memcpy(packet->payload, bytes + timing_offset + 24u, packet->payload_size);
    packet->receipt_hash =
        read_u32_le(bytes + timing_offset + 24u + OMI_EVENT_PACKET_PAYLOAD_MAX);

    if (!omi_event_packet_validate(packet)) {
        return 0;
    }

    expected_hash = omi_event_packet_hash(packet);
    return expected_hash == packet->receipt_hash;
}

int omi_event_packet_to_event_model(const omi_event_packet_t *packet,
                                    omi_event_model_t *event)
{
    if (!packet || !event || !omi_event_packet_validate(packet)) {
        return 0;
    }

    *event = (omi_event_model_t){0};
    copy_string(event->id, sizeof(event->id), packet_event_id(packet->packet_kind));
    copy_string(event->class_name, sizeof(event->class_name),
                packet_class_name(packet->packet_kind));
    event->has_source = 1u;
    event->has_target = 1u;
    event->has_relation = string_present(packet->relation) ? 1u : 0u;
    event->has_timing = 1u;
    event->master = packet->timing.master_5040;
    event->public_frame = packet->timing.public_240;
    event->private_sweep = packet->timing.private_60;
    return 1;
}

int omi_event_packet_trace(const omi_event_packet_t *packet,
                           char *out,
                           unsigned out_size)
{
    int n;
    if (!packet || !out || out_size == 0u || !omi_event_packet_validate(packet)) {
        return 0;
    }
    n = snprintf(out, out_size,
                 "EVENT_PACKET kind=%u device=%s model=%s relation=%s timing=5040/240/60/8/7 payload=%u",
                 (unsigned)packet->packet_kind,
                 packet->device_id,
                 packet->model_id,
                 packet->relation[0] ? packet->relation : "timing-observe",
                 packet->payload_size);
    return n >= 0 && (unsigned)n < out_size;
}
