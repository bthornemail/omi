.set MULTIBOOT2_MAGIC, 0xe85250d6
.set MULTIBOOT2_ARCH_I386, 0
.set MULTIBOOT2_HEADER_LEN, multiboot_header_end - multiboot_header
.set MULTIBOOT2_CHECKSUM, -(MULTIBOOT2_MAGIC + MULTIBOOT2_ARCH_I386 + MULTIBOOT2_HEADER_LEN)

.section .multiboot2
.align 8
multiboot_header:
    .long MULTIBOOT2_MAGIC
    .long MULTIBOOT2_ARCH_I386
    .long MULTIBOOT2_HEADER_LEN
    .long MULTIBOOT2_CHECKSUM

    .short 0
    .short 0
    .long 8
multiboot_header_end:

.section .bss
.align 16
stack_bottom:
    .skip 16384
stack_top:

.section .text
.global _start
.extern omi_kernel_entry

_start:
    mov $stack_top, %esp
    push %ebx
    push %eax
    call omi_kernel_entry
    add $8, %esp
1:
    cli
    hlt
    jmp 1b

.section .note.GNU-stack,"",@progbits
