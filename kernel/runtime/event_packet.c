#include "../include/event_packet.h"

static int string_present(const char *text)
{
    return text && text[0] != '\0';
}

static int valid_kind(omi_kernel_event_packet_kind_t kind)
{
    return kind >= OMI_KERNEL_PACKET_IO_CHANGE &&
           kind <= OMI_KERNEL_PACKET_TIMING_OBSERVE;
}

static int relation_required(omi_kernel_event_packet_kind_t kind)
{
    return kind != OMI_KERNEL_PACKET_TIMING_OBSERVE;
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

unsigned omi_kernel_event_packet_receipt_hash(const omi_kernel_event_packet_t *packet)
{
    unsigned hash = 2166136261u;
    unsigned i;

    if (!packet) {
        return 0u;
    }

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
    for (i = 0; i < packet->payload_size; i++) {
        hash = fnv1a_append_u8(hash, packet->payload[i]);
    }
    return hash;
}

int omi_kernel_event_packet_validate_timing(const omi_kernel_event_packet_timing_t *timing)
{
    if (!timing) {
        return 0;
    }
    return timing->master_5040 == OMI_KERNEL_TIMING_MASTER_5040 &&
           timing->public_240 == OMI_KERNEL_TIMING_PUBLIC_240 &&
           timing->private_60 == OMI_KERNEL_TIMING_PRIVATE_60 &&
           timing->kernel_8 == OMI_KERNEL_TIMING_KERNEL_8 &&
           timing->fano_7 == OMI_KERNEL_TIMING_FANO_7;
}

int omi_kernel_event_packet_validate(const omi_kernel_event_packet_t *packet)
{
    if (!packet || !valid_kind(packet->packet_kind) ||
        !omi_kernel_event_packet_validate_timing(&packet->timing) ||
        !string_present(packet->device_id) ||
        !string_present(packet->model_id) ||
        !string_present(packet->source) ||
        !string_present(packet->target) ||
        packet->payload_size > OMI_KERNEL_EVENT_PACKET_PAYLOAD_MAX) {
        return 0;
    }

    if (relation_required(packet->packet_kind) && !string_present(packet->relation)) {
        return 0;
    }

    return packet->receipt_hash == 0u ||
           packet->receipt_hash == omi_kernel_event_packet_receipt_hash(packet);
}
