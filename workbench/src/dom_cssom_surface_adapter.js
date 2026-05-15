(function (root, factory) {
  const api = factory();
  root.OMIDomCssomSurfaceAdapter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SELECTOR_SETS = {
    boolean_metric: ["itf", "code39", "barycentric", "cartesian", "sexagesimal"],
    linear_vector: ["code93", "code128", "code16k", "codabar", "receipt"],
    matrix_projective: ["maxi", "aztec", "jabcode", "beetag", "canvas"]
  };

  const FIVE_TERM_TRANSITIONS = [
    { op: "bind", target: "coordinate", port: "0x0001", color: "#000001" },
    { op: "assign", target: "cell", port: "0x0010", color: "#000010" },
    { op: "join", target: "manifest", port: "0x0100", color: "#000100" },
    { op: "compose", target: "port-image", port: "0x1000", color: "#001000" },
    { op: "target", target: "expression", port: "0xffff", color: "#00ffff" },
    { op: "bind", target: "attribute", port: "0x0002", color: "#000002" },
    { op: "assign", target: "evaluation", port: "0x0020", color: "#000020" },
    { op: "join", target: "overlay", port: "0x0200", color: "#000200" },
    { op: "compose", target: "bitmap", port: "0x2000", color: "#002000" },
    { op: "target", target: "sign", port: "0xfffe", color: "#00fffe" }
  ];

  function fnv1a(text) {
    let hash = 2166136261;
    const data = String(text == null ? "" : text);
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

  function receiptFor(value) {
    return "fnv1a32:" + fnv1a(stableString(value)).toString(16).padStart(8, "0");
  }

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeHex(value, width) {
    if (value === undefined || value === null || value === "") {
      return width ? "0x" + "0".repeat(width) : "0x0";
    }
    const raw = String(value).trim().toLowerCase();
    let hex = raw.startsWith("0x") ? raw.slice(2) : raw;
    if (/^[0-9]+$/.test(hex) && !raw.startsWith("0x")) {
      hex = Number(hex).toString(16);
    }
    hex = hex.replace(/[^0-9a-f]/g, "");
    if (!hex) {
      hex = "0";
    }
    if (width) {
      hex = hex.padStart(width, "0").slice(-width);
    }
    return "0x" + hex;
  }

  function normalizePort(value) {
    const hex = normalizeHex(value == null ? "0xffff" : value, 4);
    return hex;
  }

  function normalizeColor(value, port) {
    if (value && /^#[0-9a-fA-F]{6}$/.test(String(value))) {
      return String(value).toLowerCase();
    }
    const portHex = normalizePort(port).slice(2);
    return "#" + portHex.padStart(6, "0").slice(-6);
  }

  function getAttr(source, dataKey, attrKey) {
    if (!source) {
      return undefined;
    }
    if (source[dataKey] !== undefined) {
      return source[dataKey];
    }
    if (source[attrKey] !== undefined) {
      return source[attrKey];
    }
    if (source.dataset && source.dataset[dataKey] !== undefined) {
      return source.dataset[dataKey];
    }
    if (typeof source.getAttribute === "function") {
      return source.getAttribute("data-omi-" + attrKey.replace(/^omi-?/, ""));
    }
    return undefined;
  }

  function decodeOmiSurface(source) {
    const path = getAttr(source, "omiPath", "omi-path") || getAttr(source, "path", "path") || "omi://surface/node";
    const car = normalizeHex(getAttr(source, "omiCar", "omi-car") || getAttr(source, "car", "car") || "0x20", 16);
    const cdr = normalizeHex(getAttr(source, "omiCdr", "omi-cdr") || getAttr(source, "cdr", "cdr") || "0x80", 32);
    const meta = normalizeHex(getAttr(source, "omiMeta", "omi-meta") || getAttr(source, "meta", "meta") || "0x0001", 16);
    const port = normalizePort(getAttr(source, "omiPort", "omi-port") || getAttr(source, "port", "port"));
    const color = normalizeColor(getAttr(source, "omiColor", "omi-color") || getAttr(source, "color", "color"), port);
    const coordinateReceipt = getAttr(source, "omiCoordinateReceipt", "omi-coordinate-receipt");
    const closureReceipt = getAttr(source, "omiClosureReceipt", "omi-closure-receipt");
    const witness = getAttr(source, "omiWitness", "omi-witness");

    return {
      path: String(path),
      car: car,
      cdr: cdr,
      meta: meta,
      port: port,
      color: color,
      coordinate_receipt: coordinateReceipt || receiptFor({ path: path, car: car, cdr: cdr, role: "coordinate" }),
      closure_receipt: closureReceipt || receiptFor({ path: path, meta: meta, port: port, role: "closure" }),
      witness: witness || receiptFor({ path: path, car: car, cdr: cdr, meta: meta, port: port })
    };
  }

  function dataAttributes(omi) {
    const decoded = decodeOmiSurface(omi);
    return {
      "data-omi-path": decoded.path,
      "data-omi-car": decoded.car,
      "data-omi-cdr": decoded.cdr,
      "data-omi-meta": decoded.meta,
      "data-omi-port": decoded.port,
      "data-omi-color": decoded.color,
      "data-omi-coordinate-receipt": decoded.coordinate_receipt,
      "data-omi-closure-receipt": decoded.closure_receipt,
      "data-omi-witness": decoded.witness,
      "data-omi-authority": "projection-only"
    };
  }

  function cssProjection(omi) {
    const decoded = decodeOmiSurface(omi);
    return {
      "--omi-fs": "block-start",
      "--omi-gs": "inline-end",
      "--omi-rs": "block-end",
      "--omi-us": "inline-start",
      "--omi-car": decoded.car,
      "--omi-cdr": decoded.cdr,
      "--omi-meta": decoded.meta,
      "--omi-port": decoded.port,
      "--omi-color": decoded.color,
      "--omi-coordinate-receipt": decoded.coordinate_receipt,
      "--omi-closure-receipt": decoded.closure_receipt,
      "--omi-witness": decoded.witness
    };
  }

  function buildSurfaceNode(omi, options) {
    const decoded = decodeOmiSurface(omi);
    const id = options && options.id ? String(options.id) : "omi-surface-" + fnv1a(decoded.path).toString(16);
    const node = {
      id: id,
      authority: "projection-only",
      kind: options && options.kind ? String(options.kind) : "dom-cssom-surface",
      omi: decoded,
      attributes: dataAttributes(decoded),
      style: cssProjection(decoded)
    };
    node.surface_receipt = receiptFor(node);
    return node;
  }

  function buildCanvasNode(omi, options) {
    const surface = buildSurfaceNode(omi, options);
    return {
      id: surface.id,
      type: "text",
      x: options && options.x !== undefined ? options.x : 0,
      y: options && options.y !== undefined ? options.y : 0,
      width: options && options.width !== undefined ? options.width : 320,
      height: options && options.height !== undefined ? options.height : 160,
      color: options && options.color !== undefined ? String(options.color) : "5",
      text: [
        "# OMI CONS Surface",
        "path: " + surface.omi.path,
        "car64: " + surface.omi.car,
        "cdr128: " + surface.omi.cdr,
        "meta64: " + surface.omi.meta,
        "port: " + surface.omi.port,
        "authority: projection-only"
      ].join("\n"),
      omi: {
        car: surface.omi.car,
        cdr: surface.omi.cdr,
        meta: surface.omi.meta,
        port: surface.omi.port,
        color: surface.omi.color,
        ports: {
          top: "FS",
          right: "GS",
          bottom: "RS",
          left: "US"
        },
        receipt: surface.surface_receipt
      }
    };
  }

  function attrsToString(attrs) {
    return Object.keys(attrs).sort().map(function (key) {
      return key + "=\"" + escapeHtml(attrs[key]) + "\"";
    }).join(" ");
  }

  function buildAFrameEntity(omi, options) {
    const surface = buildSurfaceNode(omi, options);
    const position = options && options.position ? String(options.position) : "0 0 0";
    const geometry = options && options.geometry ? String(options.geometry) : "primitive: box; width: 0.5; height: 0.5; depth: 0.5";
    const attrs = Object.assign({}, surface.attributes, {
      id: surface.id,
      position: position,
      geometry: geometry,
      material: "color: " + surface.omi.color
    });
    return "<a-entity " + attrsToString(attrs) + "></a-entity>";
  }

  function hexToIPv6(hexValue) {
    const hex = normalizeHex(hexValue, 32).slice(2);
    return hex.match(/.{1,4}/g).join(":");
  }

  function deriveDidDocument(omi, options) {
    const decoded = decodeOmiSurface(omi);
    const method = options && options.method ? String(options.method) : "omi";
    const did = "did:" + method + ":" + decoded.car.slice(2) + ":" + decoded.cdr.slice(2);
    return {
      "@context": ["https://www.w3.org/ns/did/v1"],
      id: did,
      alsoKnownAs: [decoded.path],
      verificationMethod: [{
        id: did + "#meta64",
        type: "OmiMeta64",
        controller: did,
        publicKeyMultibase: decoded.meta
      }],
      service: [{
        id: did + "#cons256",
        type: "OmiConsRuntime",
        serviceEndpoint: "ip6:" + hexToIPv6(decoded.cdr) + ":" + parseInt(decoded.port.slice(2), 16)
      }],
      omi: {
        car64: decoded.car,
        cdr128: decoded.cdr,
        meta64: decoded.meta,
        port: decoded.port,
        color: decoded.color,
        authority: "projection-only"
      }
    };
  }

  function buildFiveTermTransitionTable() {
    return FIVE_TERM_TRANSITIONS.map(function (row, index) {
      return Object.assign({
        index: index,
        receipt: receiptFor(row)
      }, row);
    });
  }

  function chooseTwo(set, offset) {
    const first = offset % set.length;
    const second = (first + 1) % set.length;
    return [set[first], set[second]];
  }

  function buildTwoOfFiveSelector(seed) {
    const numericSeed = fnv1a(seed == null ? "omi-selector" : seed);
    const booleanMetric = chooseTwo(SELECTOR_SETS.boolean_metric, numericSeed);
    const linearVector = chooseTwo(SELECTOR_SETS.linear_vector, numericSeed >>> 5);
    const matrixProjective = chooseTwo(SELECTOR_SETS.matrix_projective, numericSeed >>> 10);
    const activeScales = booleanMetric.concat(linearVector).concat(matrixProjective);
    return {
      mode: "two-of-five-nonagram",
      sets: SELECTOR_SETS,
      active: {
        boolean_metric: booleanMetric,
        linear_vector: linearVector,
        matrix_projective: matrixProjective
      },
      scales: activeScales,
      receipt: receiptFor(activeScales)
    };
  }

  function buildSurfaceBundle(omi, options) {
    const decoded = decodeOmiSurface(omi);
    const node = buildSurfaceNode(decoded, options);
    const bundle = {
      authority: "projection-only",
      node: node,
      canvas_node: buildCanvasNode(decoded, options),
      aframe_entity: buildAFrameEntity(decoded, options),
      did_document: deriveDidDocument(decoded, options),
      transitions: buildFiveTermTransitionTable(),
      selector: buildTwoOfFiveSelector(decoded.path + "|" + decoded.port)
    };
    bundle.bundle_receipt = receiptFor(bundle);
    return bundle;
  }

  return {
    fnv1a: fnv1a,
    stableString: stableString,
    receiptFor: receiptFor,
    normalizeHex: normalizeHex,
    decodeOmiSurface: decodeOmiSurface,
    dataAttributes: dataAttributes,
    cssProjection: cssProjection,
    buildSurfaceNode: buildSurfaceNode,
    buildCanvasNode: buildCanvasNode,
    buildAFrameEntity: buildAFrameEntity,
    deriveDidDocument: deriveDidDocument,
    buildFiveTermTransitionTable: buildFiveTermTransitionTable,
    buildTwoOfFiveSelector: buildTwoOfFiveSelector,
    buildSurfaceBundle: buildSurfaceBundle
  };
}));
