#ifndef OMI_EVENT_PACKET_H
#define OMI_EVENT_PACKET_H

#include "omi_carrier_decode.h"
#include "omi_event_model.h"

#define OMI_EVENT_PACKET_FIELD_MAX 96u
#define OMI_EVENT_PACKET_PAYLOAD_MAX 64u
#define OMI_EVENT_PACKET_TRACE_MAX 256u
#define OMI_EVENT_PACKET_ENCODED_SIZE \
    (4u + 5u * OMI_EVENT_PACKET_FIELD_MAX + 5u * 4u + 4u + \
     OMI_EVENT_PACKET_PAYLOAD_MAX + 4u)

typedef enum {
    OMI_PACKET_IO_CHANGE = 1,
    OMI_PACKET_POINTER_SELECT = 2,
    OMI_PACKET_CARRIER_SCAN = 3,
    OMI_PACKET_MODEL_SYNC = 4,
    OMI_PACKET_RECEIPT_APPEND = 5,
    OMI_PACKET_TIMING_OBSERVE = 6
} omi_event_packet_kind_t;

typedef struct {
    unsigned master_5040;
    unsigned public_240;
    unsigned private_60;
    unsigned kernel_8;
    unsigned fano_7;
} omi_event_packet_timing_t;

typedef struct {
    omi_event_packet_kind_t packet_kind;
    char device_id[OMI_EVENT_PACKET_FIELD_MAX];
    char model_id[OMI_EVENT_PACKET_FIELD_MAX];
    char source[OMI_EVENT_PACKET_FIELD_MAX];
    char target[OMI_EVENT_PACKET_FIELD_MAX];
    char relation[OMI_EVENT_PACKET_FIELD_MAX];
    omi_event_packet_timing_t timing;
    unsigned payload_size;
    unsigned char payload[OMI_EVENT_PACKET_PAYLOAD_MAX];
    unsigned receipt_hash;
} omi_event_packet_t;

int omi_event_packet_validate_timing(const omi_event_packet_timing_t *timing);
int omi_event_packet_validate(const omi_event_packet_t *packet);
int omi_event_packet_encode(const omi_event_packet_t *packet,
                            unsigned char *out,
                            unsigned out_size,
                            unsigned *encoded_size);
int omi_event_packet_decode(const unsigned char *bytes,
                            unsigned size,
                            omi_event_packet_t *packet);
int omi_event_packet_to_event_model(const omi_event_packet_t *packet,
                                    omi_event_model_t *event);
int omi_event_packet_trace(const omi_event_packet_t *packet,
                           char *out,
                           unsigned out_size);

#endif
