#ifndef OMI_SERIAL_H
#define OMI_SERIAL_H

#include <stddef.h>
#include <stdint.h>

void omi_serial_init(void);
void omi_serial_write_char(char c);
void omi_serial_write_string(const char *text);
void omi_serial_write_u32(uint32_t value);
void omi_serial_write_size(size_t value);
void omi_serial_write_hex32(uint32_t value);

#endif
