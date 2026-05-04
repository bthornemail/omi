#ifndef OMI_KERNEL_EVENT_PACKET_H
#define OMI_KERNEL_EVENT_PACKET_H

#define OMI_KERNEL_TIMING_MASTER_5040 5040u
#define OMI_KERNEL_TIMING_PUBLIC_240 240u
#define OMI_KERNEL_TIMING_PRIVATE_60 60u
#define OMI_KERNEL_TIMING_KERNEL_8 8u
#define OMI_KERNEL_TIMING_FANO_7 7u

#define OMI_KERNEL_EVENT_PACKET_FIELD_MAX 96u
#define OMI_KERNEL_EVENT_PACKET_PAYLOAD_MAX 64u

typedef enum {
    OMI_KERNEL_PACKET_IO_CHANGE = 1,
    OMI_KERNEL_PACKET_POINTER_SELECT = 2,
    OMI_KERNEL_PACKET_CARRIER_SCAN = 3,
    OMI_KERNEL_PACKET_MODEL_SYNC = 4,
    OMI_KERNEL_PACKET_RECEIPT_APPEND = 5,
    OMI_KERNEL_PACKET_TIMING_OBSERVE = 6
} omi_kernel_event_packet_kind_t;

typedef struct {
    unsigned master_5040;
    unsigned public_240;
    unsigned private_60;
    unsigned kernel_8;
    unsigned fano_7;
} omi_kernel_event_packet_timing_t;

typedef struct {
    omi_kernel_event_packet_kind_t packet_kind;
    char device_id[OMI_KERNEL_EVENT_PACKET_FIELD_MAX];
    char model_id[OMI_KERNEL_EVENT_PACKET_FIELD_MAX];
    char source[OMI_KERNEL_EVENT_PACKET_FIELD_MAX];
    char target[OMI_KERNEL_EVENT_PACKET_FIELD_MAX];
    char relation[OMI_KERNEL_EVENT_PACKET_FIELD_MAX];
    omi_kernel_event_packet_timing_t timing;
    unsigned payload_size;
    unsigned char payload[OMI_KERNEL_EVENT_PACKET_PAYLOAD_MAX];
    unsigned receipt_hash;
} omi_kernel_event_packet_t;

int omi_kernel_event_packet_validate_timing(const omi_kernel_event_packet_timing_t *timing);
int omi_kernel_event_packet_validate(const omi_kernel_event_packet_t *packet);
unsigned omi_kernel_event_packet_receipt_hash(const omi_kernel_event_packet_t *packet);

#endif
