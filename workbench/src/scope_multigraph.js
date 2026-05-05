(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./polyform_coordinate.js") : root.OMIPolyformCoordinate
  );
  root.OMIScopeMultigraph = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (polyformCoordinate) {
  "use strict";

  const VISIBILITY = {
    public: 0,
    private: 1,
    protected: 2
  };

  const LOCATION = {
    global: 0,
    local: 1,
    remote: 2
  };

  const CARRIER = {
    none: 255,
    Code16K: 0,
    Aztec: 1,
    MaxiCode: 2,
    BeeCode: 3
  };

  const EDGE_KIND = {
    canonical: 1,
    barcode: 2
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

  function encodeScope(visibility, location) {
    const visibilityName = Object.keys(VISIBILITY).find(function (key) {
      return VISIBILITY[key] === visibility;
    });
    const locationName = Object.keys(LOCATION).find(function (key) {
      return LOCATION[key] === location;
    });
    return visibilityName && locationName ? visibilityName + "." + locationName : null;
  }

  function decodeScope(scopeClass) {
    const parts = String(scopeClass || "").split(".");
    if (parts.length !== 2) {
      return null;
    }
    if (!(parts[0] in VISIBILITY) || !(parts[1] in LOCATION)) {
      return null;
    }
    return {
      visibility: VISIBILITY[parts[0]],
      location: LOCATION[parts[1]]
    };
  }

  function edgeReceipt(edge) {
    return fnv1a(stableString({
      from_coord_receipt: edge.from_coord_receipt,
      to_coord_receipt: edge.to_coord_receipt,
      closure_receipt: edge.closure_receipt,
      edge_kind: edge.edge_kind,
      visibility: edge.visibility,
      location: edge.location,
      carrier: edge.carrier,
      orientation4: edge.orientation4,
      sexagesimal_slot: edge.sexagesimal_slot,
      public_frame240: edge.public_frame240,
      scope_class: edge.scope_class
    }));
  }

  function buildEdge(kind, fromBlock, toBlock, closure, visibility, location, carrier) {
    const scopeClass = encodeScope(visibility, location);
    if (!fromBlock || !toBlock || !polyformCoordinate.validateClosure(closure) || !scopeClass) {
      return null;
    }
    if (kind === EDGE_KIND.barcode) {
      if (carrier !== closure.orientation4) {
        return null;
      }
    }
    if (kind === EDGE_KIND.canonical) {
      carrier = CARRIER.none;
    }
    const edge = {
      from_coord_receipt: fromBlock.receipt_hash,
      to_coord_receipt: toBlock.receipt_hash,
      closure_receipt: closure.receipt_hash,
      edge_kind: kind,
      visibility: visibility,
      location: location,
      carrier: carrier,
      orientation4: closure.orientation4,
      sexagesimal_slot: closure.sexagesimal_slot,
      public_frame240: closure.public_frame240,
      scope_class: scopeClass
    };
    edge.receipt = edgeReceipt(edge);
    return edge;
  }

  function canonicalEdge(fromBlock, toBlock, closure, visibility, location) {
    return buildEdge(EDGE_KIND.canonical, fromBlock, toBlock, closure, visibility, location, CARRIER.none);
  }

  function barcodeEdge(fromBlock, toBlock, closure, visibility, location, carrier) {
    return buildEdge(EDGE_KIND.barcode, fromBlock, toBlock, closure, visibility, location, carrier);
  }

  function validateEdge(edge) {
    const decoded = decodeScope(edge && edge.scope_class);
    if (!edge || !decoded) {
      return false;
    }
    if (decoded.visibility !== edge.visibility || decoded.location !== edge.location) {
      return false;
    }
    if (!(edge.public_frame240 >= 0 && edge.public_frame240 < polyformCoordinate.TIMING.public_240)) {
      return false;
    }
    if (!(edge.sexagesimal_slot >= 0 && edge.sexagesimal_slot < polyformCoordinate.TIMING.local_60)) {
      return false;
    }
    if (edge.public_frame240 !== (edge.orientation4 * polyformCoordinate.TIMING.local_60) + edge.sexagesimal_slot) {
      return false;
    }
    if (edge.edge_kind === EDGE_KIND.canonical) {
      if (edge.carrier !== CARRIER.none) {
        return false;
      }
    } else if (edge.edge_kind === EDGE_KIND.barcode) {
      if (edge.carrier !== edge.orientation4) {
        return false;
      }
    } else {
      return false;
    }
    return edge.receipt === edgeReceipt(edge);
  }

  return {
    VISIBILITY: VISIBILITY,
    LOCATION: LOCATION,
    CARRIER: CARRIER,
    EDGE_KIND: EDGE_KIND,
    encodeScope: encodeScope,
    decodeScope: decodeScope,
    canonicalEdge: canonicalEdge,
    barcodeEdge: barcodeEdge,
    validateEdge: validateEdge
  };
}));
