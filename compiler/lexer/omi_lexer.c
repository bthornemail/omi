#include <stddef.h>

size_t omi_lexer_count_tokens(const char *source)
{
    size_t count = 0;
    int in_token = 0;

    for (const char *p = source; p && *p; p++) {
        int space = *p == ' ' || *p == '\n' || *p == '\t' || *p == '\r';
        if (!space && !in_token) {
            count++;
            in_token = 1;
        } else if (space) {
            in_token = 0;
        }
    }

    return count;
}
