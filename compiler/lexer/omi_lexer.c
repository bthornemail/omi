#include "../include/omi_compiler.h"

#include <ctype.h>
#include <string.h>

static int is_space_char(char c)
{
    return c == ' ' || c == '\n' || c == '\t' || c == '\r';
}

size_t omi_lexer_count_tokens(const char *source)
{
    size_t count = 0;
    int in_token = 0;

    for (const char *p = source; p && *p; p++) {
        if (*p == '(' || *p == ')') {
            count++;
            in_token = 0;
            continue;
        }
        if (!is_space_char(*p) && !in_token) {
            count++;
            in_token = 1;
        } else if (is_space_char(*p)) {
            in_token = 0;
        }
    }

    return count;
}

static void copy_token_text(char *dst, const char *src, size_t len)
{
    if (len > OMI_COMPILER_TEXT_SIZE - 1) {
        len = OMI_COMPILER_TEXT_SIZE - 1;
    }
    memcpy(dst, src, len);
    dst[len] = '\0';
}

static int emit_token(omi_compiler_unit_t *unit,
                      omi_token_kind_t kind,
                      const char *text,
                      size_t len,
                      size_t start,
                      size_t end)
{
    omi_token_t *token;
    if (!unit || unit->token_count >= OMI_COMPILER_MAX_TOKENS) {
        return -1;
    }
    token = &unit->tokens[unit->token_count++];
    token->kind = kind;
    token->start = start;
    token->end = end;
    if (text) {
        copy_token_text(token->text, text, len);
    } else {
        token->text[0] = '\0';
    }
    return 0;
}

static int is_keyword_atom(const char *text)
{
    return strcmp(text, "bind") == 0 ||
           strcmp(text, "assign") == 0 ||
           strcmp(text, "join") == 0 ||
           strcmp(text, "compose") == 0 ||
           strcmp(text, "target") == 0;
}

void omi_compiler_unit_init(omi_compiler_unit_t *unit)
{
    if (!unit) {
        return;
    }
    memset(unit, 0, sizeof(*unit));
    trl_init(&unit->frontend);
}

static size_t scan_atom(const char *source, size_t start, char *buf)
{
    size_t pos = start;
    while (source[pos] &&
           !is_space_char(source[pos]) &&
           source[pos] != '(' &&
           source[pos] != ')') {
        pos++;
    }
    copy_token_text(buf, source + start, pos - start);
    return pos;
}

int omi_compile_lex(const char *source, omi_compiler_unit_t *unit)
{
    size_t i = 0;
    if (!source || !unit) {
        return -1;
    }

    omi_compiler_unit_init(unit);

    while (source[i] != '\0') {
        char atom[OMI_COMPILER_TEXT_SIZE];
        char next_atom[OMI_COMPILER_TEXT_SIZE];
        size_t atom_start;
        size_t atom_end;
        size_t look = 0;
        if (is_space_char(source[i])) {
            i++;
            continue;
        }
        if (source[i] == '(') {
            if (emit_token(unit, OMI_TOKEN_LPAREN, "(", 1, i, i + 1) != 0) return -1;
            i++;
            continue;
        }
        if (source[i] == ')') {
            if (emit_token(unit, OMI_TOKEN_RPAREN, ")", 1, i, i + 1) != 0) return -1;
            i++;
            continue;
        }

        atom_start = i;
        atom_end = scan_atom(source, atom_start, atom);
        i = atom_end;

        if (is_keyword_atom(atom)) {
            look = i;
            while (source[look] && is_space_char(source[look])) {
                look++;
            }
            if (source[look] && source[look] != '(' && source[look] != ')') {
                size_t next_end = scan_atom(source, look, next_atom);
                char combined[TRL_INPUT_BUF_SIZE];
                size_t combined_len;
                strcpy(combined, atom);
                strcat(combined, " ");
                strcat(combined, next_atom);
                trl_rewrite(&unit->frontend, combined, strlen(combined));
                unit->frontend_steps += (uint32_t)unit->frontend.trace_count;
                combined_len = unit->frontend.last_output_len;
                if (emit_token(unit, OMI_TOKEN_ATOM,
                               unit->frontend.last_output,
                               combined_len,
                               atom_start,
                               next_end) != 0) return -1;
                i = next_end;
                continue;
            }
        }

        trl_rewrite(&unit->frontend, atom, strlen(atom));
        unit->frontend_steps += (uint32_t)unit->frontend.trace_count;
        if (emit_token(unit, OMI_TOKEN_ATOM,
                       unit->frontend.last_output_len ? unit->frontend.last_output : atom,
                       unit->frontend.last_output_len ? unit->frontend.last_output_len : strlen(atom),
                       atom_start,
                       atom_end) != 0) return -1;
    }

    unit->normalized_len = 0;
    for (i = 0; i < unit->token_count && unit->normalized_len < sizeof(unit->normalized_source) - 1; i++) {
        size_t len = strlen(unit->tokens[i].text);
        if (i > 0 && unit->normalized_len < sizeof(unit->normalized_source) - 1) {
            unit->normalized_source[unit->normalized_len++] = ' ';
        }
        if (len > sizeof(unit->normalized_source) - 1 - unit->normalized_len) {
            len = sizeof(unit->normalized_source) - 1 - unit->normalized_len;
        }
        memcpy(unit->normalized_source + unit->normalized_len, unit->tokens[i].text, len);
        unit->normalized_len += len;
    }
    unit->normalized_source[unit->normalized_len] = '\0';
    return 0;
}
