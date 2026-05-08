(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./barcode_template.js") : root.OMIBarcodeTemplate,
    typeof require === "function" ? require("./composition_scene.js") : root.OMICompositionScene,
    typeof require === "function" ? require("./composition_trust.js") : root.OMICompositionTrust
  );
  root.OMIBarcodeTemplateComposition = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (barcodeTemplate, compositionScene, compositionTrust) {
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

  function escapeXml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function normalizedFixture(input) {
    const fixture = input || {};
    const path = fixture.omi_path || fixture.template_id || fixture.id || fixture.path || "template.proposed";
    const carrier = fixture.carrier || "Code16K";
    const scope = fixture.scope || "public.local";
    const witness = fixture.witness || String(fnv1a([path, carrier, scope, fixture.family || "fixture"].join("|")));
    return {
      format: fixture.format || "diagram-fixture",
      id: fixture.id || path,
      family: fixture.family || fixture.role || "composition-fixture",
      template_id: fixture.template_id || path,
      omi_path: path,
      carrier: carrier,
      scope: scope,
      witness: witness,
      source_receipt: fixture.source_receipt || fnv1a([path, carrier, scope, witness].join("|")),
      source: fixture.source || fixture.template_id || path
    };
  }

  function normalizeTemplate(input) {
    if (!input) {
      return null;
    }
    if (typeof input === "string") {
      return barcodeTemplate.fromSvg(input) || null;
    }
    if (input.format === "omi-svg-template") {
      return {
        format: input.format,
        omi_path: input.omi_path,
        carrier: input.carrier,
        scope: input.scope,
        witness: input.witness,
        coordinate_receipt: input.coordinate_receipt,
        closure_receipt: input.closure_receipt,
        source_receipt: input.source_receipt || fnv1a(JSON.stringify(input))
      };
    }
    if (input.template_id || input.family || input.role) {
      return normalizedFixture(input);
    }
    return normalizedFixture({
      omi_path: input.omi_path || input.path,
      carrier: input.carrier,
      scope: input.scope,
      witness: input.witness,
      source_receipt: input.source_receipt
    });
  }

  function summarizeTemplate(component) {
    return {
      id: component.id,
      path: component.path,
      carrier: component.carrier,
      scope: component.scope,
      witness: component.witness,
      source_receipt: component.source_receipt,
      format: component.format,
      family: component.family,
      template_id: component.template_id
    };
  }

  function createBarcodeTemplateComposition(root, options) {
    const rootId = root && (root.omi_path || root.id || root.path) ? (root.omi_path || root.id || root.path) : "barcode.template.composition";
    const scene = compositionScene.createScene(rootId);
    let mode = options && options.mode ? String(options.mode) : "lazy";
    let trustBundle = options && options.trustBundle ? options.trustBundle : null;
    const sealed = {
      path: rootId,
      kind: "barcode-template-composition",
      witness: String(fnv1a([rootId, "sealed"].join("|")))
    };

    function identityReceipt() {
      return compositionScene.receipt(scene);
    }

    function viewReceipt() {
      return fnv1a([identityReceipt(), mode].join("|"));
    }

    function trustStatus() {
      return compositionTrust.reportTrust(identityReceipt(), trustBundle);
    }

    function setTrustBundle(bundle) {
      const validated = compositionTrust.validateTrustBundle(identityReceipt(), bundle);
      if (!validated.ok) {
        throw new Error(validated.error);
      }
      trustBundle = validated.bundle;
      return trustStatus();
    }

    function seal(signerFixtures) {
      trustBundle = compositionTrust.buildTrustBundle(identityReceipt(), signerFixtures);
      return trustStatus();
    }

    function chartWitness() {
      return fnv1a(JSON.stringify({
        id: scene.id,
        template_count: scene.components.length,
        relation_count: scene.relations.length,
        mode: mode,
        templates: scene.components.map(summarizeTemplate),
        relations: scene.relations
      }));
    }

    function addTemplate(template, proposedPath) {
      const normalized = normalizeTemplate(template);
      if (!normalized) {
        return null;
      }
      const component = compositionScene.addComponent(scene, normalized, proposedPath || normalized.omi_path);
      component.format = normalized.format;
      component.family = normalized.family;
      component.template_id = normalized.template_id;
      component.source_receipt = normalized.source_receipt;
      component.template = normalized;
      return component;
    }

    function connect(sourcePath, targetPath, relation) {
      return compositionScene.addRelation(scene, sourcePath, targetPath, relation || "composed-with");
    }

    function setMode(nextMode) {
      const normalized = String(nextMode || "").toLowerCase();
      if (normalized !== "lazy" && normalized !== "greedy") {
        throw new Error("unsupported composition mode: " + nextMode);
      }
      mode = normalized;
      return snapshot();
    }

    function toggle() {
      return setMode(mode === "lazy" ? "greedy" : "lazy");
    }

    function renderSvg() {
      const lines = [];
      lines.push(
        '<svg xmlns="http://www.w3.org/2000/svg" data-omi-path="' + escapeXml(rootId) + '" data-omi-view="' + escapeXml(mode) + '" data-omi-template-count="' + scene.components.length + '" data-omi-relation-count="' + scene.relations.length + '" data-omi-identity-receipt="' + identityReceipt() + '" data-omi-view-receipt="' + viewReceipt() + '" data-omi-witness="' + chartWitness() + '"' + (
          trustStatus().ok ? ' data-omi-trust-receipt="' + trustStatus().trust_receipt + '" data-omi-review-status="' + escapeXml(trustStatus().review_status) + '"' : ''
        ) + '>'
      );
      lines.push('  <g data-omi-kind="composition-root" data-omi-path="' + escapeXml(rootId) + '"></g>');
      scene.components.forEach(function (component, index) {
        lines.push(
          '  <g data-omi-kind="template" data-omi-index="' + index + '" data-omi-path="' + escapeXml(component.path) + '" data-omi-carrier="' + escapeXml(component.carrier) + '" data-omi-scope="' + escapeXml(component.scope) + '" data-omi-witness="' + escapeXml(component.witness) + '" data-omi-source-receipt="' + escapeXml(component.source_receipt || "") + '">' +
          '<text x="12" y="' + (20 + (index * 18)) + '">' + escapeXml(component.path) + '</text></g>'
        );
      });
      scene.relations.forEach(function (relation, index) {
        lines.push(
          '  <line data-omi-kind="template-relation" data-omi-index="' + index + '" data-omi-path="' + escapeXml(relation.id) + '" data-omi-source="' + escapeXml(relation.source) + '" data-omi-target="' + escapeXml(relation.target) + '" data-omi-relation="' + escapeXml(relation.relation) + '" data-omi-witness="' + escapeXml(relation.witness) + '" />'
        );
      });
      if (mode === "greedy") {
        lines.push('  <metadata data-omi-view="greedy" data-omi-chart-witness="' + chartWitness() + '"></metadata>');
      }
      lines.push("</svg>");
      return lines.join("\n");
    }

    function snapshot() {
      const templates = scene.components.map(summarizeTemplate);
      const relations = scene.relations.map(function (relation) {
        return {
          id: relation.id,
          source: relation.source,
          target: relation.target,
          relation: relation.relation,
          witness: relation.witness
        };
      });
      const templateFamilies = templates.reduce(function (list, template) {
        if (template.family && list.indexOf(template.family) === -1) {
          list.push(template.family);
        }
        return list;
      }, []);
      return {
        composition_id: scene.id,
        mode: mode,
        sealed_address: sealed,
        identity_receipt: identityReceipt(),
        view_receipt: viewReceipt(),
        trust: trustStatus(),
        witness: chartWitness(),
        chart: {
          template_count: templates.length,
          relation_count: relations.length,
          families: templateFamilies,
          origin: rootId,
          difference: templates.length > 0 ? templates[0].path : rootId
        },
        templates: templates,
        relations: relations,
        svg: renderSvg()
      };
    }

    return {
      id: rootId,
      scene: scene,
      sealedAddress: function () { return sealed; },
      addTemplate: addTemplate,
      connect: connect,
      setMode: setMode,
      toggle: toggle,
      snapshot: snapshot,
      identityReceipt: identityReceipt,
      chartWitness: chartWitness,
      trustStatus: trustStatus,
      setTrustBundle: setTrustBundle,
      seal: seal,
      svg: renderSvg
    };
  }

  function composeTemplates(templates, options) {
    const composition = createBarcodeTemplateComposition({
      omi_path: options && options.composition_id ? options.composition_id : "barcode.template.composition"
    }, options || {});
    const entries = Array.isArray(templates) ? templates : [];
    const paths = options && Array.isArray(options.paths) ? options.paths : [];
    entries.forEach(function (template, index) {
      composition.addTemplate(template, paths[index]);
      if (options && options.chain !== false && index > 0) {
        const previous = composition.scene.components[index - 1];
        const current = composition.scene.components[index];
        composition.connect(previous.path, current.path, options.relation || "composed-with");
      }
    });
    return composition;
  }

  return {
    createBarcodeTemplateComposition: createBarcodeTemplateComposition,
    composeTemplates: composeTemplates,
    normalizeTemplate: normalizeTemplate,
    normalizedFixture: normalizedFixture
  };
}));
