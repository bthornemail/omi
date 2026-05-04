#include "../include/omi_polyform_coordinate.h"

#include <limits.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

static void copy_string(char *dst, unsigned dst_size, const char *src)
{
    if (!dst || dst_size == 0u) {
        return;
    }
    if (!src) {
        dst[0] = '\0';
        return;
    }
    strncpy(dst, src, dst_size - 1u);
    dst[dst_size - 1u] = '\0';
}

static unsigned fnv1a_append(unsigned hash, unsigned char byte)
{
    hash ^= (unsigned)byte;
    hash *= 16777619u;
    return hash;
}

static unsigned hash_text(unsigned hash, const char *text)
{
    const unsigned char *p = (const unsigned char *)text;
    if (!p) {
        return fnv1a_append(hash, 0u);
    }
    while (*p) {
        hash = fnv1a_append(hash, *p++);
    }
    return fnv1a_append(hash, 0u);
}

static unsigned hash_field(const char *text)
{
    return hash_text(2166136261u, text);
}

static unsigned hash_int(unsigned hash, int value)
{
    char buffer[32];
    snprintf(buffer, sizeof(buffer), "%d", value);
    return hash_text(hash, buffer);
}

static unsigned receipt_hash(const omi_polyform_coordinate_t *coord)
{
    unsigned hash = 2166136261u;
    hash = hash_text(hash, coord->omi_path);
    hash = hash_text(hash, coord->fs);
    hash = hash_text(hash, coord->gs);
    hash = hash_text(hash, coord->rs);
    hash = hash_text(hash, coord->us);
    hash = hash_text(hash, coord->basis);
    hash = hash_text(hash, coord->degree);
    hash = hash_text(hash, coord->sign);
    hash = hash_text(hash, coord->depth);
    hash = hash_text(hash, "x");
    hash = hash_text(hash, coord->fs);
    hash = hash_text(hash, "y");
    hash = hash_text(hash, coord->gs);
    hash = hash_text(hash, "z");
    hash = hash_text(hash, coord->rs);
    hash = hash_text(hash, "w");
    hash = hash_text(hash, coord->us);
    hash = hash_text(hash, "5040");
    hash = hash_text(hash, "240");
    hash = hash_text(hash, "60");
    hash = hash_text(hash, "16");
    hash = hash_text(hash, "7");
    hash = hash_text(hash, "8");
    return hash;
}

static int reduced_signed_delta(unsigned from, unsigned to)
{
    unsigned distance;
    unsigned reduced;

    if (from == to) {
        return 0;
    }

    distance = (from < to) ? (to - from) : (from - to);
    reduced = 1u + ((distance - 1u) % 2u);
    return from < to ? (int)reduced : -(int)reduced;
}

static unsigned abs_int_value(int value)
{
    return (unsigned)(value < 0 ? -value : value);
}

static unsigned closure_distance_class(int dx, int dy, int dz, int dw)
{
    unsigned magnitude = abs_int_value(dx) +
                         abs_int_value(dy) +
                         abs_int_value(dz) +
                         abs_int_value(dw);
    if (magnitude == 0u) {
        return 0u;
    }
    return 1u + ((magnitude - 1u) % 6u);
}

static unsigned closure_slot(unsigned distance_class)
{
    return (distance_class * 10u) % OMI_POLYFORM_LOCAL_60;
}

static unsigned closure_orientation(int dx, int dy, int dz, int dw)
{
    unsigned magnitudes[4];
    unsigned primary_axis = 0u;
    unsigned i;
    int primary_delta;

    magnitudes[0] = abs_int_value(dx);
    magnitudes[1] = abs_int_value(dy);
    magnitudes[2] = abs_int_value(dz);
    magnitudes[3] = abs_int_value(dw);
    for (i = 1u; i < 4u; i += 1u) {
        if (magnitudes[i] > magnitudes[primary_axis]) {
            primary_axis = i;
        }
    }

    primary_delta = primary_axis == 0u ? dx :
                    primary_axis == 1u ? dy :
                    primary_axis == 2u ? dz : dw;
    return (primary_axis + (primary_delta < 0 ? 2u : 0u)) % 4u;
}

static unsigned closure_receipt_hash(const omi_sexagesimal_closure_t *closure)
{
    unsigned hash = 2166136261u;
    hash = hash_int(hash, closure->delta_x);
    hash = hash_int(hash, closure->delta_y);
    hash = hash_int(hash, closure->delta_z);
    hash = hash_int(hash, closure->delta_w);
    hash = hash_text(hash, "distance_squared");
    hash = hash_int(hash, (int)closure->distance_squared);
    hash = hash_text(hash, "distance_class");
    hash = hash_int(hash, (int)closure->distance_class);
    hash = hash_text(hash, "sexagesimal_slot");
    hash = hash_int(hash, (int)closure->sexagesimal_slot);
    hash = hash_text(hash, "orientation4");
    hash = hash_int(hash, (int)closure->orientation4);
    hash = hash_text(hash, "public_frame240");
    hash = hash_int(hash, (int)closure->public_frame240);
    hash = hash_text(hash, closure->sexagesimal_readout);
    return hash;
}

static void closure_readout(omi_sexagesimal_closure_t *closure)
{
    snprintf(closure->sexagesimal_readout,
             sizeof(closure->sexagesimal_readout),
             "%u:%u",
             closure->orientation4,
             closure->sexagesimal_slot);
}

int omi_polyform_coordinate_validate_timing(const omi_polyform_timing_t *timing)
{
    if (!timing) {
        return 0;
    }
    return timing->master_5040 == OMI_POLYFORM_MASTER_5040 &&
           timing->public_240 == OMI_POLYFORM_PUBLIC_240 &&
           timing->local_60 == OMI_POLYFORM_LOCAL_60 &&
           timing->operator_16 == OMI_POLYFORM_OPERATOR_16 &&
           timing->fano_7 == OMI_POLYFORM_FANO_7 &&
           timing->byte_8 == OMI_POLYFORM_BYTE_8;
}

int omi_polyform_coordinate_from_path(const char *path,
                                      const char *basis,
                                      const char *degree,
                                      const char *sign,
                                      const char *depth,
                                      omi_polyform_coordinate_t *out)
{
    char buffer[OMI_POLYFORM_PATH_MAX];
    char *part = 0;
    unsigned count = 0u;

    if (!path || !out || path[0] == '\0') {
        return 0;
    }

    copy_string(buffer, sizeof(buffer), path);
    *out = (omi_polyform_coordinate_t){0};
    copy_string(out->omi_path, sizeof(out->omi_path), path);
    copy_string(out->basis, sizeof(out->basis), basis ? basis : "polyform");
    copy_string(out->degree, sizeof(out->degree), degree ? degree : "expression-cell");
    copy_string(out->sign, sizeof(out->sign), sign ? sign : "structural");
    copy_string(out->depth, sizeof(out->depth), depth ? depth : "inspect");
    out->timing = (omi_polyform_timing_t){
        .master_5040 = OMI_POLYFORM_MASTER_5040,
        .public_240 = OMI_POLYFORM_PUBLIC_240,
        .local_60 = OMI_POLYFORM_LOCAL_60,
        .operator_16 = OMI_POLYFORM_OPERATOR_16,
        .fano_7 = OMI_POLYFORM_FANO_7,
        .byte_8 = OMI_POLYFORM_BYTE_8
    };

    part = strtok(buffer, "/");
    while (part) {
        count += 1u;
        if (count == 1u) {
            copy_string(out->fs, sizeof(out->fs), part);
        } else if (count == 2u) {
            copy_string(out->gs, sizeof(out->gs), part);
        } else if (count == 3u) {
            copy_string(out->rs, sizeof(out->rs), part);
        } else if (count == 4u) {
            copy_string(out->us, sizeof(out->us), part);
            break;
        }
        part = strtok(0, "/");
    }

    if (count < 3u) {
        *out = (omi_polyform_coordinate_t){0};
        return 0;
    }

    out->x = hash_field(out->fs);
    out->y = hash_field(out->gs);
    out->z = hash_field(out->rs);
    out->w = out->us[0] ? hash_field(out->us) : 0u;
    out->receipt_hash = receipt_hash(out);
    return 1;
}

int omi_polyform_coordinate_apply_overlay(const omi_polyform_coordinate_t *base,
                                          const char *color,
                                          const char *mesh,
                                          const char *texture,
                                          const char *typecast,
                                          omi_polyform_coordinate_t *out)
{
    (void)color;
    (void)mesh;
    (void)texture;
    (void)typecast;

    if (!base || !out || !omi_polyform_coordinate_validate_timing(&base->timing)) {
        return 0;
    }
    *out = *base;
    out->receipt_hash = base->receipt_hash;
    return 1;
}

int omi_polyform_coordinate_cons_geometry(double car,
                                          double cdr,
                                          omi_cons_geometry_t *out)
{
    if (!out || car <= 0.0 || cdr <= 0.0) {
        return 0;
    }

    out->car = car;
    out->cdr = cdr;
    out->cons = sqrt((car * car) + (cdr * cdr));
    if (out->cons <= 0.0) {
        *out = (omi_cons_geometry_t){0};
        return 0;
    }
    out->tan_theta = cdr / car;
    out->cos_theta = car / out->cons;
    out->sin_theta = cdr / out->cons;
    return 1;
}

int omi_polyform_coordinate_closure_from_points(const omi_polyform_coordinate_t *car,
                                                const omi_polyform_coordinate_t *cdr,
                                                omi_sexagesimal_closure_t *out)
{
    if (!car || !cdr || !out) {
        return 0;
    }

    *out = (omi_sexagesimal_closure_t){0};
    out->delta_x = reduced_signed_delta(car->x, cdr->x);
    out->delta_y = reduced_signed_delta(car->y, cdr->y);
    out->delta_z = reduced_signed_delta(car->z, cdr->z);
    out->delta_w = reduced_signed_delta(car->w, cdr->w);
    out->distance_squared = closure_distance_class(out->delta_x,
                                                   out->delta_y,
                                                   out->delta_z,
                                                   out->delta_w);
    if (out->distance_squared == 0u) {
        *out = (omi_sexagesimal_closure_t){0};
        return 0;
    }
    out->distance_class = out->distance_squared;
    out->sexagesimal_slot = closure_slot(out->distance_class);
    out->orientation4 = closure_orientation(out->delta_x,
                                            out->delta_y,
                                            out->delta_z,
                                            out->delta_w);
    out->public_frame240 = (out->orientation4 * OMI_POLYFORM_LOCAL_60) +
                           out->sexagesimal_slot;
    closure_readout(out);
    out->receipt_hash = closure_receipt_hash(out);
    return 1;
}

int omi_polyform_coordinate_validate_closure(const omi_sexagesimal_closure_t *closure)
{
    char expected[16];

    if (!closure) {
        return 0;
    }
    if (closure->distance_squared < 1u || closure->distance_squared > 6u) {
        return 0;
    }
    if (closure->distance_class != closure->distance_squared) {
        return 0;
    }
    if (closure->sexagesimal_slot != closure_slot(closure->distance_class)) {
        return 0;
    }
    if (closure->orientation4 > 3u) {
        return 0;
    }
    if (closure->public_frame240 != (closure->orientation4 * OMI_POLYFORM_LOCAL_60) +
                                     closure->sexagesimal_slot) {
        return 0;
    }
    if (closure->public_frame240 >= OMI_POLYFORM_PUBLIC_240) {
        return 0;
    }
    if (closure->delta_x == 0 && closure->delta_y == 0 &&
        closure->delta_z == 0 && closure->delta_w == 0) {
        return 0;
    }
    snprintf(expected, sizeof(expected), "%u:%u", closure->orientation4, closure->sexagesimal_slot);
    if (strcmp(expected, closure->sexagesimal_readout) != 0) {
        return 0;
    }
    return closure->receipt_hash == closure_receipt_hash(closure);
}

int omi_polyform_coordinate_closure_reverse(const omi_sexagesimal_closure_t *closure,
                                            omi_sexagesimal_closure_t *out)
{
    if (!closure || !out || !omi_polyform_coordinate_validate_closure(closure)) {
        return 0;
    }

    *out = *closure;
    out->delta_x = -closure->delta_x;
    out->delta_y = -closure->delta_y;
    out->delta_z = -closure->delta_z;
    out->delta_w = -closure->delta_w;
    out->orientation4 = (closure->orientation4 + 2u) % 4u;
    out->public_frame240 = (out->orientation4 * OMI_POLYFORM_LOCAL_60) +
                           out->sexagesimal_slot;
    closure_readout(out);
    out->receipt_hash = closure_receipt_hash(out);
    return 1;
}
