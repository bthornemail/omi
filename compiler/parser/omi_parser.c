#include <stddef.h>

int omi_parser_accepts_empty_program(const char *source)
{
    return source == NULL || source[0] == '\0';
}
