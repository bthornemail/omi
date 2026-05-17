#ifndef OMI_POLYFORM_CAPSULE_COURT_H
#define OMI_POLYFORM_CAPSULE_COURT_H

#include "polyform_capsule.h"

typedef struct {
    uint8_t carrier_proof_valid;
    uint8_t block_witness_valid;
    uint8_t rewrite_hash_valid;
    uint8_t horizon_state_valid;
    uint8_t lineage_chain_valid;
    uint8_t tamper_checks_fail_closed;
    uint8_t admissible;
    uint32_t root_witness;
    uint32_t current_witness;
    size_t lineage_count;
} polyform_capsule_court_report_t;

void polyform_capsule_court_init(polyform_capsule_court_report_t *report);

int polyform_capsule_court_admit(const polyform_capsule_t *capsule,
                                 polyform_capsule_court_report_t *report);

int polyform_capsule_court_admit_serialized(const uint8_t *buf,
                                            size_t len,
                                            polyform_capsule_court_report_t *report);

#endif
