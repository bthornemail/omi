.section .text._start
.globl _start
.type _start, @function

_start:
    csrr t0, mhartid
    bnez t0, 1f

    csrw mie, zero
    csrw mstatus, zero

    la sp, _stack_top
    call riscv_main

1:
    wfi
    j 1b

.size _start, . - _start

.section .bss
.align 16
_stack_bottom:
    .space 4096
.globl _stack_top
_stack_top:
