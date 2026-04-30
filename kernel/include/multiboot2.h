#ifndef OMI_MULTIBOOT2_H
#define OMI_MULTIBOOT2_H

#include <stdint.h>

#define OMI_MULTIBOOT2_BOOTLOADER_MAGIC 0x36d76289u
#define OMI_MULTIBOOT2_TAG_TYPE_END 0u
#define OMI_MULTIBOOT2_TAG_TYPE_MODULE 3u

typedef struct omi_multiboot_tag {
    uint32_t type;
    uint32_t size;
} omi_multiboot_tag_t;

typedef struct omi_multiboot_tag_module {
    uint32_t type;
    uint32_t size;
    uint32_t mod_start;
    uint32_t mod_end;
    char cmdline[];
} omi_multiboot_tag_module_t;

#endif
