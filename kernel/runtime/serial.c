#include "../include/serial.h"

#define OMI_SERIAL_COM1 0x3f8u

static void outb(uint16_t port, uint8_t value)
{
    __asm__ volatile("outb %0, %1" : : "a"(value), "Nd"(port));
}

static uint8_t inb(uint16_t port)
{
    uint8_t value;
    __asm__ volatile("inb %1, %0" : "=a"(value) : "Nd"(port));
    return value;
}

void omi_serial_init(void)
{
    outb(OMI_SERIAL_COM1 + 1u, 0x00);
    outb(OMI_SERIAL_COM1 + 3u, 0x80);
    outb(OMI_SERIAL_COM1 + 0u, 0x03);
    outb(OMI_SERIAL_COM1 + 1u, 0x00);
    outb(OMI_SERIAL_COM1 + 3u, 0x03);
    outb(OMI_SERIAL_COM1 + 2u, 0xc7);
    outb(OMI_SERIAL_COM1 + 4u, 0x0b);
}

void omi_serial_write_char(char c)
{
    while ((inb(OMI_SERIAL_COM1 + 5u) & 0x20u) == 0) {
    }

    outb(OMI_SERIAL_COM1, (uint8_t)c);
}

void omi_serial_write_string(const char *text)
{
    for (const char *p = text; p && *p; p++) {
        if (*p == '\n') {
            omi_serial_write_char('\r');
        }
        omi_serial_write_char(*p);
    }
}

void omi_serial_write_u32(uint32_t value)
{
    char buffer[10];
    size_t len = 0;

    if (value == 0) {
        omi_serial_write_char('0');
        return;
    }

    while (value > 0 && len < sizeof(buffer)) {
        buffer[len++] = (char)('0' + (value % 10u));
        value /= 10u;
    }

    while (len > 0) {
        omi_serial_write_char(buffer[--len]);
    }
}

void omi_serial_write_size(size_t value)
{
    omi_serial_write_u32((uint32_t)value);
}

void omi_serial_write_hex8(uint8_t value)
{
    static const char hex[] = "0123456789abcdef";

    omi_serial_write_string("0x");
    omi_serial_write_char(hex[(value >> 4u) & 0x0fu]);
    omi_serial_write_char(hex[value & 0x0fu]);
}

void omi_serial_write_hex32(uint32_t value)
{
    static const char hex[] = "0123456789abcdef";

    omi_serial_write_string("0x");
    for (int shift = 28; shift >= 0; shift -= 4) {
        omi_serial_write_char(hex[(value >> (uint32_t)shift) & 0x0fu]);
    }
}
