(function (root, factory) {
  const api = factory();
  root.OMIGeometricReconciliation = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function fnv1a(text) {
    let hash = 2166136261;
    const data = String(text || "");
    for (let i = 0; i < data.length; i += 1) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function stableString(value) {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return "[" + value.map(stableString).join(",") + "]";
    }
    return "{" + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ":" + stableString(value[key]);
    }).join(",") + "}";
  }

  const VIEW_KEYS = Object.freeze({
    lazy: "lazy",
    greedy: "greedy",
    static: "static",
    animated: "animated"
  });

  const FRACTAL_LEVELS = Object.freeze({
    vertex: { name: "vertex", depth: 0, expands_to: "edge", role: "sealed address" },
    edge: { name: "edge", depth: 1, expands_to: "face", role: "lawful transition" },
    face: { name: "face", depth: 2, expands_to: "cell", role: "composed boundary" },
    cell: { name: "cell", depth: 3, expands_to: "subchart", role: "enclosed state volume" }
  });

  const TIMING = Object.freeze({
    local_sweep: 60,
    public_frame: 240,
    master_reconciliation: 5040,
    difference_classes: 6
  });

  const VIEW_DEFINITIONS = Object.freeze({
    lazy: {
      key: "lazy",
      alias: "barcode",
      declaration_surface: "sealed address",
      geometry_surface: "compact carrier",
      reconciliation_surface: "admissible enclosure",
      animation_surface: "closed packet",
      role: "lazy resolution",
      explains: "The barcode is the sealed address form of the declared object."
    },
    greedy: {
      key: "greedy",
      alias: "chart",
      declaration_surface: "unfolded geometry",
      geometry_surface: "state-space chart",
      reconciliation_surface: "expanded relation graph",
      animation_surface: "fully unfolded traversal",
      role: "greedy resolution",
      explains: "The chart is the unfolded geometry form of the same declared object."
    },
    static: {
      key: "static",
      alias: "reconciled",
      declaration_surface: "declared space",
      geometry_surface: "resolved agreement",
      reconciliation_surface: "identity proof",
      animation_surface: "stable frame",
      role: "reconciliation",
      explains: "Static view is the reconciled agreement of lazy and greedy views."
    },
    animated: {
      key: "animated",
      alias: "sexagesimal",
      declaration_surface: "rolling difference",
      geometry_surface: "frame-to-frame displacement",
      reconciliation_surface: "5040-state court",
      animation_surface: "sexagesimal sweep",
      role: "temporal reconciliation",
      explains: "Animated view is the sexagesimal rolling difference across reconciled frames."
    }
  });

  const TWO_CUBE_DIFFERENTIAL = Object.freeze({
    name: "two-cube-differential",
    origin: { x: 0, y: 0, z: 0 },
    difference_rays: Object.freeze([
      Object.freeze({ label: "1=√1", class: 1, vector: { x: 60, y: 60, z: 0 } }),
      Object.freeze({ label: "√2", class: 2, vector: { x: 100, y: 40, z: 0 } }),
      Object.freeze({ label: "√3", class: 3, vector: { x: 100, y: 0, z: 0 } }),
      Object.freeze({ label: "√4", class: 4, vector: { x: 70, y: -30, z: 0 } }),
      Object.freeze({ label: "√5", class: 5, vector: { x: 40, y: -60, z: 0 } }),
      Object.freeze({ label: "2=√4", class: 6, vector: { x: 0, y: -40, z: 0 } })
    ]),
    frame_labels: Object.freeze(["1=√1", "√2", "√3", "√6", "√5", "2=√4"]),
    rolling_sweep: TIMING.local_sweep,
    public_frame: TIMING.public_frame,
    master_reconciliation: TIMING.master_reconciliation
  });

  function normalizeViewName(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) {
      return "";
    }
    if (text === "barcode" || text === "sealed-address" || text === "sealed_address" || text === "compact" || text === "lazy") {
      return VIEW_KEYS.lazy;
    }
    if (text === "chart" || text === "unfolded" || text === "greedy") {
      return VIEW_KEYS.greedy;
    }
    if (text === "static" || text === "reconciled" || text === "reconciliation") {
      return VIEW_KEYS.static;
    }
    if (text === "animated" || text === "sexagesimal" || text === "rolling-difference") {
      return VIEW_KEYS.animated;
    }
    return text;
  }

  function describeView(value) {
    const key = normalizeViewName(value);
    const definition = VIEW_DEFINITIONS[key];
    if (!definition) {
      return null;
    }
    const witness = fnv1a(stableString(definition));
    return Object.assign({ witness: witness }, definition);
  }

  function describeResolution(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) {
      return null;
    }
    const record = FRACTAL_LEVELS[text];
    if (record) {
      return Object.assign({ witness: fnv1a(stableString(record)) }, record);
    }
    if (text === "subchart") {
      return {
        name: "subchart",
        depth: 4,
        expands_to: "chart",
        role: "recursive chart",
        witness: fnv1a("subchart|4|chart|recursive chart")
      };
    }
    return null;
  }

  function reconcileDeclaredObject(label, options) {
    const declared = String(label || (options && options.id) || "");
    const context = options && typeof options === "object" ? options : {};
    const identity = fnv1a(stableString({
      declared: declared,
      context: context.context || "",
      scene: context.scene || ""
    }));
    const views = {
      lazy: describeView("lazy"),
      greedy: describeView("greedy"),
      static: describeView("static"),
      animated: describeView("animated")
    };
    return {
      declared: declared,
      identity_receipt: identity,
      views: views,
      lazy_receipt: fnv1a(identity + "|lazy"),
      greedy_receipt: fnv1a(identity + "|greedy"),
      static_receipt: fnv1a(identity + "|static"),
      animated_receipt: fnv1a(identity + "|animated"),
      reconciliation_period: TIMING.master_reconciliation
    };
  }

  function normalizeRay(ray) {
    const label = String(ray && ray.label ? ray.label : "");
    const klass = Number(ray && ray.class !== undefined ? ray.class : 0);
    const vector = ray && ray.vector ? {
      x: Number(ray.vector.x || 0),
      y: Number(ray.vector.y || 0),
      z: Number(ray.vector.z || 0)
    } : { x: 0, y: 0, z: 0 };
    return {
      label: label,
      class: klass,
      vector: vector,
      witness: fnv1a(stableString({ label: label, class: klass, vector: vector }))
    };
  }

  function buildFrameDifferenceChart(spec) {
    const input = spec && typeof spec === "object" ? spec : {};
    const origin = input.origin && typeof input.origin === "object" ? {
      x: Number(input.origin.x || 0),
      y: Number(input.origin.y || 0),
      z: Number(input.origin.z || 0)
    } : { x: 0, y: 0, z: 0 };
    const rays = Array.isArray(input.difference_rays) ? input.difference_rays.map(normalizeRay) : [];
    if (rays.length !== TIMING.difference_classes) {
      throw new Error("frame-difference-ray-count");
    }
    const classes = rays.map(function (ray) { return ray.class; });
    const labels = rays.map(function (ray) { return ray.label; });
    const witness = fnv1a(stableString({
      name: String(input.name || TWO_CUBE_DIFFERENTIAL.name),
      origin: origin,
      rays: rays,
      rolling_sweep: Number(input.rolling_sweep || TIMING.local_sweep),
      public_frame: Number(input.public_frame || TIMING.public_frame),
      master_reconciliation: Number(input.master_reconciliation || TIMING.master_reconciliation)
    }));
    return {
      name: String(input.name || TWO_CUBE_DIFFERENTIAL.name),
      origin: origin,
      difference_rays: rays,
      difference_classes: classes,
      difference_labels: labels,
      difference_count: rays.length,
      rolling_sweep: Number(input.rolling_sweep || TIMING.local_sweep),
      public_frame: Number(input.public_frame || TIMING.public_frame),
      master_reconciliation: Number(input.master_reconciliation || TIMING.master_reconciliation),
      witness: witness
    };
  }

  function defaultTwoCubeDifferential() {
    return buildFrameDifferenceChart(TWO_CUBE_DIFFERENTIAL);
  }

  function consistentDeclaredObjectSummary(label, options) {
    const reconciliation = reconcileDeclaredObject(label, options);
    return {
      declared: reconciliation.declared,
      identity_receipt: reconciliation.identity_receipt,
      views: {
        lazy: reconciliation.views.lazy.key,
        greedy: reconciliation.views.greedy.key,
        static: reconciliation.views.static.key,
        animated: reconciliation.views.animated.key
      },
      view_receipts: {
        lazy: reconciliation.lazy_receipt,
        greedy: reconciliation.greedy_receipt,
        static: reconciliation.static_receipt,
        animated: reconciliation.animated_receipt
      },
      reconciliation_period: reconciliation.reconciliation_period
    };
  }

  return {
    VIEW_KEYS: VIEW_KEYS,
    TIMING: TIMING,
    FRACTAL_LEVELS: FRACTAL_LEVELS,
    TWO_CUBE_DIFFERENTIAL: TWO_CUBE_DIFFERENTIAL,
    normalizeViewName: normalizeViewName,
    describeView: describeView,
    describeResolution: describeResolution,
    reconcileDeclaredObject: reconcileDeclaredObject,
    consistentDeclaredObjectSummary: consistentDeclaredObjectSummary,
    buildFrameDifferenceChart: buildFrameDifferenceChart,
    defaultTwoCubeDifferential: defaultTwoCubeDifferential
  };
}));
