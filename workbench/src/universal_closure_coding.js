(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity
  );
  root.OMIUniversalClosureCoding = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (artifactIdentity) {
  "use strict";

  function fnv1a(text) {
    return artifactIdentity.fnv1a(String(text || ""));
  }

  function stableString(value) {
    return artifactIdentity.stableString(value);
  }

  function encodeClosure(options) {
    const closureLaw = String(options && options.closure_law || "unary");
    const payload = String(options && options.payload || "");
    const boundary = String(options && options.boundary || "self-delimiting");
    const consOrientation = String(options && options.cons_orientation || "car-cdr");
    const carrier = String(options && options.carrier || "character");
    const identityPayload = {
      closure_law: closureLaw,
      payload: payload,
      boundary: boundary,
      cons_orientation: consOrientation
    };
    const projectionPayload = Object.assign({}, identityPayload, {
      carrier: carrier,
      encoded: encodeCarrier(carrier, closureLaw, payload, boundary, consOrientation),
      authority: false
    });
    return {
      kind: "universal-closure-codeword",
      closure_law: closureLaw,
      payload: payload,
      boundary: boundary,
      cons_orientation: consOrientation,
      carrier: carrier,
      encoded: projectionPayload.encoded,
      identity_receipt: fnv1a(stableString(identityPayload)),
      projection_receipt: fnv1a(stableString(projectionPayload)),
      authority: false,
      carrier_authority: false
    };
  }

  function encodeCarrier(carrier, closureLaw, payload, boundary, consOrientation) {
    const source = [closureLaw, boundary, consOrientation, payload].join("|");
    if (carrier === "binary64") {
      return Buffer.from(source, "utf8").toString("base64");
    }
    if (carrier === "symbol") {
      return "<" + source.replace(/\|/g, "::") + ">";
    }
    if (carrier === "barcode") {
      return "BAR:" + fnv1a(source).toString(16).toUpperCase();
    }
    if (carrier === "raw-binary") {
      return Array.from(Buffer.from(source, "utf8")).map(function (byte) {
        return byte.toString(16).padStart(2, "0");
      }).join("");
    }
    if (carrier === "ecd" || carrier === "endian-variant") {
      return source.split("").reverse().join("");
    }
    return source;
  }

  function compareIsomorphism(left, right) {
    return {
      same_identity: left.identity_receipt === right.identity_receipt,
      same_projection: left.projection_receipt === right.projection_receipt,
      left_carrier: left.carrier,
      right_carrier: right.carrier,
      preserved: left.identity_receipt === right.identity_receipt && left.payload === right.payload,
      authority: false
    };
  }

  return {
    encodeClosure: encodeClosure,
    compareIsomorphism: compareIsomorphism
  };
}));
