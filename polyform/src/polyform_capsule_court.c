#include "../include/polyform_capsule_court.h"
#include "../src/polyform_witness.h"
#include <string.h>

static uint32_t hash_u8(uint32_t hash, uint8_t value)
{
    return polyform_fnv1a_update(hash, &value, sizeof(value));
}

static uint32_t hash_u16(uint32_t hash, uint16_t value)
{
    uint8_t bytes[2] = {
        (uint8_t)(value & 0xffu),
        (uint8_t)((value >> 8u) & 0xffu)
    };
    return polyform_fnv1a_update(hash, bytes, sizeof(bytes));
}

static uint32_t hash_u32(uint32_t hash, uint32_t value)
{
    uint8_t bytes[4] = {
        (uint8_t)(value & 0xffu),
        (uint8_t)((value >> 8u) & 0xffu),
        (uint8_t)((value >> 16u) & 0xffu),
        (uint8_t)((value >> 24u) & 0xffu)
    };
    return polyform_fnv1a_update(hash, bytes, sizeof(bytes));
}

static uint32_t court_hop_witness(uint32_t before,
                                  uint32_t hop,
                                  uint8_t carrier_index,
                                  uint8_t orientation,
                                  uint8_t scope_depth,
                                  int16_t horizon_layer,
                                  uint8_t horizon_inversion)
{
    uint32_t hash = polyform_fnv1a_seed();
    hash = hash_u32(hash, before);
    hash = hash_u32(hash, hop);
    hash = hash_u8(hash, carrier_index);
    hash = hash_u8(hash, orientation);
    hash = hash_u8(hash, scope_depth);
    hash = hash_u16(hash, (uint16_t)horizon_layer);
    hash = hash_u8(hash, horizon_inversion);
    return hash;
}

static int horizon_valid(int16_t layer, uint8_t inversion)
{
    if (inversion == 0u) {
        return layer >= 0 && layer < (int16_t)LC_PROJECTIVE_HORIZON;
    }
    if (inversion == 1u) {
        return layer <= -1 && layer >= -(int16_t)LC_PROJECTIVE_HORIZON;
    }
    return 0;
}

void polyform_capsule_court_init(polyform_capsule_court_report_t *report)
{
    if (!report) return;
    memset(report, 0, sizeof(*report));
}

static int verify_block_and_carrier(const polyform_capsule_t *capsule,
                                    polyform_capsule_court_report_t *report)
{
    polyform_block_t decoded;

    if (polyform_roundtrip_decode(capsule->braille,
                                  capsule->braille_count,
                                  &decoded) == 0 &&
        decoded.witness == capsule->root_witness) {
        report->block_witness_valid = 1u;
    }

    if (report->block_witness_valid &&
        polyform_carrier_verify(&decoded,
                                capsule->carrier_index,
                                capsule->carrier_bits,
                                capsule->carrier_bit_count) == 0) {
        report->carrier_proof_valid = 1u;
    }

    return report->block_witness_valid && report->carrier_proof_valid;
}

static int verify_rewrite_hash(const polyform_capsule_t *capsule)
{
    if (capsule->rewrite_closure_len > TRL_CLOSURE_BUF_SIZE - 1) {
        return 0;
    }
    return trl_fnv1a32(capsule->rewrite_closure,
                       capsule->rewrite_closure_len) == capsule->rewrite_hash;
}

static int verify_horizon_state(const polyform_capsule_t *capsule)
{
    if (!horizon_valid(capsule->horizon_layer, capsule->horizon_inversion)) {
        return 0;
    }
    for (size_t i = 0; i < capsule->lineage_count; i++) {
        if (!horizon_valid(capsule->lineage[i].horizon_layer,
                           capsule->lineage[i].horizon_inversion)) {
            return 0;
        }
    }
    return 1;
}

static int verify_lineage_chain(const polyform_capsule_t *capsule)
{
    uint32_t expected_before;

    if (capsule->lineage_count > POLYFORM_CAPSULE_MAX_LINEAGE) {
        return 0;
    }
    if (capsule->lineage_count == 0) {
        return capsule->current_witness == capsule->root_witness;
    }

    expected_before = capsule->root_witness;
    for (size_t i = 0; i < capsule->lineage_count; i++) {
        const polyform_capsule_lineage_t *entry = &capsule->lineage[i];
        uint32_t expected_after;
        if (entry->witness_before != expected_before) {
            return 0;
        }
        if (entry->carrier_index >= POLYFORM_CARRIER_COUNT ||
            entry->orientation > POLYFORM_ORIENTATION_WEST) {
            return 0;
        }
        expected_after = court_hop_witness(entry->witness_before,
                                           entry->hop,
                                           entry->carrier_index,
                                           entry->orientation,
                                           entry->scope_depth,
                                           entry->horizon_layer,
                                           entry->horizon_inversion);
        if (entry->witness_after != expected_after) {
            return 0;
        }
        expected_before = entry->witness_after;
    }

    return capsule->current_witness == expected_before;
}

static int tamper_checks_fail_closed(const polyform_capsule_t *capsule)
{
    uint8_t buf[POLYFORM_CAPSULE_SERIALIZED_MAX];
    polyform_capsule_t decoded;
    int len = polyform_capsule_serialize(capsule, buf, sizeof(buf));
    if (len <= 0) {
        return 0;
    }

    buf[0] ^= 0x01u;
    if (polyform_capsule_deserialize(buf, (size_t)len, &decoded) == 0) {
        return 0;
    }
    buf[0] ^= 0x01u;

    if (len > 25) {
        buf[25] ^= 0x01u;
        if (polyform_capsule_deserialize(buf, (size_t)len, &decoded) == 0) {
            return 0;
        }
        buf[25] ^= 0x01u;
    }

    if (len > 0) {
        buf[len - 1] ^= 0x01u;
        if (polyform_capsule_deserialize(buf, (size_t)len, &decoded) == 0) {
            return 0;
        }
    }

    return 1;
}

int polyform_capsule_court_admit(const polyform_capsule_t *capsule,
                                 polyform_capsule_court_report_t *report)
{
    polyform_capsule_court_report_t local;

    if (!report) {
        report = &local;
    }
    polyform_capsule_court_init(report);

    if (!capsule ||
        capsule->magic != POLYFORM_CAPSULE_MAGIC ||
        capsule->version != POLYFORM_CAPSULE_VERSION ||
        capsule->carrier_index >= POLYFORM_CARRIER_COUNT ||
        capsule->orientation > POLYFORM_ORIENTATION_WEST ||
        capsule->braille_count == 0 ||
        capsule->braille_count > POLYFORM_BRAILLE_MAX ||
        capsule->carrier_bit_count != POLYFORM_CARRIER_BITS ||
        capsule->lineage_count > POLYFORM_CAPSULE_MAX_LINEAGE) {
        return -1;
    }

    report->root_witness = capsule->root_witness;
    report->current_witness = capsule->current_witness;
    report->lineage_count = capsule->lineage_count;

    (void)verify_block_and_carrier(capsule, report);
    report->rewrite_hash_valid = (uint8_t)verify_rewrite_hash(capsule);
    report->horizon_state_valid = (uint8_t)verify_horizon_state(capsule);
    report->lineage_chain_valid = (uint8_t)verify_lineage_chain(capsule);
    report->tamper_checks_fail_closed = (uint8_t)tamper_checks_fail_closed(capsule);

    report->admissible = (uint8_t)(report->carrier_proof_valid &&
                                   report->block_witness_valid &&
                                   report->rewrite_hash_valid &&
                                   report->horizon_state_valid &&
                                   report->lineage_chain_valid &&
                                   report->tamper_checks_fail_closed);
    return report->admissible ? 0 : -1;
}

int polyform_capsule_court_admit_serialized(const uint8_t *buf,
                                            size_t len,
                                            polyform_capsule_court_report_t *report)
{
    polyform_capsule_t capsule;
    polyform_capsule_court_report_t local;

    if (!report) {
        report = &local;
    }
    polyform_capsule_court_init(report);

    if (polyform_capsule_deserialize(buf, len, &capsule) < 0) {
        return -1;
    }
    return polyform_capsule_court_admit(&capsule, report);
}
