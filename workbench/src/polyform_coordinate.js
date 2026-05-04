(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./model_parser.js") : root.OMIModelParser
  );
  root.OMIPolyformCoordinate = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (modelParser) {
  "use strict";

  const TIMING = {
    master_5040: 5040,
    public_240: 240,
    local_60: 60,
    operator_16: 16,
    fano_7: 7,
    byte_8: 8
  };

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

  function hashField(text) {
    return fnv1a(String(text || ""));
  }

  function hashInt(value) {
    return fnv1a(String(value));
  }

  function validateTiming(timing) {
    return timing &&
      timing.master_5040 === TIMING.master_5040 &&
      timing.public_240 === TIMING.public_240 &&
      timing.local_60 === TIMING.local_60 &&
      timing.operator_16 === TIMING.operator_16 &&
      timing.fano_7 === TIMING.fano_7 &&
      timing.byte_8 === TIMING.byte_8;
  }

  function inferBasis(entry) {
    if (!entry) {
      return "polyform";
    }
    if (entry.plane === "US" && entry.us === "primitive") {
      return entry.value && entry.value.value ? entry.value.value : "polyform";
    }
    if (entry.plane === "RS" && entry.value && Array.isArray(entry.value.units)) {
      const primitive = entry.value.units.find(function (unit) {
        return unit.key === "primitive";
      });
      return primitive ? primitive.value : (entry.gs === "interactions" ? "relation" : "polyform");
    }
    if (entry.gs === "interactions") {
      return "relation";
    }
    return "polyform";
  }

  function inferDegree(entry) {
    if (!entry) {
      return "expression-cell";
    }
    if (entry.plane === "US") {
      return "unit";
    }
    if (entry.plane === "RS") {
      return entry.gs === "interactions" ? "edge" : "record";
    }
    if (entry.plane === "GS") {
      return "group";
    }
    return "root";
  }

  function inferSign(entry) {
    if (!entry) {
      return "structural";
    }
    if (entry.gs === "interactions") {
      return "relation-closure";
    }
    return "structural";
  }

  function receiptHash(block) {
    return fnv1a(stableString({
      omi_path: block.omi_path,
      fs: block.fs,
      gs: block.gs,
      rs: block.rs,
      us: block.us,
      x: block.x,
      y: block.y,
      z: block.z,
      w: block.w,
      basis: block.basis,
      degree: block.degree,
      sign: block.sign,
      depth: block.depth,
      timing: TIMING
    }));
  }

  function closureReceiptHash(closure) {
    return fnv1a(stableString({
      delta_x: closure.delta_x,
      delta_y: closure.delta_y,
      delta_z: closure.delta_z,
      delta_w: closure.delta_w,
      distance_squared: closure.distance_squared,
      distance_class: closure.distance_class,
      sexagesimal_slot: closure.sexagesimal_slot,
      orientation4: closure.orientation4,
      public_frame240: closure.public_frame240,
      sexagesimal_readout: closure.sexagesimal_readout
    }));
  }

  function reducedSignedDelta(from, to) {
    const left = Number(from || 0);
    const right = Number(to || 0);
    const distance = Math.abs(right - left);
    if (distance === 0) {
      return 0;
    }
    const reduced = 1 + ((distance - 1) % 2);
    return right > left ? reduced : -reduced;
  }

  function absInt(value) {
    return Math.abs(Number(value || 0));
  }

  function closureDistanceClass(dx, dy, dz, dw) {
    const magnitude = absInt(dx) + absInt(dy) + absInt(dz) + absInt(dw);
    if (magnitude === 0) {
      return 0;
    }
    return 1 + ((magnitude - 1) % 6);
  }

  function closureOrientation(dx, dy, dz, dw) {
    const deltas = [dx, dy, dz, dw].map(Number);
    let primary = 0;
    for (let i = 1; i < deltas.length; i += 1) {
      if (Math.abs(deltas[i]) > Math.abs(deltas[primary])) {
        primary = i;
      }
    }
    return (primary + (deltas[primary] < 0 ? 2 : 0)) % 4;
  }

  function fromLookupEntry(entry, options) {
    if (!entry || !entry.path || !entry.fs) {
      return null;
    }
    const block = {
      omi_path: entry.path,
      fs: entry.fs || "",
      gs: entry.gs || "",
      rs: entry.rs || "",
      us: entry.us || "",
      x: hashField(entry.fs || ""),
      y: hashField(entry.gs || ""),
      z: hashField(entry.rs || ""),
      w: entry.us ? hashField(entry.us) : 0,
      basis: options && options.basis ? options.basis : inferBasis(entry),
      degree: options && options.degree ? options.degree : inferDegree(entry),
      sign: options && options.sign ? options.sign : inferSign(entry),
      depth: options && options.depth ? options.depth : "inspect",
      timing: Object.assign({}, TIMING)
    };
    block.receipt_hash = receiptHash(block);
    return block;
  }

  function fromPath(document, path, options) {
    const entry = modelParser.resolvePath(document, path);
    return entry ? fromLookupEntry(entry, options) : null;
  }

  function applyOverlay(block, overlay) {
    if (!block || !validateTiming(block.timing)) {
      return null;
    }
    return Object.assign({}, block, {
      overlay: Object.assign({}, overlay || {}),
      receipt_hash: block.receipt_hash
    });
  }

  function consGeometry(car, cdr) {
    const source = Number(car);
    const target = Number(cdr);
    if (!(source > 0) || !(target > 0)) {
      return null;
    }
    const cons = Math.sqrt((source * source) + (target * target));
    return {
      car: source,
      cdr: target,
      cons: cons,
      tan_theta: target / source,
      cos_theta: source / cons,
      sin_theta: target / cons
    };
  }

  function closureFromBlocks(carBlock, cdrBlock) {
    if (!carBlock || !cdrBlock || !validateTiming(carBlock.timing) || !validateTiming(cdrBlock.timing)) {
      return null;
    }
    const closure = {
      delta_x: reducedSignedDelta(carBlock.x, cdrBlock.x),
      delta_y: reducedSignedDelta(carBlock.y, cdrBlock.y),
      delta_z: reducedSignedDelta(carBlock.z, cdrBlock.z),
      delta_w: reducedSignedDelta(carBlock.w, cdrBlock.w)
    };
    closure.distance_squared = closureDistanceClass(
      closure.delta_x,
      closure.delta_y,
      closure.delta_z,
      closure.delta_w
    );
    if (!closure.distance_squared) {
      return null;
    }
    closure.distance_class = closure.distance_squared;
    closure.sexagesimal_slot = (closure.distance_class * 10) % TIMING.local_60;
    closure.orientation4 = closureOrientation(
      closure.delta_x,
      closure.delta_y,
      closure.delta_z,
      closure.delta_w
    );
    closure.public_frame240 = (closure.orientation4 * TIMING.local_60) + closure.sexagesimal_slot;
    closure.sexagesimal_readout = String(closure.orientation4) + ":" + String(closure.sexagesimal_slot);
    closure.receipt_hash = closureReceiptHash(closure);
    return closure;
  }

  function validateClosure(closure) {
    if (!closure) {
      return false;
    }
    if (!(closure.distance_squared >= 1 && closure.distance_squared <= 6)) {
      return false;
    }
    if (closure.distance_class !== closure.distance_squared) {
      return false;
    }
    if (closure.sexagesimal_slot !== (closure.distance_class * 10) % TIMING.local_60) {
      return false;
    }
    if (!(closure.orientation4 >= 0 && closure.orientation4 <= 3)) {
      return false;
    }
    if (closure.public_frame240 !== (closure.orientation4 * TIMING.local_60) + closure.sexagesimal_slot) {
      return false;
    }
    if (!(closure.public_frame240 >= 0 && closure.public_frame240 < TIMING.public_240)) {
      return false;
    }
    if (
      closure.delta_x === 0 &&
      closure.delta_y === 0 &&
      closure.delta_z === 0 &&
      closure.delta_w === 0
    ) {
      return false;
    }
    if (closure.sexagesimal_readout !== String(closure.orientation4) + ":" + String(closure.sexagesimal_slot)) {
      return false;
    }
    return closure.receipt_hash === closureReceiptHash(closure);
  }

  function reverseClosure(closure) {
    if (!validateClosure(closure)) {
      return null;
    }
    const reversed = {
      delta_x: -closure.delta_x,
      delta_y: -closure.delta_y,
      delta_z: -closure.delta_z,
      delta_w: -closure.delta_w,
      distance_squared: closure.distance_squared,
      distance_class: closure.distance_class,
      sexagesimal_slot: closure.sexagesimal_slot,
      orientation4: (closure.orientation4 + 2) % 4
    };
    reversed.public_frame240 = (reversed.orientation4 * TIMING.local_60) + reversed.sexagesimal_slot;
    reversed.sexagesimal_readout = String(reversed.orientation4) + ":" + String(reversed.sexagesimal_slot);
    reversed.receipt_hash = closureReceiptHash(reversed);
    return reversed;
  }

  return {
    TIMING: TIMING,
    validateTiming: validateTiming,
    fromLookupEntry: fromLookupEntry,
    fromPath: fromPath,
    applyOverlay: applyOverlay,
    consGeometry: consGeometry,
    closureFromBlocks: closureFromBlocks,
    validateClosure: validateClosure,
    reverseClosure: reverseClosure
  };
}));
