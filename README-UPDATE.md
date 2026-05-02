# OMI 10-Layer OSI Model with Formal S-P-O Graph

This update introduces a formalized S-P-O (Subject-Predicate-Object) graph specification to the OMI 10-layer OSI model documentation.

## What's New

1. **S-P-O.org** - A dedicated file containing the complete formal specification of all S-P-O triples as a navigable, executable graph
   - All triples organized by layer (L1-L10)
   - Bidirectional navigation rules with inverse predicates
   - Executable graph query patterns
   - Implementation notes and verification criteria

2. **Updated Layer Files** - Each layer file (L1-physical.org through L10-organization.org) now references the formal S-P-O specification instead of containing inline tables

3. **Updated OSI-MODEL.org** - The master document now references the formal S-P-O.org specification

4. **Modal verification** - RFC 2119 modalities turn S-P-O triples into explicit obligations
   - `org/MODAL-VERIFICATION.org` maps MUST/MUST_NOT/SHOULD/MAY rows to assertions, diagnostics, warnings, and notes
   - Layer 9 distinguishes Tree-sitter structural parsing from OMI-DL Datalog/Y-Z fixed-point logic evaluation
   - The earlier Prolog direction is replaced by finite Datalog-style evaluation over S-P-O facts

## Directory Structure

```
org/
├── OSI-MODEL.org          # Master document (now references S-P-O.org)
├── S-P-O.org              # NEW: Formal S-P-O graph specification
├── L1-physical.org        # Layer 1: Physical (Bits)
├── L2-encoding.org        # Layer 2: Data Link (Encoding)
├── L3-gauge.org           # Layer 3: Network (Gauge)
├── L4-trace.org           # Layer 4: Transport (Trace)
├── L5-session-omicron.org # Layer 5: Session (OMICRON)
├── L6-projection-pi.org   # Layer 6: Presentation (Projection π)
├── L7-semantics.org       # Layer 7: Application (Semantics)
├── L8-macros.org          # Layer 8: Macros (Transform Surface)
├── L9-adapters.org        # Layer 9: Adapters (Boundary Interfaces)
├── L10-organization.org   # Layer 10: Organization (Structure Surface)
├── MODAL-VERIFICATION.org # RFC 2119 obligation mapping
└── WALKTHROUGH.org        # Development walkthrough guidance
```

## Using the Formal S-P-O Graph

The S-P-O graph supports:

1. **Forward Navigation**: subject --[predicate]--> object
2. **Backward Navigation**: object <--[predicate_inverse]-- subject
3. **Predicate Lookup**: predicate --> [all_relations]--> (subject, object) pairs
4. **Executable Queries**: Programmatic traversal and querying of the graph

See `S-P-O.org` for complete details on the formal specification, bidirectional rules, and query patterns.

## Benefits

- **Precision**: Exact specification of every S-P-O triple
- **Executability**: The graph can be queried and traversed programmatically
- **Consistency**: Centralized definition prevents inconsistencies between layers
- **Navigability**: Bidirectional links enable exploration in multiple directions
- **Verification**: Clear criteria for validating the graph's correctness

This formalization transforms the S-P-O coordination schema from a descriptive model into an executable specification that can be used for development, verification, and documentation navigation.
