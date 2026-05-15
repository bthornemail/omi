#include "../include/omi_compiler.h"

#include <string.h>

static int emit_form(omi_compiler_unit_t *unit,
                     omi_form_kind_t kind,
                     int16_t parent,
                     uint16_t depth,
                     uint16_t source_token,
                     const char *text)
{
    omi_form_t *form;
    if (!unit || unit->form_count >= OMI_COMPILER_MAX_FORMS) {
        return -1;
    }
    form = &unit->forms[unit->form_count];
    memset(form, 0, sizeof(*form));
    form->kind = kind;
    form->id = (uint16_t)unit->form_count;
    form->parent = parent;
    form->depth = depth;
    form->source_token = source_token;
    if (text) {
        strncpy(form->text, text, sizeof(form->text) - 1);
        form->text[sizeof(form->text) - 1] = '\0';
    }
    unit->form_count++;
    return form->id;
}

int omi_parse_tokens(omi_compiler_unit_t *unit)
{
    int16_t stack[OMI_COMPILER_MAX_FORMS];
    size_t stack_len = 0;
    if (!unit) {
        return -1;
    }

    unit->form_count = 0;
    unit->parse_error = 0;

    if (emit_form(unit, OMI_FORM_ROOT, -1, 0, 0, "program") < 0) {
        return -1;
    }
    stack[stack_len++] = 0;

    for (size_t i = 0; i < unit->token_count; i++) {
        omi_token_t *token = &unit->tokens[i];
        if (token->kind == OMI_TOKEN_LPAREN) {
            int16_t parent = stack[stack_len - 1];
            int form_id = emit_form(unit, OMI_FORM_LIST, parent, (uint16_t)stack_len, (uint16_t)i, "list");
            if (form_id < 0 || stack_len >= OMI_COMPILER_MAX_FORMS) {
                return -1;
            }
            stack[stack_len++] = (int16_t)form_id;
        } else if (token->kind == OMI_TOKEN_RPAREN) {
            if (stack_len <= 1) {
                unit->parse_error = 1;
                return -1;
            }
            stack_len--;
        } else {
            if (emit_form(unit, OMI_FORM_ATOM, stack[stack_len - 1], (uint16_t)stack_len, (uint16_t)i, token->text) < 0) {
                return -1;
            }
        }
    }

    if (stack_len != 1) {
        unit->parse_error = 1;
        return -1;
    }
    return 0;
}
