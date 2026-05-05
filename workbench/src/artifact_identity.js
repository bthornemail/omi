(function (root, factory) {
  const api = factory();
  root.OMIArtifactIdentity = api;
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

  function rootMetadata(sceneId, options) {
    const root = String(sceneId || "composer.scene");
    const scope = options && options.scope !== undefined ? String(options.scope) : "public.global";
    const carrier = options && options.carrier !== undefined ? options.carrier : 255;
    const coordinateReceipt = fnv1a(root + "|coordinate|" + scope + "|" + carrier);
    const closureReceipt = fnv1a(root + "|closure|" + scope + "|" + carrier);
    const witness = fnv1a(stableString({
      omi_path: root,
      coordinate_receipt: coordinateReceipt,
      closure_receipt: closureReceipt,
      scope: scope,
      carrier: carrier,
      projection_intent: "scene-root"
    }));
    return {
      scene_id: root,
      omi_path: root,
      coordinate_receipt: coordinateReceipt,
      closure_receipt: closureReceipt,
      scope: scope,
      carrier: carrier,
      witness: witness,
      projection_intent: "scene-root"
    };
  }

  function pathMetadata(path, sceneId, options) {
    const root = rootMetadata(sceneId, options);
    const omiPath = String(path || root.omi_path);
    const scope = options && options.scope !== undefined ? String(options.scope) : root.scope;
    const carrier = options && options.carrier !== undefined ? options.carrier : root.carrier;
    const coordinateReceipt = options && options.coordinate_receipt !== undefined
      ? options.coordinate_receipt
      : fnv1a(omiPath + "|coordinate|" + root.scene_id);
    const closureReceipt = options && options.closure_receipt !== undefined
      ? options.closure_receipt
      : fnv1a(omiPath + "|closure|" + coordinateReceipt + "|" + root.scene_id);
    const projectionIntent = options && options.projection_intent ? String(options.projection_intent) : "projection";
    const witness = options && options.witness !== undefined
      ? options.witness
      : fnv1a(stableString({
        scene_id: root.scene_id,
        omi_path: omiPath,
        coordinate_receipt: coordinateReceipt,
        closure_receipt: closureReceipt,
        scope: scope,
        carrier: carrier,
        projection_intent: projectionIntent
      }));

    return {
      scene_id: root.scene_id,
      omi_path: omiPath,
      coordinate_receipt: coordinateReceipt,
      closure_receipt: closureReceipt,
      scope: scope,
      carrier: carrier,
      witness: witness,
      projection_intent: projectionIntent
    };
  }

  return {
    fnv1a: fnv1a,
    stableString: stableString,
    rootMetadata: rootMetadata,
    pathMetadata: pathMetadata
  };
}));
