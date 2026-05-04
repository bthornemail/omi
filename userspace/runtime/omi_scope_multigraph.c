#include "../include/omi_scope_multigraph.h"

#include <stdio.h>
#include <string.h>

static const char *visibility_name(unsigned visibility)
{
    switch (visibility) {
    case OMI_SCOPE_VISIBILITY_PUBLIC:
        return "public";
    case OMI_SCOPE_VISIBILITY_PRIVATE:
        return "private";
    case OMI_SCOPE_VISIBILITY_PROTECTED:
        return "protected";
    default:
        return 0;
    }
}

static const char *location_name(unsigned location)
{
    switch (location) {
    case OMI_SCOPE_LOCATION_GLOBAL:
        return "global";
    case OMI_SCOPE_LOCATION_LOCAL:
        return "local";
    case OMI_SCOPE_LOCATION_REMOTE:
        return "remote";
    default:
        return 0;
    }
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

static unsigned hash_uint(unsigned hash, unsigned value)
{
    char buffer[32];
    snprintf(buffer, sizeof(buffer), "%u", value);
    return hash_text(hash, buffer);
}

static unsigned edge_receipt(const omi_multigraph_edge_t *edge)
{
    unsigned hash = 2166136261u;
    hash = hash_uint(hash, edge->from_coord_receipt);
    hash = hash_uint(hash, edge->to_coord_receipt);
    hash = hash_uint(hash, edge->closure_receipt);
    hash = hash_uint(hash, edge->edge_kind);
    hash = hash_uint(hash, edge->visibility);
    hash = hash_uint(hash, edge->location);
    hash = hash_uint(hash, edge->carrier);
    hash = hash_uint(hash, edge->orientation4);
    hash = hash_uint(hash, edge->sexagesimal_slot);
    hash = hash_uint(hash, edge->public_frame240);
    hash = hash_text(hash, edge->scope_class);
    return hash;
}

int omi_scope_multigraph_encode_scope(unsigned visibility,
                                      unsigned location,
                                      char *out,
                                      unsigned out_size)
{
    const char *left = visibility_name(visibility);
    const char *right = location_name(location);

    if (!left || !right || !out || out_size == 0u) {
        return 0;
    }
    snprintf(out, out_size, "%s.%s", left, right);
    out[out_size - 1u] = '\0';
    return 1;
}

int omi_scope_multigraph_decode_scope(const char *scope_class,
                                      unsigned *visibility,
                                      unsigned *location)
{
    char buffer[32];
    char *dot;

    if (!scope_class || !visibility || !location) {
        return 0;
    }

    snprintf(buffer, sizeof(buffer), "%s", scope_class);
    buffer[sizeof(buffer) - 1u] = '\0';
    dot = strchr(buffer, '.');
    if (!dot) {
        return 0;
    }
    *dot = '\0';
    dot += 1;

    if (strcmp(buffer, "public") == 0) {
        *visibility = OMI_SCOPE_VISIBILITY_PUBLIC;
    } else if (strcmp(buffer, "private") == 0) {
        *visibility = OMI_SCOPE_VISIBILITY_PRIVATE;
    } else if (strcmp(buffer, "protected") == 0) {
        *visibility = OMI_SCOPE_VISIBILITY_PROTECTED;
    } else {
        return 0;
    }

    if (strcmp(dot, "global") == 0) {
        *location = OMI_SCOPE_LOCATION_GLOBAL;
    } else if (strcmp(dot, "local") == 0) {
        *location = OMI_SCOPE_LOCATION_LOCAL;
    } else if (strcmp(dot, "remote") == 0) {
        *location = OMI_SCOPE_LOCATION_REMOTE;
    } else {
        return 0;
    }
    return 1;
}

static int fill_edge(const omi_polyform_coordinate_t *from_coord,
                     const omi_polyform_coordinate_t *to_coord,
                     const omi_sexagesimal_closure_t *closure,
                     unsigned edge_kind,
                     unsigned visibility,
                     unsigned location,
                     unsigned carrier,
                     omi_multigraph_edge_t *out)
{
    if (!from_coord || !to_coord || !closure || !out) {
        return 0;
    }
    if (!omi_polyform_coordinate_validate_closure(closure)) {
        return 0;
    }
    if (!omi_scope_multigraph_encode_scope(visibility,
                                           location,
                                           out->scope_class,
                                           sizeof(out->scope_class))) {
        return 0;
    }

    *out = (omi_multigraph_edge_t){0};
    out->from_coord_receipt = from_coord->receipt_hash;
    out->to_coord_receipt = to_coord->receipt_hash;
    out->closure_receipt = closure->receipt_hash;
    out->edge_kind = edge_kind;
    out->visibility = visibility;
    out->location = location;
    out->carrier = carrier;
    out->orientation4 = closure->orientation4;
    out->sexagesimal_slot = closure->sexagesimal_slot;
    out->public_frame240 = closure->public_frame240;
    omi_scope_multigraph_encode_scope(visibility,
                                      location,
                                      out->scope_class,
                                      sizeof(out->scope_class));
    out->receipt = edge_receipt(out);
    return 1;
}

int omi_scope_multigraph_canonical_edge(const omi_polyform_coordinate_t *from_coord,
                                        const omi_polyform_coordinate_t *to_coord,
                                        const omi_sexagesimal_closure_t *closure,
                                        unsigned visibility,
                                        unsigned location,
                                        omi_multigraph_edge_t *out)
{
    return fill_edge(from_coord,
                     to_coord,
                     closure,
                     OMI_SCOPE_EDGE_CANONICAL,
                     visibility,
                     location,
                     OMI_SCOPE_CARRIER_NONE,
                     out);
}

int omi_scope_multigraph_barcode_edge(const omi_polyform_coordinate_t *from_coord,
                                      const omi_polyform_coordinate_t *to_coord,
                                      const omi_sexagesimal_closure_t *closure,
                                      unsigned visibility,
                                      unsigned location,
                                      unsigned carrier,
                                      omi_multigraph_edge_t *out)
{
    if (carrier > OMI_SCOPE_CARRIER_BEECODE) {
        return 0;
    }
    if (carrier != closure->orientation4) {
        return 0;
    }
    return fill_edge(from_coord,
                     to_coord,
                     closure,
                     OMI_SCOPE_EDGE_BARCODE,
                     visibility,
                     location,
                     carrier,
                     out);
}

int omi_scope_multigraph_validate_edge(const omi_multigraph_edge_t *edge)
{
    unsigned visibility;
    unsigned location;

    if (!edge) {
        return 0;
    }
    if (!omi_scope_multigraph_decode_scope(edge->scope_class, &visibility, &location)) {
        return 0;
    }
    if (visibility != edge->visibility || location != edge->location) {
        return 0;
    }
    if (edge->public_frame240 >= OMI_POLYFORM_PUBLIC_240) {
        return 0;
    }
    if (edge->orientation4 > 3u) {
        return 0;
    }
    if (edge->sexagesimal_slot >= OMI_POLYFORM_LOCAL_60) {
        return 0;
    }
    if (edge->public_frame240 != (edge->orientation4 * OMI_POLYFORM_LOCAL_60) +
                                 edge->sexagesimal_slot) {
        return 0;
    }
    if (edge->edge_kind == OMI_SCOPE_EDGE_CANONICAL) {
        if (edge->carrier != OMI_SCOPE_CARRIER_NONE) {
            return 0;
        }
    } else if (edge->edge_kind == OMI_SCOPE_EDGE_BARCODE) {
        if (edge->carrier > OMI_SCOPE_CARRIER_BEECODE) {
            return 0;
        }
        if (edge->carrier != edge->orientation4) {
            return 0;
        }
    } else {
        return 0;
    }
    return edge->receipt == edge_receipt(edge);
}
