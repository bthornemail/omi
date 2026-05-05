(function (root, factory) {
  const api = factory();
  root.OMICompositionScene = api;
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

  function createScene(id) {
    return {
      id: id || "composer.scene",
      components: [],
      relations: [],
      nextComponent: 1,
      nextRelation: 1
    };
  }

  function addComponent(scene, template, path) {
    const component = {
      id: "component." + scene.nextComponent++,
      path: path || template.omi_path || template.path || "component.proposed",
      carrier: template.carrier || "Code16K",
      scope: template.scope || "public.local",
      witness: template.witness || String(fnv1a(JSON.stringify(template || {})))
    };
    scene.components.push(component);
    return component;
  }

  function addRelation(scene, sourcePath, targetPath, relation) {
    const edge = {
      id: "relation." + scene.nextRelation++,
      source: sourcePath,
      target: targetPath,
      relation: relation || "related-to",
      witness: fnv1a([sourcePath, targetPath, relation || "related-to"].join("|"))
    };
    scene.relations.push(edge);
    return edge;
  }

  function receipt(scene) {
    return fnv1a(JSON.stringify({
      id: scene.id,
      components: scene.components,
      relations: scene.relations
    }));
  }

  return {
    createScene: createScene,
    addComponent: addComponent,
    addRelation: addRelation,
    receipt: receipt
  };
}));
