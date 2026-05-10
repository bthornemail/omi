# OMI Documentation

This directory describes OMI from four angles:

- descriptive ontology: the names and relations the system uses
- normative rules: the validity constraints a graph state must satisfy
- executable substrate: the current QEMU/Multiboot2 boot path
- verification model: replay, closure, and determinism expectations

The documentation is intentionally split so natural-language explanation does
not blur into normative requirements. When a behavior is mandatory, the rule
belongs in `RULES.omi` or in a spec section that explicitly points to it.

## Reading Order

1. `ARCHITECTURE.md` gives the mental model of the system.
2. `OMI-CONSTITUTIONAL-GEOMETRY.md` is the sovereign doctrine source for
   boundary, segmentation, projection, and propagation.
3. `CORE-PRINCIPLE.md` states the pre-OS CONS/projection principle.
4. `OMI-BOUNDARY-FIRST-LANGUAGE-DOCTRINE.md` defines the omicron boundary law
   and the document-as-world model.
5. `OMI-FUNDAMENTAL-GEOMETRY-RUNTIME.md` defines the first-principles geometry,
   resolution, and projection doctrine.
6. `LEXICON.omi` defines the vocabulary.
7. `ONTOLOGY.omi` defines the core OMI types and relations.
8. `RULES_GUIDE.md` explains how to read the normative rule file.
9. `RULES.omi` defines the RFC 2119-style graph constraints.
10. `FRAMES.omi` defines the future frame/user-space interpretation contract.
11. `FRAME_ABI.md` explains the frame model in implementation-facing prose.
12. `GRAPH_MEMORY_SPEC.md` defines the Phase 1 byte-level graph memory ABI.
13. `BOOT_MODEL.md` explains how the current kernel boots and evaluates memory.
14. `CONS_THEOREMS.md` records the claims the implementation is trying to make
    mechanically checkable.
15. `IMPLEMENTATION-AUDIT-PHASES-20-29.md` records the current observer,
    projection, and pre-OS law implementation evidence.
16. `PHASE-30-OSI-PROJECTION-INTEGRATION-LAW.md` describes the OSI lens-stack
    bridge over Phase 28 replay.
17. `FOUNDATION-AUDIT-PRE-OS-OSI.md` proves the Phase 28 -> Phase 29 -> Phase
    30 foundation chain.
18. `PHASE-31-POLYFORM-BLOCK-RENDERING-API.md` defines the polyform block as
    the canonical rendering witness over the foundation state.
19. `PHASE-32-POLYFORM-BLOCK-AS-BOOT-ARTIFACT.md` describes the QEMU boot
    header that serializes the canonical polyform block and verifies its
    witness.
20. `PHASE-33-QEMU-MODEL-REGISTRY.md` pins the canonical model registry as a
    booted QEMU serial witness for lazy user-space initialization.
21. `PHASE-34-LAZY-USERSPACE-INIT.md` defines the first lazy user-space mount
    table over the model registry.
22. `PHASE-35-LAZY-PROJECTION-EVALUATOR.md` defines demand-driven depth
    projection over mounted model handles.
23. `PHASE-36-MODEL-VFS-PROJECTION.md` defines the filesystem-like path
    projection over model handles and lazy views.
24. `PHASE-37-HOTPLUG-MODEL-LOADER.md` defines the user-space overlay loader
    for validated hot-plug model declarations.
25. `PHASE-38-TIMED-SCANNABLE-MODEL-CARRIERS.md` defines timed carrier
    receipts and declaration payload registration through the loader.
26. `PHASE-39-POLYFORM-SVG-RENDERER.md` defines deterministic render traces
    and non-authoritative SVG witnesses over lazy model projections.
27. `PHASE-40A-EVENT-MODELS.md` defines declarative event records.
28. `PHASE-40B-INTENT-MODELS.md` defines declarative projection intents.
29. `PHASE-40C-TEXTURE-MODELS.md` defines surface texture projections.
30. `PHASE-40D-DIAGRAM-TEMPLATES.md` defines reusable diagram proof templates.
31. `PHASE-40E-DECLARATIVE-SURFACE-INTEGRATION.md` proves the pre-app
    declarative surface.
32. `PHASE-41-DECLARATIVE-APPLICATIONS.md` defines applications as model
    declarations over existing declarative surfaces.
33. `PHASE-42-DECLARATIVE-DEVICE-MODELS.md` defines devices as model
    declarations over event, render, carrier, network, and storage surfaces.
34. `PHASE-43-QEMU-TCG-PORTABILITY-COURT.md` defines QEMU TCG as the canonical
    portable execution witness.
35. `PHASE-44-OMI-PAGE-COURT.md` defines the typed memory region witness and
    page-court law.
36. `PHASE-45-MMIO-DEVICE-PROJECTION-COURT.md` defines the typed MMIO device
    projection court.
37. `PHASE-46A-HARDWARE-EVENT-PACKET-LAW.md` defines the compact typed packet
    carried across device and MMIO boundaries.
38. `PHASE-46B-ESP32-EVENT-WITNESS-PROFILE.md` defines the ESP32-class
    low-power witness profile over the hardware event packet law.
39. `PHASE-46C-OMI-WORLD-WORKBENCH.md` defines the first source-first visual
    organizer for OMI world models.
40. `PHASE-47-INTERACTIVE-OMI-WORLD-WORKBENCH.md` defines the interactive
    workbench projection backends, pointer routing, and export law.
41. `PHASE-48-WORKBENCH-EDIT-LOG.md` defines append-only workbench edit
    events, replay reconstruction, and undo/redo law.
42. `PHASE-49-WORKBENCH-COLLABORATION-MERGE-COURT.md` defines deterministic
    local merge for append-only workbench edit logs and explicit conflict
    records.
43. `PHASE-50-WORKBENCH-SYNC-PACKET-COURT.md` defines transport-neutral sync
    packets for append-only edit logs, merge logs, and explicit conflict
    records.
44. `PHASE-51A-FILE-BASED-WORKBENCH-SYNC.md` defines the first durable
    transport adapter for validated sync packets and ordered sync bundles.
45. `PHASE-51C-BARCODE-WORKBENCH-SYNC.md` defines the scannable barcode
    carrier adapter for validated sync packets using Phase 38 carrier roles.
46. `PHASE-51D-ESP32-WORKBENCH-SYNC.md` defines the ESP32-class simulator
    carrier adapter for transporting validated sync packets through the Phase
    46 witness profile.
47. `PHASE-52-LITERATE-ORG-TREESITTER-COURT.md` defines deterministic Org
    bundle export, property drawers, Babel blocks, noweb/tangle, TRAMP carrier
    locators, and a tree-sitter interoperability bridge.
48. `PHASE-53-DIAGRAM-GRAPH-TEMPLATE-TANGLE-COURT.md` defines deterministic
    DOT/SVG/relations/index artifact generation from canonical world relations
    and diagram templates.
49. `PHASE-54-OMI-POLYFORM-COORDINATE-LAW.md` defines FS/GS/RS/US as the
    canonical x/y/z/w coordinate depth of polyform expression blocks.
50. `PHASE-54C-CANONICAL-BARCODE-MULTIGRAPH-SCOPE-LAW.md` defines the
    canonical/barcode scope multi-graph over shared coordinate and closure
    receipts.
51. `PHASE-55-DIAGRAM-RENDERER-ADAPTER-COURT.md` defines deterministic diagram
    renderer adapters over tangle artifacts, coordinates, and scope graph
    metadata.
52. `PHASE-56-OMI-COMPOSER-INTERFACE-COURT.md` defines the OS-level workbench
    composer shell for importing, composing, inspecting, and exporting OMI
    world-model projections.
53. `PHASE-57-POLYFORM-GPU-PROJECTION-COURT.md` defines deterministic
    renderer-neutral GPU command streams over coordinates, closures, scope
    edges, and composer scenes.
54. `PHASE-58-WEBGL-RUNTIME-ADAPTER-COURT.md` defines deterministic WebGL
    runtime plans over GPU command streams without requiring a browser
    context.
55. `PHASE-59A-WEBGL-CANVAS-PREVIEW-COURT.md` defines deterministic browser
    preview surfaces over WebGL runtime plans without requiring a real GPU
    context.
56. `PHASE-59B-OPENGL-ES-ADAPTER-COURT.md` defines deterministic OpenGL ES
    plans over GPU command streams without requiring a GLES context.
57. `PHASE-59C-OPENGL-DESKTOP-ADAPTER-COURT.md` defines deterministic desktop
    OpenGL plans over GPU command streams without requiring an OpenGL
    context.
58. `PHASE-59D-GRAPHICS-BACKEND-EQUIVALENCE-COURT.md` defines deterministic
    comparison witnesses over the WebGL, GLES, and OpenGL backend summaries.
59. `PHASE-60-VISUAL-ARTIFACT-EXPORT-EQUIVALENCE-COURT.md` defines
    deterministic visual artifact identity equivalence across SVG, glTF,
    OBJ/MTL, WebGL, GLES, and OpenGL projections.
60. `LIGHT-GARDEN-240-PROJECTIVE-FRAME.md` records the normalized 240/60/16/7/8
    timing law as the public projective frame for polyform coordinates.
61. `QEMU-TCG-MMU-OMI-MEMORY-LAW.md` records the QEMU software-MMU memory and
    MMIO doctrine for future page/device courts.
62. `PRECURSOR-REFERENCE-AUDIT.md` records reference-only material from the
    older Omnicron and OMI-LISP trees.
63. `PHASE-61-OMI-COMPOSER-PACKAGE-COURT.md` records the deterministic
    composer package bundle that carries source, logs, receipts, artifacts,
    plans, and equivalence summaries.
64. `PHASE-62-COMPOSER-PACKAGE-SIGNING-TRUST-COURT.md` records deterministic
    trust metadata that attests to package receipts without changing package
    authority.
65. `PHASE-63-GEOMETRIC-RECONCILIATION-LAYER.md` records the chart/geometry
    doctrine that treats lazy, greedy, static, and animated views as
    deterministic projections of the same declared object.
66. `PHASE-64-LAZY-GREEDY-VIEW-SWITCHER.md` records the workbench switcher
    that toggles the same declared object between lazy, greedy, static, and
    animated projections.
67. `PHASE-65-5040-STATE-ANIMATION-TIMELINE.md` records the deterministic
    5040-frame animation control surface over the animated projection.
68. `PHASE-66-FRACTAL-SUBCHART-UNFOLDER.md` records the unfold/refold
    surface that opens a sealed vertex into a greedy subchart and returns it
    to the same lazy address.
69. `PHASE-67-CUBE-DIFFERENTIAL-AS-BARCODE-TEMPLATE.md` records the cube
    witness as a lazy/greedy switchable barcode template component.
70. `PHASE-68-BARCODE-TEMPLATE-COMPOSITION-COURT.md` records the deterministic
    composition gallery for imported barcode templates and registry fixtures.
71. `PHASE-69-COMPOSITION-TRUST-BUNDLES.md` records the trust bundle that
    seals composition identity receipts without treating view state as the
    trust anchor.
72. `PHASE-70-COMPOSITION-BUNDLE-COURT.md` records the deterministic bundle
    that packages composition identity, gallery projection, and trust seal
    together.
73. `PHASE-71-SCOPED-STREAM-DECLARATION-COURT.md` records the executable
    stream declaration surface for raw binary, character encoding, endian,
    text direction, traversal, and presentation scopes.
74. `PHASE-72-SCOPED-STREAM-PROJECTION-COURT.md` records the executable
    stream projection surface for barcode and chart readouts over the same
    declared stream.
75. `PHASE-73-MULTI-REGION-OVERLAY-PROJECTION.md` records deterministic
    overlay resolution for overlapping stream declarations.
76. `PHASE-74-OVERLAY-AS-PACKAGE-EXPORT.md` records portable export/import of
    declaration stacks together with overlay projection receipts.
77. `PHASE-75-OMI-LISP-CANONICAL-DECLARATION-SURFACE.md` records canonical
    `.omilisp` declarations for the narrative world and Addr128 locator
    surface.
78. `PHASE-76-GAUGE-RESOLVED-CANONICAL-UNIFICATION.md` records the
    gauge-resolved declaration-to-triplet triangulation surface over canonical
    declarations and legacy FS/GS/RS/US traces.
79. `PHASE-77-OMI-BLOCK-IMAGE-DECLARATION-COURT.md` records declared block
    images with fixed block sizing, sparse chunk tables, and deterministic
    chunk receipts.
80. `PHASE-78-BLOCK-IMAGE-PROJECTION-COURT.md` records deterministic lazy,
    greedy, static, and animated readouts over declared block images.
81. `PHASE-79-NARRATIVE-TIMELINE-AS-DECLARED-WORLD.md` records the declared
    narrative timeline and movie surface derived from the canonical world
    series.
82. `PHASE-80-MESSAGING-CONFLICT-AUDIT.md` records the wave-model audit for
    message-like surfaces, authority collisions, and receipt-consistent
    reconciliation.
83. `PHASE-81-PROPAGATION-DOCTRINE.md` records the positive doctrine for
    gauge, wave, receipt, projection, and the admissible propagation boundary.
84. `PHASE-82-OPERATOR-BAND-CONS-TRIE-INCLUSION-AUDIT.md` records the
    role-separated inclusion of operator-band, polyform, SVG recompilation,
    and CONS-trie reference materials.
85. `PHASE-83-OMI-IN-OMI-DECLARATIVE-MAPPING.md` records the canonical
    `declarations/omi-system.omilisp` self-map that declares OMI in OMI
    without creating a new execution authority.
86. `PHASE-84-POLYFORM-CONS-RECONSTRUCTION-DOCTRINE.md` records polyforms as
    metric reconstructions of admissible CONS incidence chains.
87. `PHASE-85-ORIENTATION-INCIDENCE-BLACKBOARD-DOCTRINE.md` records
    orientation-conditioned blackboard resolution through representative
    incidence triads and the separate ordered 155-triad reference corpus.
88. `PHASE-86-NETWORK-BOOTABLE-OMI-RUNTIME-RESOLVER.md` records the
    network-bootable runtime resolver lattice over boot carriers, POSIX
    projection channels, peer receipt sync, and replayable runtime mutation.
89. `PHASE-87-RUNTIME-CHANNEL-MANIFEST-COURT.md` records the declaration-only
    runtime channel manifest for `/run/omi`, `/dev/omi`, FIFO/socket/process
    names, process roles, and capability boundaries.
90. `PHASE-88-DISTRIBUTED-ADAPTER-TRANSPORT-REGISTRY.md` records the
    declaration-only adapter vocabulary for TCP, UDP, IPC, web, ledger, inode,
    GPIO, SCSI, and I2C surfaces.
91. `PHASE-89-RAW-BINARY-DECENTRALIZED-LATTICE-INTEGRATION-AUDIT.md` records
    the integration map connecting existing block-image, runtime resolver,
    channel manifest, and adapter registry courts to future raw-binary lattice
    receipt and adapter courts.
92. `PHASE-90-RAW-BINARY-CHUNK-RECEIPT-INDEX.md` records the executable raw
    binary chunk index court that turns byte payloads into deterministic sparse
    and dense chunk receipts before any network protocol exists.
93. `PHASE-91-BOUNDARY-GEOMETRY-CONSTITUTION.md` freezes the core boundary
    geometry doctrine for admissible differentiation, oriented boundaries, and
    chunk receipts as boundary witnesses.
94. `PHASE-92-QEMU-MULTI-PLATFORM-PORTABILITY-COURT.md` records the
    report-generating QEMU portability court over existing foundation, endian,
    raw-binary, and cross-architecture witness lanes.
95. `PHASE-93-OMI-OBSERVER-LATTICE-SITTER.md` records the receipt-seeded OMI
    observer doctrine for selecting admissible orientation frames and
    translating boundary structure into receipt-verifiable projections.
96. `PHASE-94-WORDNET-PROLOG-SEMANTIC-GROUNDING-ADAPTER.md` records WordNet,
    Prolog, RDF/SPARQL, graph message passing, and pub/sub as grounding and
    projection adapters over the receipt-verified OMI CONS lattice.
97. `PHASE-95-OMI-TRANSMUTATOR-ROUNDTRIP-COURT.md` records the executable
    transmutator court that roundtrips OMI declarations through S-P-O-M,
    Prolog-like, RDF-like, and JSON-like projection adapters.
98. `PHASE-96-UNICODE-LEXEME-BITMASK-ANNOTATION-LATTICE.md` records Unicode
    blocks as versioned mux/demux annotation lattices over lexeme and synset
    edges without making codepoints semantic authority.
99. `PHASE-97-SIXTY-FOUR-ION-BLACKBOARD-PAIRING-DOCTRINE.md` records the
    64-ion continuation as the pair-wise notation surface that lets
    trigintaduonion triads operate as blackboard resolver frames.
100. `PHASE-98-UNIVERSAL-CLOSURE-CODING-64-ION-BLACKBOARD.md` records
     universal and self-delimiting codes as closure laws over the 64-ion
     blackboard pairing surface.
101. `PHASE-99-AUTONOMOUS-WORLD-BUILDER-MODEL.md` records the deterministic
     autonomous world builder model that proposes fixture world structure and
     admits only receipt-verified declarations into world state.
102. `PHASE-100-AUTONOMOUS-WORLD-UX-BROWSER-SMOKE-COURT.md` records the
     headless autonomous world browser smoke court for opening, traversing,
     projecting, and receipt-checking admitted world state.
103. `PHASE-101-AUTONOMOUS-WORLD-LIVE-RENDERER.md` records the deterministic
     headless render-plan court for rendering and animating admitted world
     projections without making the renderer authority.
104. `PHASE-102-AUTONOMOUS-WORLD-INTERJECTION-OVERLAY.md` records the
     deterministic headless overlay court for observer interjections that
     project onto admitted worlds without rewriting world authority.
105. `PHASE-103-AUTONOMOUS-WORLD-OVERLAY-ADMISSION-COURT.md` records the first
     safe mutation pathway where overlays become candidate edits and only
     admitted declarations become world history.
106. `PHASE-104-AUTONOMOUS-WORLD-VERSION-HISTORY-COURT.md` records the
     receipt-linked version graph over admitted world snapshots without making
     history itself world authority.
107. `PHASE-105-AUTONOMOUS-WORLD-MERGE-RECONCILIATION-COURT.md` records the
     deterministic reconciliation court where admitted branches may propose a
     merge, classify conflicts, and create a merged identity only by admission.
108. `PHASE-106-AUTONOMOUS-WORLD-PACKAGE-SYNC-COURT.md` records the portable
     sync package court for exporting and importing admitted world histories as
     receipt-verifiable transport evidence.

## File Roles

`ARCHITECTURE.md`
: Human explanation of OMI as a bootable graph rewriting substrate.

`OMI-CONSTITUTIONAL-GEOMETRY.md`
: Sovereign doctrine source for boundary, segmentation, projection,
  propagation, derived geometry, structural planes, semantic projection, and
  runtime consequences.

`CORE-PRINCIPLE.md`
: The pre-OS CONS/projection principle: hidden structure is measured by
  projection, and digits are visible measurements before they are numbers.

`OMI-FUNDAMENTAL-GEOMETRY-RUNTIME.md`
: First-principles runtime doctrine for canonical byte replay, FS/GS/RS/US
  trace structure, resolution timing, projection-gated rendering, witness
  surfaces, and optional semantic/AI augmentation.

`ONTOLOGY.omi`
: Compact machine-readable-ish vocabulary of types, relations, and invariants.

`LEXICON.omi`
: Plain definitions for project-specific words.

`RULES.omi`
: Normative constraint layer. Treat this as the source for validity language.

`FRAMES.omi`
: Normative target for frame interpretation, resolution scaling, and future
  user-space opening.

`FRAME_ABI.md`
: Human-readable ABI for control-bound, header-scaled, plane-selected frames.

`RULES_GUIDE.md`
: Commentary on the rule syntax, modal operators, and Phase 1 subset.

`BOOT_MODEL.md`
: Current QEMU/GRUB/Multiboot2 boot flow, expected serial proof, and the
  `make qemu-foundation-test`, `make qemu-platform-test`, platform endian, and
  cross-architecture QEMU readiness witnesses.

`GRAPH_MEMORY_SPEC.md`
: Current memory layout, byte classes, image generation, and replay ABI.

`CONS_THEOREMS.md`
: Closure, replay, projection, and validity claims.

`IMPLEMENTATION-AUDIT-PHASES-20-29.md`
: Evidence matrix and verification log for the Phase 20-29 observer/projection
  stack.

`PHASE-30-OSI-PROJECTION-INTEGRATION-LAW.md`
: Integration law for treating OSI layers as non-causal projections over the
  Phase 28 bitwise kernel state.

`FOUNDATION-AUDIT-PRE-OS-OSI.md`
: Foundation proof that deterministic bitwise replay, pre-OS measurement, and
  OSI projections compose without creating a new authority path. Its primary
  witness is `make qemu-foundation-test`, which boots QEMU and validates exact
  runtime serial vectors. The full audit gate is `make full-test`, also exposed
  as `make foundation-proof`.

`PHASE-31-POLYFORM-BLOCK-RENDERING-API.md`
: Host observer API that materializes the Phase 28/29/30 foundation state as a
  deterministic polyform block and renders text, Braille, and SVG projections.

`PHASE-32-POLYFORM-BLOCK-AS-BOOT-ARTIFACT.md`
: QEMU boot witness that emits the canonical polyform block header and
  validates its witness on x86 and RISC-V.

`PHASE-33-QEMU-MODEL-REGISTRY.md`
: Booted QEMU serial witness for the Phase 32 canonical trailer/world model
  registry. It emits pinned `MODEL_REGISTRY_QEMU`, `MODEL_QEMU`, and
  `WORLD_QEMU` lines from a compiled observer-only table for later lazy
  user-space initialization.

`PHASE-34-LAZY-USERSPACE-INIT.md`
: Host-side user-space init witness that mounts Phase 33 registry receipts as
  lazy model/world handles without expansion, rendering, hot-plugging, or
  execution.

`PHASE-35-LAZY-PROJECTION-EVALUATOR.md`
: Host-side lazy projection witness that reports requested FS/GS/RS/US depth
  availability over mounted model/world handles without rendering or mutation.

`PHASE-36-MODEL-VFS-PROJECTION.md`
: Host-side VFS projection witness that resolves deterministic `/omi/...` paths
  to lazy model/world handles or demand-driven projection views.

`PHASE-37-HOTPLUG-MODEL-LOADER.md`
: Host-side hot-plug witness that validates OMI declaration text, computes a
  deterministic receipt, appends a user-space overlay handle, and exposes it
  through VFS/lazy projection without mutating the boot registry.

`PHASE-38-TIMED-SCANNABLE-MODEL-CARRIERS.md`
: Host-side carrier witness that validates Code16K, Aztec, MaxiCode, and
  BeeCode receipts, then routes declaration payloads through the Phase 37
  overlay loader.

`PHASE-39-POLYFORM-SVG-RENDERER.md`
: Host-side renderer witness that projects lazy model views into deterministic
  polyform traces and non-authoritative SVG strings without mutating handles,
  overlays, registries, or expansion counters.

`PHASE-40A-EVENT-MODELS.md`
: Host-side event model witness for source/target/relation/timing declarations
  and append-only event logs.

`PHASE-40B-INTENT-MODELS.md`
: Host-side intent model witness for legal projection request selection and
  event declaration production.

`PHASE-40C-TEXTURE-MODELS.md`
: Host-side texture model witness for deterministic material/pattern projection
  traces over model parts.

`PHASE-40D-DIAGRAM-TEMPLATES.md`
: Host-side diagram template witness for reusable visual proof grammars and
  deterministic diagram traces.

`PHASE-40E-DECLARATIVE-SURFACE-INTEGRATION.md`
: Host-side pre-application integration witness composing intent, event, VFS,
  lazy projection, texture, diagram, and render traces without an app model.

`PHASE-41-DECLARATIVE-APPLICATIONS.md`
: Host-side application model witness that composes existing declarative
  surfaces without introducing a new authority or eager evaluation path.

`PHASE-42-DECLARATIVE-DEVICE-MODELS.md`
: Host-side device model witness that represents display, keyboard, camera,
  network, and storage devices as declarations rather than imperative drivers.

`PHASE-43-QEMU-TCG-PORTABILITY-COURT.md`
: QEMU TCG proof court that forces `-accel tcg` and validates pinned
  foundation/model-registry serial vectors plus `VALID STATE` and `OMI HALT`.

`PHASE-44-OMI-PAGE-COURT.md`
: Host-side page court witness that classifies ROM/law, foundation, registry,
  user-space init, overlay, event log, render trace, and reserved MMIO regions.

`PHASE-54-OMI-POLYFORM-COORDINATE-LAW.md`
: Host-side polyform coordinate witness that maps canonical FS/GS/RS/US paths
  to deterministic x/y/z/w structural coordinates, validates the pinned
  Light Garden timing receipts, and treats overlays as non-authoritative
  projections.

`PHASE-54C-CANONICAL-BARCODE-MULTIGRAPH-SCOPE-LAW.md`
: Host-side multi-graph witness that keeps the canonical OMI-LISP graph as
  structural authority while allowing barcode carrier edges to share closure
  receipts, orientation, and scope labels as scannable projections.

`PHASE-55-DIAGRAM-RENDERER-ADAPTER-COURT.md`
: Host-side renderer adapter witness that projects Phase 53 diagram artifacts,
  Phase 54 coordinate metadata, and Phase 54C scope graph edges into
  deterministic SVG/DOT/HTML views without introducing renderer authority.

`PHASE-56-OMI-COMPOSER-INTERFACE-COURT.md`
: Host-side composer witness that combines source, graph, spatial polyform,
  barcode/template, inspector, import, export, and append-only proposal paths
  without making the UI authority.

`PHASE-57-POLYFORM-GPU-PROJECTION-COURT.md`
: Host-side GPU projection witness that converts coordinates, closures, scope
  edges, and composer scenes into deterministic command streams without
  requiring a GPU runtime.

`PHASE-58-WEBGL-RUNTIME-ADAPTER-COURT.md`
: Host-side WebGL runtime witness that converts GPU command streams into
  deterministic browser draw plans without requiring a WebGL context.

`PHASE-59A-WEBGL-CANVAS-PREVIEW-COURT.md`
: Host-side browser preview witness that accepts WebGL plans and produces
  deterministic canvas fallback records without requiring a real GPU
  context.

`PHASE-59B-OPENGL-ES-ADAPTER-COURT.md`
: Host-side OpenGL ES witness that converts GPU command streams into
  deterministic embedded/mobile draw plans without requiring a GLES context.

`PHASE-59C-OPENGL-DESKTOP-ADAPTER-COURT.md`
: Host-side OpenGL witness that converts GPU command streams into
  deterministic desktop draw plans without requiring an OpenGL context.

`PHASE-59D-GRAPHICS-BACKEND-EQUIVALENCE-COURT.md`
: Host-side equivalence witness that compares normalized WebGL, GLES, and
  OpenGL backend summaries for the same GPU command stream.

`PHASE-60-VISUAL-ARTIFACT-EXPORT-EQUIVALENCE-COURT.md`
: Host-side visual artifact equivalence witness that compares normalized OMI
  identity metadata across SVG, glTF, OBJ/MTL, WebGL, GLES, and OpenGL
  projections of the same composer scene.

`PHASE-61-OMI-COMPOSER-PACKAGE-COURT.md`
: Host-side package witness that bundles canonical source, logs, receipts,
  artifacts, plans, and equivalence summaries into a deterministic composer
  carrier.

`PHASE-62-COMPOSER-PACKAGE-SIGNING-TRUST-COURT.md`
: Host-side trust witness that attests to deterministic package receipts,
  signer metadata, and review status without changing package authority.

`PHASE-63-GEOMETRIC-RECONCILIATION-LAYER.md`
: Doctrine note that treats charts as bounded state-spaces, geometry as lawful
  transitions, and the lazy/greedy/static/animated views as one reconciled
  object across the 5040 court.

`PHASE-64-LAZY-GREEDY-VIEW-SWITCHER.md`
: Workbench runtime note that switches one declared object between the four
  Phase 63 projection modes without changing identity.

`PHASE-65-5040-STATE-ANIMATION-TIMELINE.md`
: Workbench runtime note that exposes the animated view as a deterministic
  5040-frame timeline with seek/next/previous/snapshot controls.

`PHASE-66-FRACTAL-SUBCHART-UNFOLDER.md`
: Workbench runtime note that exposes deterministic unfold/refold control for
  the same declared object across the vertex/subchart boundary.

`PHASE-67-CUBE-DIFFERENTIAL-AS-BARCODE-TEMPLATE.md`
: Workbench runtime note that exposes the six-ray cube witness as a
  switchable barcode template with lazy and greedy views.

`PHASE-68-BARCODE-TEMPLATE-COMPOSITION-COURT.md`
: Workbench runtime note that composes imported barcode templates and
  registry fixtures into a deterministic lazy/greedy composition gallery.

`PHASE-69-COMPOSITION-TRUST-BUNDLES.md`
: Workbench runtime note that seals barcode-template composition identity
  receipts with deterministic trust bundles while leaving projection state
  outside the trust anchor.

`PHASE-70-COMPOSITION-BUNDLE-COURT.md`
: Workbench runtime note that packages a barcode-template composition and its
  trust seal into a deterministic portable bundle.

`PHASE-71-SCOPED-STREAM-DECLARATION-COURT.md`
: Workbench runtime note that declares raw binary, character-encoded, endian,
  text direction, traversal, and presentation scopes inside a canonical
  stream.

`PHASE-72-SCOPED-STREAM-PROJECTION-COURT.md`
: Workbench runtime note that projects the declared stream into deterministic
  barcode and chart readouts.

`PHASE-73-MULTI-REGION-OVERLAY-PROJECTION.md`
: Workbench runtime note that resolves overlapping declared regions into a
  deterministic overlay stack.

`PHASE-74-OVERLAY-AS-PACKAGE-EXPORT.md`
: Workbench runtime note that packages declaration stacks with overlay
  projection receipts for portable import/export.

`PHASE-75-OMI-LISP-CANONICAL-DECLARATION-SURFACE.md`
: Workbench runtime note that adds canonical `.omilisp` declarations for the
  narrative world and Addr128 locator graph.

`LIGHT-GARDEN-240-PROJECTIVE-FRAME.md`
: Timing-law note that normalizes the 240 public frame, 60 local sweep, 16
  operator bank, 7 Fano selector, 8 byte cadence, and 5040 reconciliation
  period as the polyform projective frame doctrine.

`PHASE-45-MMIO-DEVICE-PROJECTION-COURT.md`
: Host-side MMIO device court that classifies display, keyboard, camera,
  network, storage, and timer roles as typed event/projection boundaries.

`PHASE-46A-HARDWARE-EVENT-PACKET-LAW.md`
: Host-side hardware event packet witness that encodes compact device packets,
  validates pinned timing receipts, computes deterministic receipt hashes, and
  projects packets into declarative event models.

`PHASE-46B-ESP32-EVENT-WITNESS-PROFILE.md`
: Host-side ESP32 witness profile that simulates low-power GPIO, carrier-scan,
  model-sync, timing-observe, and receipt-append packets over the Phase 46A
  packet law.

`PHASE-46C-OMI-WORLD-WORKBENCH.md`
: Static source-first workbench that projects canonical OMI-LISP declarations
  into an FS/GS/RS/US tree, ASCII plane inspector, relation graph, and
  polyform preview while preserving roundtrip structural counts.

`PHASE-47-INTERACTIVE-OMI-WORLD-WORKBENCH.md`
: Interactive workbench layer that adds pointer routing, Canvas/SVG/A-Frame
  projections, glTF and OBJ/MTL export metadata, and deterministic 2D/2.5D/3D
  polyform basis families.

`PHASE-48-WORKBENCH-EDIT-LOG.md`
: Append-only workbench edit-log layer that records proposals, commits,
  undo/redo events, deterministic replay reconstruction, and edit-log export
  receipts.

`PHASE-49-WORKBENCH-COLLABORATION-MERGE-COURT.md`
: Deterministic local merge layer for multiple append-only workbench edit logs,
  including explicit conflict records and replay-safe merged history.

`PHASE-50-WORKBENCH-SYNC-PACKET-COURT.md`
: Transport-neutral sync packet court for append-only edit-log segments,
  merged-log segments, conflict records, duplicate suppression, and explicit
  missing-segment requests.

`PHASE-51A-FILE-BASED-WORKBENCH-SYNC.md`
: File-based transport adapter for deterministic `.omi-sync.json` packet files
  and `.omi-synclog.json` ordered packet bundles applied through the Phase 50
  packet court.

`PHASE-51C-BARCODE-WORKBENCH-SYNC.md`
: Barcode carrier adapter that wraps validated Phase 50 sync packets in
  deterministic Code16K/Aztec/MaxiCode/BeeCode declarations and decodes them
  back through the packet court.

`PHASE-51D-ESP32-WORKBENCH-SYNC.md`
: ESP32 simulator-side carrier adapter that wraps validated Phase 50 sync
  packets in a Phase 46-style event witness envelope and decodes them back
  through the packet court.

`PHASE-52-LITERATE-ORG-TREESITTER-COURT.md`
: Literate collaboration/export court that emits deterministic Org bundles and
  supports property drawers, Babel block parsing, noweb/tangle composition,
  TRAMP carrier locators, and tree-sitter-style extraction bridges.

`PHASE-53-DIAGRAM-GRAPH-TEMPLATE-TANGLE-COURT.md`
: Deterministic diagram/graph artifact court that tangles canonical world
  relations and diagram template metadata into DOT, SVG placeholder, relations
  JSON, and Org index outputs.

`QEMU-TCG-MMU-OMI-MEMORY-LAW.md`
: Doctrine mapping QEMU software-MMU behavior to OMI address, memory, cache,
  dirty-page, and MMIO projection boundaries.

`PRECURSOR-REFERENCE-AUDIT.md`
: Reference boundary for `/root/omnicron` and `/root/omi-lisp`. These trees are
  historical sources for patterns and vectors, not authority for current OMI
  behavior.

## Source Of Truth

- For validity: use `RULES.omi`.
- For frame interpretation: use `FRAMES.omi` and `FRAME_ABI.md`.
- For byte layout: use `GRAPH_MEMORY_SPEC.md`.
- For boot behavior: use `BOOT_MODEL.md`.
- For terminology: use `LEXICON.omi`.
- For implementation coordination: use the repository-level `AGENTS.md`.

## Documentation Convention

The words `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, `MAY`, and `OPTIONAL`
are normative only when a document says it is using the `RULES.omi`/RFC 2119
meaning. Otherwise, prose is explanatory.
