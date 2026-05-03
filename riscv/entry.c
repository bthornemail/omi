#include <stdint.h>
#include "bitwise_kernel.h"
#include "osi_projection.h"
#include "../polyform/include/polyform_block.h"

#define RISCV_UART_BASE ((volatile uint8_t *)0x10000000u)
#define RISCV_UART_THR 0u
#define RISCV_UART_LSR 5u
#define RISCV_UART_LSR_THRE 0x20u
#define RISCV_TEST_FINISHER ((volatile uint32_t *)0x00100000u)

static void riscv_uart_putchar(char c)
{
    while ((RISCV_UART_BASE[RISCV_UART_LSR] & RISCV_UART_LSR_THRE) == 0u) {
    }
    RISCV_UART_BASE[RISCV_UART_THR] = (uint8_t)c;
}

static void riscv_uart_puts(const char *text)
{
    for (const char *p = text; p && *p; p++) {
        if (*p == '\n') {
            riscv_uart_putchar('\r');
        }
        riscv_uart_putchar(*p);
    }
}

static void riscv_uart_put_u32(uint32_t value)
{
    char buffer[10];
    uint32_t len = 0;

    if (value == 0u) {
        riscv_uart_putchar('0');
        return;
    }

    while (value > 0u && len < sizeof(buffer)) {
        buffer[len++] = (char)('0' + (value % 10u));
        value /= 10u;
    }

    while (len > 0u) {
        riscv_uart_putchar(buffer[--len]);
    }
}

static void riscv_uart_put_hex8(uint8_t value)
{
    static const char hex[] = "0123456789abcdef";

    riscv_uart_puts("0x");
    riscv_uart_putchar(hex[(value >> 4u) & 0x0fu]);
    riscv_uart_putchar(hex[value & 0x0fu]);
}

static void riscv_uart_put_hex32(uint32_t value)
{
    static const char hex[] = "0123456789abcdef";

    riscv_uart_puts("0x");
    for (int shift = 28; shift >= 0; shift -= 4) {
        riscv_uart_putchar(hex[(value >> (uint32_t)shift) & 0x0fu]);
    }
}

static void riscv_print_phase28(uint32_t tick, const kernel_state_t *state)
{
    riscv_uart_puts("PHASE28_QEMU tick=");
    riscv_uart_put_u32(tick);
    riscv_uart_puts(" K=");
    riscv_uart_put_hex8(state->K);
    riscv_uart_puts(" fano=");
    riscv_uart_put_hex8(state->fano);
    riscv_uart_puts(" sonar_hi=");
    riscv_uart_put_hex32(state->sonar.hi);
    riscv_uart_puts(" sonar_lo=");
    riscv_uart_put_hex32(state->sonar.lo);
    riscv_uart_puts("\n");
}

static void riscv_print_phase30(uint32_t layer, const omi_osi_projection_t *projection)
{
    riscv_uart_puts("PHASE30_QEMU layer=");
    riscv_uart_put_u32(layer);
    riscv_uart_puts(" digit=");
    riscv_uart_put_hex8(projection->visible_digit);
    riscv_uart_puts(" address=");
    riscv_uart_put_hex32(projection->address);
    riscv_uart_puts(" simplex=");
    riscv_uart_put_u32(projection->simplex_class);
    riscv_uart_puts("\n");
}

static void riscv_print_polyform_block(const polyform_block_t *block)
{
    const polyform_block_fields_t *fields = &block->fields;

    riscv_uart_puts("POLYFORM_BLOCK tick=");
    riscv_uart_put_u32((uint32_t)fields->tick);
    riscv_uart_puts(" K=");
    riscv_uart_put_hex8(fields->K);
    riscv_uart_puts(" fano=");
    riscv_uart_put_hex8(fields->fano);
    riscv_uart_puts(" sonar_hi=");
    riscv_uart_put_hex32(fields->sonar.hi);
    riscv_uart_puts(" sonar_lo=");
    riscv_uart_put_hex32(fields->sonar.lo);
    riscv_uart_puts(" digit=");
    riscv_uart_put_hex8(fields->digit);
    riscv_uart_puts(" witness=");
    riscv_uart_put_hex32(block->witness);
    riscv_uart_puts("\n");
}

static void riscv_foundation_qemu_proof(void)
{
    kernel_state_t state = {
        .K = 0x00u,
        .fano = 0x01u,
        .sonar = { .lo = 0x00000001u, .hi = 0x00000000u },
        .GS = OMI_BITWISE_KERNEL_GS
    };

    riscv_uart_puts("FOUNDATION_QEMU_BEGIN\n");
    for (uint32_t tick = 0; tick <= 5u; tick++) {
        riscv_print_phase28(tick, &state);
        if (tick < 5u) {
            kernel_tick(&state);
        }
    }

    for (uint32_t tick = 5u; tick < 11u; tick++) {
        kernel_tick(&state);
    }

    omi_osi_projection_t osi_stack[OMI_POLYFORM_OSI_LAYER_COUNT] = {{0}};
    for (uint32_t layer = OMI_OSI_PHYSICAL; layer <= OMI_OSI_APPLICATION; layer++) {
        osi_stack[layer - 1u] = omi_project_osi_layer(&state, 11u, (omi_osi_layer_t)layer);
        riscv_print_phase30(layer, &osi_stack[layer - 1u]);
    }

    polyform_block_t block = polyform_block_from_state(&state, 11u, osi_stack);
    riscv_print_polyform_block(&block);
    riscv_uart_puts("FOUNDATION_QEMU_END\n");
}

void riscv_main(void)
{
    riscv_uart_puts("OMI RISC-V BOOT\n");
    riscv_foundation_qemu_proof();
    *RISCV_TEST_FINISHER = 0x5555u;

    for (;;) {
    }
}
