# Phase 101 - Autonomous World Live Renderer

Phase 101 adds the first live-renderer court for autonomous worlds. It is
render-plan first: the court emits deterministic render and animation plans over
the admitted world exposed by Phase 100, but it does not create pixels, open a
browser, or mutate world authority.

Locked rule:

> **The live renderer may animate and display an admitted world, but it cannot become the world.**

Locked phrase:

> **Phase 101 gives the admitted world a deterministic renderable body, but the body remains projection — not authority.**

## Boundary

The phase ladder is:

```text
Phase 99  = build/admit world state
Phase 100 = open/traverse/project admitted world state
Phase 101 = render/animate admitted world projections
```

The renderer consumes admitted world structure through the browser surface. It
may construct object paths, relation paths, S-P-O-M paths, camera settings, view
modes, and timeline frames. None of those surfaces becomes authority.

```text
renderer != authority
render plan != world state
animation != mutation
camera/view/timeline != identity
admitted declaration + receipts = authority
```

## Render Plan

A render plan is a deterministic projection body:

```json
{
  "world_id": "world.autonomous-fixture",
  "identity_receipt": "...",
  "render_receipt": "...",
  "view_mode": "greedy",
  "camera": { "mode": "orthographic", "target": "world.root" },
  "timeline": { "frame": 0, "period": 5040 },
  "objects": [],
  "relations": [],
  "spom_paths": [],
  "receipts": {}
}
```

The `identity_receipt` comes from the admitted world snapshot. The
`render_receipt` is a projection witness over the chosen view mode, camera,
timeline, object paths, relation paths, S-P-O-M paths, and visible package /
closure / raw-binary receipts.

## Animation Plan

An animation plan is a sequence of render-plan frame witnesses. Timeline
movement changes render and animation receipts, but it does not change admitted
world identity.

```text
same admitted world + same render settings
-> same render plan receipt

same admitted world + same animation settings
-> same animation plan receipt

camera/view/timeline change
-> changed render/view receipt only

changed admitted world
-> changed identity receipt
```

## Non-Goals

Phase 101 does not add:

- DOM runtime
- Electron shell
- Canvas drawing
- WebGL runtime
- Playwright smoke test
- real-time app loop
- editor mutation path

Those can arrive later as renderer adapters. Phase 101 only gives the admitted
world a deterministic, receipt-verifiable renderable body.
