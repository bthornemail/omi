(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./omilisp_declaration.js") : root.OMIOmilispDeclaration,
    typeof require === "function" ? require("./model_parser.js") : root.OMIModelParser,
    typeof require === "function" ? require("./stream_declaration.js") : root.OMIStreamDeclaration
  );
  root.OMISPOMAdapter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  omilispDeclaration,
  modelParser,
  streamDeclaration
) {
  "use strict";

  const RESERVED_KEYS = {
    name: true,
    root: true,
    sections: true,
    declaration: true,
    source: true,
    identity_receipt: true,
    projection_receipt: true,
    package_receipt: true,
    view_receipt: true,
    receipts: true,
    value: true,
    values: true
  };

  function fnv1a(text) {
    return artifactIdentity.fnv1a(String(text || ""));
  }

  function stableString(value) {
    return artifactIdentity.stableString(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isScalar(value) {
    return value === null || value === undefined || typeof value !== "object";
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeMode(mode) {
    const value = String(mode || "lazy");
    if (value === "lazy" || value === "barcode") {
      return "lazy";
    }
    if (value === "greedy" || value === "chart") {
      return "greedy";
    }
    if (value === "static" || value === "animated") {
      return value;
    }
    return null;
  }

  function bandOfText(text) {
    const value = String(text || "");
    if (!value) {
      return "control";
    }
    return streamDeclaration.classifyCodepoint(value.charCodeAt(0)).band;
  }

  function normalizeAtom(value) {
    if (Array.isArray(value)) {
      return value.map(normalizeAtom);
    }
    if (isScalar(value)) {
      return value;
    }
    if (Object.prototype.hasOwnProperty.call(value, "value") && isScalar(value.value)) {
      return value.value;
    }
    if (Object.prototype.hasOwnProperty.call(value, "values") && Array.isArray(value.values) && value.values.every(isScalar)) {
      return value.values.map(normalizeAtom);
    }
    return stableString(value);
  }

  function leafValue(node) {
    if (!node || typeof node !== "object") {
      return node;
    }
    if (Object.prototype.hasOwnProperty.call(node, "value") && isScalar(node.value)) {
      return node.value;
    }
    if (Object.prototype.hasOwnProperty.call(node, "values") && Array.isArray(node.values) && node.values.every(isScalar)) {
      return node.values.map(normalizeAtom);
    }
    return null;
  }

  function childKeys(node) {
    if (!isObject(node)) {
      return [];
    }
    return Object.keys(node).filter(function (key) {
      return !RESERVED_KEYS[key];
    });
  }

  function resolveAnchor(node, fallback) {
    if (!node || typeof node !== "object") {
      return fallback;
    }
    const priority = ["sid", "addr", "id", "path", "title"];
    for (let i = 0; i < priority.length; i += 1) {
      const key = priority[i];
      const child = node[key];
      if (child && typeof child === "object" && Object.prototype.hasOwnProperty.call(child, "value") && isScalar(child.value)) {
        return child.value;
      }
      if (child && typeof child === "object" && Array.isArray(child.values) && child.values.length > 0 && child.values.every(isScalar)) {
        return child.values[0];
      }
      if (isScalar(child) && child !== null && child !== undefined) {
        return child;
      }
    }
    if (Object.prototype.hasOwnProperty.call(node, "name") && isScalar(node.name) && node.name) {
      return node.name;
    }
    if (Object.prototype.hasOwnProperty.call(node, "value") && isScalar(node.value)) {
      return node.value;
    }
    if (Object.prototype.hasOwnProperty.call(node, "values") && Array.isArray(node.values) && node.values.length > 0) {
      return node.values[0];
    }
    return fallback;
  }

  function normalizeStreamDeclaration(input, options) {
    if (typeof input === "string") {
      return streamDeclaration.createStreamDeclaration(input, options || {}).snapshot();
    }
    if (input && typeof input.snapshot === "function") {
      return input.snapshot();
    }
    if (input && typeof input === "object" && Array.isArray(input.regions) && Object.prototype.hasOwnProperty.call(input, "identity_receipt")) {
      return input;
    }
    return null;
  }

  function simplifyTriplet(triplet) {
    return {
      subject: triplet.subject,
      predicate: triplet.predicate,
      object: clone(triplet.object),
      coordinates: clone(triplet.coordinates),
      modality: {
        source_kind: triplet.modality.source_kind,
        authority: triplet.modality.authority,
        scope: triplet.modality.scope,
        evidence: triplet.modality.evidence,
        kind: triplet.modality.kind,
        section: triplet.modality.section,
        path: triplet.modality.path,
        view: triplet.modality.view,
        hearing: clone(triplet.modality.hearing)
      }
    };
  }

  function createModality(details) {
    return {
      source_kind: details.source_kind,
      authority: details.authority,
      scope: details.scope,
      evidence: details.evidence,
      kind: details.kind,
      section: details.section,
      path: details.path,
      view: details.view,
      hearing: {
        subject_band: bandOfText(details.subject),
        predicate_band: bandOfText(details.predicate),
        object_band: bandOfText(isScalar(details.object) ? details.object : stableString(details.object)),
        modality_band: bandOfText(details.scope || details.section || details.evidence || details.kind || details.view)
      }
    };
  }

  function emitTriplet(triplets, details) {
    const coordinates = {
      fs: details.fs,
      gs: details.gs,
      rs: details.rs,
      us: details.us
    };
    const modality = createModality({
      subject: details.subject,
      predicate: details.predicate,
      object: details.object,
      source_kind: details.source_kind,
      authority: details.authority,
      scope: details.scope,
      evidence: details.evidence,
      kind: details.kind,
      section: details.section,
      path: details.path,
      view: details.view
    });
    const triplet = {
      subject: String(details.subject),
      predicate: String(details.predicate),
      object: normalizeAtom(details.object),
      coordinates: coordinates,
      modality: modality
    };
    triplet.receipt = fnv1a(stableString(simplifyTriplet(triplet)));
    triplets.push(triplet);
    return triplet;
  }

  function walkNode(node, context) {
    const subject = resolveAnchor(node, context.subject);
    childKeys(node).forEach(function (key) {
      const child = node[key];
      const nextPath = context.path.concat(key);

      if (Array.isArray(child)) {
        if (child.every(isScalar)) {
          emitTriplet(context.triplets, {
            subject: subject,
            predicate: key,
            object: child,
            fs: context.fs,
            gs: context.gs,
            rs: subject,
            us: key,
            source_kind: context.source_kind,
            authority: context.authority,
            scope: context.scope,
            evidence: "field",
            kind: "field",
            section: context.section,
            path: nextPath.join("/"),
            view: context.view
          });
          return;
        }

        child.forEach(function (item, index) {
          if (!item || typeof item !== "object") {
            emitTriplet(context.triplets, {
              subject: subject,
              predicate: key,
              object: item,
              fs: context.fs,
              gs: context.gs,
              rs: subject,
              us: key,
              source_kind: context.source_kind,
              authority: context.authority,
              scope: context.scope,
              evidence: "field",
              kind: "field",
              section: context.section,
              path: nextPath.concat(String(index)).join("/"),
              view: context.view
            });
            return;
          }

          const childAnchor = resolveAnchor(item, key);
          emitTriplet(context.triplets, {
            subject: subject,
            predicate: "record",
            object: childAnchor,
            fs: context.fs,
            gs: context.gs,
            rs: childAnchor,
            us: key,
            source_kind: context.source_kind,
            authority: context.authority,
            scope: context.scope,
            evidence: "record",
            kind: "record",
            section: context.section,
            path: nextPath.concat(String(index)).join("/"),
            view: context.view
          });
          walkNode(item, {
            triplets: context.triplets,
            root: context.root,
            subject: childAnchor,
            fs: context.fs,
            gs: context.gs,
            rs: childAnchor,
            scope: context.scope,
            source_kind: context.source_kind,
            authority: context.authority,
            section: context.section,
            path: nextPath.concat(String(index)),
            view: context.view
          });
        });
        return;
      }

      if (child && typeof child === "object") {
        if (Object.prototype.hasOwnProperty.call(child, "value") && isScalar(child.value)) {
          emitTriplet(context.triplets, {
            subject: subject,
            predicate: key,
            object: child.value,
            fs: context.fs,
            gs: context.gs,
            rs: subject,
            us: key,
            source_kind: context.source_kind,
            authority: context.authority,
            scope: context.scope,
            evidence: "field",
            kind: "field",
            section: context.section,
            path: nextPath.join("/"),
            view: context.view
          });
          return;
        }

        if (Object.prototype.hasOwnProperty.call(child, "values") && Array.isArray(child.values) && child.values.every(isScalar) && childKeys(child).length === 0) {
          emitTriplet(context.triplets, {
            subject: subject,
            predicate: key,
            object: child.values.map(normalizeAtom),
            fs: context.fs,
            gs: context.gs,
            rs: subject,
            us: key,
            source_kind: context.source_kind,
            authority: context.authority,
            scope: context.scope,
            evidence: "field",
            kind: "field",
            section: context.section,
            path: nextPath.join("/"),
            view: context.view
          });
          return;
        }

        const childAnchor = resolveAnchor(child, key);
        emitTriplet(context.triplets, {
          subject: subject,
          predicate: "record",
          object: childAnchor,
          fs: context.fs,
          gs: context.gs,
          rs: childAnchor,
          us: key,
          source_kind: context.source_kind,
          authority: context.authority,
          scope: context.scope,
          evidence: "record",
          kind: "record",
          section: context.section,
          path: nextPath.join("/"),
          view: context.view
        });
        walkNode(child, {
          triplets: context.triplets,
          root: context.root,
          subject: childAnchor,
          fs: context.fs,
          gs: context.gs,
          rs: childAnchor,
          scope: context.scope,
          source_kind: context.source_kind,
          authority: context.authority,
          section: context.section,
          path: nextPath,
          view: context.view
        });
        return;
      }

      emitTriplet(context.triplets, {
        subject: subject,
        predicate: key,
        object: child,
        fs: context.fs,
        gs: context.gs,
        rs: subject,
        us: key,
        source_kind: context.source_kind,
        authority: context.authority,
        scope: context.scope,
        evidence: "field",
        kind: "field",
        section: context.section,
        path: nextPath.join("/"),
        view: context.view
      });
    });
  }

  function summarizeTriplets(triplets, base) {
    const subjects = new Set();
    const predicates = new Set();
    const objects = new Set();
    const planeCounts = { FS: 0, GS: 0, RS: 0, US: 0 };
    triplets.forEach(function (triplet) {
      subjects.add(String(triplet.subject));
      predicates.add(String(triplet.predicate));
      objects.add(stableString(triplet.object));
      if (triplet.coordinates) {
        if (triplet.coordinates.fs !== undefined) planeCounts.FS += 1;
        if (triplet.coordinates.gs !== undefined) planeCounts.GS += 1;
        if (triplet.coordinates.rs !== undefined) planeCounts.RS += 1;
        if (triplet.coordinates.us !== undefined) planeCounts.US += 1;
      }
    });
    const summary = Object.assign({
      triplet_count: triplets.length,
      subject_count: subjects.size,
      predicate_count: predicates.size,
      object_count: objects.size,
      plane_counts: planeCounts,
      projection_modes: ["lazy", "greedy", "static", "animated"]
    }, base || {});
    return summary;
  }

  function createTriangulation(sourceKind, root, scopeLabel, source, triplets, summaryBase) {
    const summary = summarizeTriplets(triplets, summaryBase);
    const identityReceipt = fnv1a(stableString({
      source_kind: sourceKind,
      root: root,
      summary: summary,
      triplets: triplets.map(simplifyTriplet)
    }));
    return {
      source_kind: sourceKind,
      source: String(source || ""),
      root: root,
      scope: scopeLabel,
      triplets: triplets,
      summary: summary,
      identity_receipt: identityReceipt,
      projection_receipt: 0,
      package_receipt: 0,
      view_receipt: 0,
      receipts: {
        identity_receipt: identityReceipt,
        projection_receipt: 0,
        package_receipt: 0,
        view_receipt: 0
      }
    };
  }

  function triangulateDocument(document, options) {
    const normalized = typeof document === "string" ? modelParser.parseDocument(document) : document;
    if (!normalized || typeof normalized !== "object" || !normalized.id || !Array.isArray(normalized.groups)) {
      throw new Error("invalid-trace-document");
    }

    const source = normalized.source || "";
    const triplets = [];
    const root = normalized.id;
    const scope = normalized.kind || root;

    normalized.groups.forEach(function (group) {
      emitTriplet(triplets, {
        subject: root,
        predicate: "group",
        object: group.id,
        fs: root,
        gs: group.id,
        rs: group.id,
        us: "group",
        source_kind: "legacy-trace",
        authority: "trace",
        scope: scope,
        evidence: "group",
        kind: "group",
        section: group.id,
        path: [group.id].join("/"),
        view: options && options.mode ? normalizeMode(options.mode) || "lazy" : "lazy"
      });

      group.records.forEach(function (record) {
        emitTriplet(triplets, {
          subject: group.id,
          predicate: "record",
          object: record.id,
          fs: root,
          gs: group.id,
          rs: record.id,
          us: "record",
          source_kind: "legacy-trace",
          authority: "trace",
          scope: scope,
          evidence: "record",
          kind: "record",
          section: group.id,
          path: [group.id, record.id].join("/"),
          view: options && options.mode ? normalizeMode(options.mode) || "lazy" : "lazy"
        });

        record.units.forEach(function (unit) {
          emitTriplet(triplets, {
            subject: record.id,
            predicate: unit.key,
            object: unit.value,
            fs: root,
            gs: group.id,
            rs: record.id,
            us: unit.key,
            source_kind: "legacy-trace",
            authority: "trace",
            scope: scope,
            evidence: "field",
            kind: "field",
            section: group.id,
            path: [group.id, record.id, unit.key].join("/"),
            view: options && options.mode ? normalizeMode(options.mode) || "lazy" : "lazy"
          });
        });
      });
    });

    return createTriangulation(
      "legacy-trace",
      root,
      scope,
      source,
      triplets,
      {
        group_count: normalized.groups.length,
        record_count: normalized.groups.reduce(function (sum, group) {
          return sum + group.records.length;
        }, 0),
        field_count: normalized.groups.reduce(function (sum, group) {
          return sum + group.records.reduce(function (recordSum, record) {
            return recordSum + record.units.length;
          }, 0);
        }, 0),
        group_order: normalized.groups.map(function (group) {
          return group.id;
        })
      }
    );
  }

  function triangulateStreamDeclaration(streamInput, options) {
    const normalized = normalizeStreamDeclaration(streamInput, options);
    if (!normalized || typeof normalized !== "object" || !normalized.stream_id || !Array.isArray(normalized.regions)) {
      throw new Error("invalid-stream-declaration");
    }

    const source = normalized.source || "";
    const triplets = [];
    const root = normalized.stream_id;
    const scope = normalized.stream_scope || root;
    const mode = options && options.mode ? normalizeMode(options.mode) || "lazy" : "lazy";

    if (normalized.counts && typeof normalized.counts === "object") {
      Object.keys(normalized.counts).forEach(function (bandName) {
        emitTriplet(triplets, {
          subject: root,
          predicate: bandName,
          object: normalized.counts[bandName],
          fs: root,
          gs: "counts",
          rs: root,
          us: bandName,
          source_kind: "stream",
          authority: "declaration",
          scope: scope,
          evidence: "band",
          kind: "band",
          section: "counts",
          path: ["counts", bandName].join("/"),
          view: mode
        });
      });
    }

    emitTriplet(triplets, {
      subject: root,
      predicate: "presentation",
      object: normalized.active && normalized.active.presentation ? normalized.active.presentation : "barcode",
      fs: root,
      gs: "active",
      rs: root,
      us: "presentation",
      source_kind: "stream",
      authority: "declaration",
      scope: scope,
      evidence: "active",
      kind: "active",
      section: "active",
      path: ["active", "presentation"].join("/"),
      view: mode
    });

    normalized.regions.forEach(function (region) {
      const regionSubject = String(region.label || "region." + region.start);
      emitTriplet(triplets, {
        subject: root,
        predicate: "region",
        object: regionSubject,
        fs: root,
        gs: "regions",
        rs: regionSubject,
        us: "region",
        source_kind: "stream",
        authority: "declaration",
        scope: scope,
        evidence: "region",
        kind: "region",
        section: "regions",
        path: ["regions", regionSubject].join("/"),
        view: mode
      });

      Object.keys(region).forEach(function (key) {
        if (key === "label" || key === "region_receipt") {
          // keep the anchor and receipt in the structural summary, but do not
          // duplicate them as leaf fields.
          return;
        }
        emitTriplet(triplets, {
          subject: regionSubject,
          predicate: key,
          object: region[key],
          fs: root,
          gs: "regions",
          rs: regionSubject,
          us: key,
          source_kind: "stream",
          authority: "declaration",
          scope: scope,
          evidence: "field",
          kind: "field",
          section: "regions",
          path: ["regions", regionSubject, key].join("/"),
          view: mode
        });
      });

      emitTriplet(triplets, {
        subject: regionSubject,
        predicate: "region_receipt",
        object: region.region_receipt,
        fs: root,
        gs: "regions",
        rs: regionSubject,
        us: "region_receipt",
        source_kind: "stream",
        authority: "declaration",
        scope: scope,
        evidence: "receipt",
        kind: "receipt",
        section: "regions",
        path: ["regions", regionSubject, "region_receipt"].join("/"),
        view: mode
      });
    });

    return createTriangulation(
      "stream",
      root,
      scope,
      source,
      triplets,
      {
        region_count: normalized.regions.length,
        source_length: normalized.source_length || 0,
        band_counts: normalized.counts ? clone(normalized.counts) : null
      }
    );
  }

  function declarationSections(view) {
    if (!view || typeof view !== "object") {
      return [];
    }
    if (Array.isArray(view.sections)) {
      return view.sections;
    }
    if (view.declaration && typeof view.declaration === "object") {
      return Object.keys(view.declaration).map(function (key) {
        return view.declaration[key];
      }).filter(Boolean);
    }
    return [];
  }

  function triangulateDeclaration(declaration, options) {
    const normalized = typeof declaration === "string"
      ? omilispDeclaration.parseDeclaration(declaration)
      : declaration;
    if (!normalized || typeof normalized !== "object" || !normalized.declaration) {
      throw new Error("invalid-omilisp-declaration");
    }

    const view = omilispDeclaration.stableDeclarationView(normalized);
    const rootIdentity = view.identity || {};
    const root = String((rootIdentity && (rootIdentity.sid || rootIdentity.value)) || view.root || normalized.root || "omi");
    const scope = String((rootIdentity && rootIdentity.kind) || root);
    const source = normalized.source || "";
    const triplets = [];
    const sections = declarationSections(view);
    const mode = options && options.mode ? normalizeMode(options.mode) || "lazy" : "lazy";

    sections.forEach(function (section) {
      if (!section || typeof section !== "object" || !section.name) {
        return;
      }
      const sectionName = String(section.name);
      const sectionAnchor = resolveAnchor(section, sectionName);

      emitTriplet(triplets, {
        subject: root,
        predicate: "section",
        object: sectionName,
        fs: root,
        gs: sectionName,
        rs: sectionAnchor,
        us: "section",
        source_kind: "omilisp",
        authority: "declaration",
        scope: scope,
        evidence: "section",
        kind: "section",
        section: sectionName,
        path: [sectionName].join("/"),
        view: mode
      });

      walkNode(section, {
        triplets: triplets,
        root: root,
        subject: sectionAnchor,
        fs: root,
        gs: sectionName,
        rs: sectionAnchor,
        scope: scope,
        source_kind: "omilisp",
        authority: "declaration",
        section: sectionName,
        path: [sectionName],
        view: mode
      });
    });

    return createTriangulation(
      "omilisp",
      root,
      scope,
      source,
      triplets,
      {
        section_count: sections.length,
        record_count: triplets.filter(function (triplet) {
          return triplet.modality.kind === "record";
        }).length,
        field_count: triplets.filter(function (triplet) {
          return triplet.modality.kind === "field";
        }).length,
        section_order: sections.map(function (section) {
          return section.name;
        })
      }
    );
  }

  function triangulateSource(source, options) {
    const text = String(source || "");
    if (text.trim().startsWith("(omi")) {
      return triangulateDeclaration(text, options || {});
    }
    if (/^\s*\(\(FS\s*\./.test(text) || /\(\(FS\s*\./.test(text)) {
      return triangulateDocument(text, options || {});
    }
    return triangulateStreamDeclaration(text, options || {});
  }

  function projectTriangulation(triangulation, mode) {
    const normalized = normalizeMode(mode);
    if (!triangulation || typeof triangulation !== "object" || !Array.isArray(triangulation.triplets) || !normalized) {
      throw new Error("invalid-triangulation");
    }

    const summary = triangulation.summary || {};
    let payload;
    if (normalized === "lazy") {
      payload = {
        view: "lazy",
        carrier: "barcode",
        sealed_address: triangulation.root,
        witness: triangulation.identity_receipt,
        scope: triangulation.scope,
        triplet_count: summary.triplet_count || triangulation.triplets.length,
        preview: triangulation.triplets.slice(0, 6)
      };
    } else if (normalized === "greedy") {
      payload = {
        view: "greedy",
        chart: {
          root: triangulation.root,
          source_kind: triangulation.source_kind,
          triplet_count: summary.triplet_count || triangulation.triplets.length,
          subject_count: summary.subject_count || 0,
          predicate_count: summary.predicate_count || 0,
          object_count: summary.object_count || 0,
          plane_counts: summary.plane_counts || { FS: 0, GS: 0, RS: 0, US: 0 },
          section_order: summary.section_order || summary.group_order || [],
          field_count: summary.field_count || 0
        },
        witness: triangulation.identity_receipt,
        scope: triangulation.scope,
        triplets: triangulation.triplets
      };
    } else if (normalized === "static") {
      payload = {
        view: "static",
        declared_space: {
          root: triangulation.root,
          source_kind: triangulation.source_kind,
          section_order: summary.section_order || summary.group_order || [],
          plane_order: ["FS", "GS", "RS", "US"],
          relation_count: summary.record_count || 0,
          field_count: summary.field_count || 0
        },
        witness: triangulation.identity_receipt,
        reconciliation: "stable",
        scope: triangulation.scope
      };
    } else if (normalized === "animated") {
      payload = {
        view: "animated",
        timeline: {
          frame_count: 5040,
          frame_start: 0,
          frame_end: 5040,
          coordination: "sexagesimal rolling difference"
        },
        witness: triangulation.identity_receipt,
        scope: triangulation.scope,
        triplet_count: summary.triplet_count || triangulation.triplets.length
      };
    } else {
      throw new Error("invalid-triangulation-mode");
    }

    const viewReceipt = fnv1a(stableString({
      identity_receipt: triangulation.identity_receipt,
      mode: normalized,
      payload: payload
    }));
    const projectionReceipt = fnv1a(stableString({
      identity_receipt: triangulation.identity_receipt,
      mode: normalized,
      view_receipt: viewReceipt,
      payload: payload
    }));

    return Object.assign({}, payload, {
      mode: normalized,
      root: triangulation.root,
      source_kind: triangulation.source_kind,
      identity_receipt: triangulation.identity_receipt,
      projection_receipt: projectionReceipt,
      package_receipt: 0,
      view_receipt: viewReceipt,
      receipts: {
        identity_receipt: triangulation.identity_receipt,
        projection_receipt: projectionReceipt,
        package_receipt: 0,
        view_receipt: viewReceipt
      }
    });
  }

  function summarizeTriangulation(triangulation) {
    return triangulation && triangulation.summary ? clone(triangulation.summary) : null;
  }

  return {
    triangulateDeclaration: triangulateDeclaration,
    triangulateDocument: triangulateDocument,
    triangulateStreamDeclaration: triangulateStreamDeclaration,
    triangulateSource: triangulateSource,
    projectTriangulation: projectTriangulation,
    summarizeTriangulation: summarizeTriangulation
  };
}));
