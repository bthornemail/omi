# Phase 60 - Visual Artifact Export Equivalence Court

Phase 60 proves that the scene identity carried by the composer can survive
across the exported visual surfaces without any of those surfaces becoming
authority.

## Scope

This court compares the normalized OMI identity metadata carried by:

- SVG export
- glTF export
- OBJ/MTL export
- WebGL plan summaries
- OpenGL ES plan summaries
- OpenGL plan summaries

The comparison is root-identity based and deterministic. It checks:

- `omi_path`
- `coordinate_receipt`
- `closure_receipt`
- `scope`
- `carrier`
- `witness`
- `projection_intent`

## Doctrine

```text
Export artifacts are projections, not authority.
The same OMI scene must yield the same identity witness across visual
surfaces.
Missing metadata rejects deterministically.
Unknown artifact kinds reject deterministically.
```

## Files

- `workbench/src/visual_artifact_equivalence.js`
- `tests/workbench_visual_artifact_equivalence_test.js`

## Acceptance

- trailer composer scenes compare equivalently across SVG, glTF, OBJ/MTL,
  WebGL, GLES, and OpenGL summaries.
- barcode template scenes compare equivalently across the same surfaces.
- identity metadata matches exactly across normalized summaries.
- malformed artifacts reject deterministically.

