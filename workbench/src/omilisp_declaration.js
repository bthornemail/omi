(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity
  );
  root.OMIOmilispDeclaration = api;
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

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function tokenize(source) {
    const text = String(source || "");
    const tokens = [];
    let i = 0;

    function readString() {
      let value = "";
      i += 1;
      while (i < text.length) {
        const ch = text[i];
        if (ch === "\"") {
          i += 1;
          return value;
        }
        if (ch === "\\") {
          i += 1;
          if (i >= text.length) {
            break;
          }
          const escaped = text[i];
          if (escaped === "n") {
            value += "\n";
          } else if (escaped === "t") {
            value += "\t";
          } else if (escaped === "r") {
            value += "\r";
          } else {
            value += escaped;
          }
          i += 1;
          continue;
        }
        value += ch;
        i += 1;
      }
      throw new Error("unterminated-string");
    }

    function readAtom() {
      const start = i;
      while (i < text.length) {
        const ch = text[i];
        if (/\s/.test(ch) || ch === "(" || ch === ")" || ch === ";") {
          break;
        }
        i += 1;
      }
      return text.slice(start, i);
    }

    while (i < text.length) {
      const ch = text[i];
      if (/\s/.test(ch)) {
        i += 1;
        continue;
      }
      if (ch === ";") {
        while (i < text.length && text[i] !== "\n") {
          i += 1;
        }
        continue;
      }
      if (ch === "(" || ch === ")") {
        tokens.push(ch);
        i += 1;
        continue;
      }
      if (ch === "\"") {
        tokens.push(readString());
        continue;
      }
      const atom = readAtom();
      if (atom) {
        tokens.push(atom);
      }
    }

    return tokens;
  }

  function parseAtom(token) {
    if (token === "true") {
      return true;
    }
    if (token === "false") {
      return false;
    }
    if (/^-?\d+$/.test(token)) {
      return Number(token);
    }
    if (/^-?\d+\.\d+$/.test(token)) {
      return Number(token);
    }
    return token;
  }

  function parseTokens(tokens) {
    let index = 0;

    function parseExpr() {
      const token = tokens[index];
      if (token === undefined) {
        throw new Error("unexpected-eof");
      }
      if (token === "(") {
        index += 1;
        const list = [];
        while (tokens[index] !== ")") {
          if (tokens[index] === undefined) {
            throw new Error("unexpected-eof");
          }
          list.push(parseExpr());
        }
        index += 1;
        return list;
      }
      if (token === ")") {
        throw new Error("unexpected-close-paren");
      }
      index += 1;
      return parseAtom(token);
    }

    const forms = [];
    while (index < tokens.length) {
      forms.push(parseExpr());
    }
    return forms;
  }

  function normalizeNode(node) {
    if (Array.isArray(node)) {
      if (node.length === 0) {
        return [];
      }
      if (node.length === 1) {
        return normalizeNode(node[0]);
      }
      const head = node[0];
      if (typeof head !== "string") {
        return node.map(normalizeNode);
      }
      if (node.length === 2 && !Array.isArray(node[1])) {
        return {
          name: head,
          value: normalizeNode(node[1])
        };
      }
      const out = { name: head };
      node.slice(1).forEach(function (child) {
        if (Array.isArray(child) && child.length > 0 && typeof child[0] === "string") {
          const key = child[0];
          const value = normalizeNode(child.slice(1));
          if (Object.prototype.hasOwnProperty.call(out, key)) {
            if (Array.isArray(out[key])) {
              out[key].push(value);
            } else {
              out[key] = [out[key], value];
            }
          } else {
            out[key] = value;
          }
          return;
        }
        if (!Object.prototype.hasOwnProperty.call(out, "values")) {
          out.values = [];
        }
        out.values.push(normalizeNode(child));
      });
      return out;
    }
    return node;
  }

  function normalizeForm(form) {
    if (!Array.isArray(form) || form.length === 0) {
      return normalizeNode(form);
    }
    const head = form[0];
    if (typeof head !== "string") {
      return normalizeNode(form);
    }
    const sections = form.slice(1).map(function (child) {
      return normalizeNode(child);
    }).filter(function (child) {
      return child !== null && child !== undefined;
    });
    return {
      name: head,
      root: head,
      sections: sections,
      declaration: mergeSections(sections)
    };
  }

  function mergeSections(sections) {
    const declaration = {};
    sections.forEach(function (section) {
      if (!section || typeof section !== "object" || !section.name) {
        return;
      }
      const key = section.name;
      const value = clone(section);
      if (Object.prototype.hasOwnProperty.call(declaration, key)) {
        if (Array.isArray(declaration[key])) {
          declaration[key].push(value);
        } else {
          declaration[key] = [declaration[key], value];
        }
      } else {
        declaration[key] = value;
      }
    });
    return declaration;
  }

  function parse(source) {
    const forms = parseTokens(tokenize(source));
    if (forms.length === 0) {
      throw new Error("empty-omilisp");
    }
    if (forms.length > 1) {
      return forms.map(normalizeForm);
    }
    return normalizeForm(forms[0]);
  }

  function declarationSections(declaration) {
    if (!declaration || typeof declaration !== "object") {
      return [];
    }
    if (Array.isArray(declaration)) {
      return declaration;
    }
    const sections = [];
    Object.keys(declaration).forEach(function (key) {
      if (key === "name" || key === "root" || key === "sections" || key === "declaration" || key === "source" || key === "identity_receipt" || key === "projection_receipt" || key === "package_receipt" || key === "view_receipt" || key === "receipts") {
        return;
      }
      const value = declaration[key];
      if (Array.isArray(value)) {
        value.forEach(function (item) {
          sections.push(item);
        });
      } else {
        sections.push(value);
      }
    });
    return sections.filter(function (item) {
      return item && typeof item === "object" && item.name;
    });
  }

  function stableDeclarationView(declaration) {
    if (!declaration || typeof declaration !== "object") {
      return null;
    }
    return {
      root: declaration.name || declaration.root || "omi",
      sections: clone(declaration.sections || declarationSections(declaration)),
      declaration: clone(declaration.declaration || declaration),
      identity: clone(declaration.declaration && declaration.declaration.identity ? declaration.declaration.identity : declaration.identity || null),
      address: clone(declaration.declaration && declaration.declaration.address ? declaration.declaration.address : declaration.address || null),
      scope: clone(declaration.declaration && declaration.declaration.scope ? declaration.declaration.scope : declaration.scope || null),
      chapters: clone(declaration.declaration && declaration.declaration.chapters ? declaration.declaration.chapters : declaration.chapters || null),
      relations: clone(declaration.declaration && declaration.declaration.relations ? declaration.declaration.relations : declaration.relations || null),
      projections: clone(declaration.declaration && declaration.declaration.projections ? declaration.declaration.projections : declaration.projections || null),
      receipts: clone(declaration.declaration && declaration.declaration.receipts ? declaration.declaration.receipts : declaration.receipts || null)
    };
  }

  function parseDeclaration(source) {
    const normalized = parse(source);
    const root = normalized && typeof normalized === "object" && normalized.root ? normalized : { name: "omi", root: "omi", sections: [], declaration: {} };
    const sections = clone(root.sections || []);
    const declaration = clone(root.declaration || mergeSections(sections));
    const canonical = {
      root: root.name || "omi",
      sections: sections,
      declaration: declaration
    };
    const identityReceipt = fnv1a(stableString(canonical));
    const receipts = {
      identity_receipt: identityReceipt,
      projection_receipt: 0,
      package_receipt: 0,
      view_receipt: 0
    };
    return Object.assign({}, canonical, {
      source: String(source || ""),
      identity_receipt: identityReceipt,
      projection_receipt: 0,
      package_receipt: 0,
      view_receipt: 0,
      receipts: receipts
    });
  }

  function coerceDeclaration(input) {
    if (typeof input === "string") {
      return parseDeclaration(input);
    }
    if (!input || typeof input !== "object") {
      throw new Error("invalid-declaration");
    }
    if (input.root && input.declaration && input.sections) {
      return input;
    }
    if (input.name) {
      const sections = clone(input.sections || declarationSections(input));
      const declaration = clone(input.declaration || mergeSections(sections));
      const canonical = {
        root: input.name,
        sections: sections,
        declaration: declaration
      };
      const identityReceipt = Number.isInteger(input.identity_receipt)
        ? Number(input.identity_receipt)
        : fnv1a(stableString(canonical));
      return Object.assign({}, canonical, {
        source: String(input.source || ""),
        identity_receipt: identityReceipt,
        projection_receipt: Number(input.projection_receipt || 0),
        package_receipt: Number(input.package_receipt || 0),
        view_receipt: Number(input.view_receipt || 0),
        receipts: input.receipts ? clone(input.receipts) : {
          identity_receipt: identityReceipt,
          projection_receipt: Number(input.projection_receipt || 0),
          package_receipt: Number(input.package_receipt || 0),
          view_receipt: Number(input.view_receipt || 0)
        }
      });
    }
    throw new Error("invalid-declaration");
  }

  function sectionCount(declaration) {
    const sections = declarationSections(declaration.declaration || declaration);
    return sections.length;
  }

  function countFormsByKey(value, key) {
    let count = 0;

    function walk(node) {
      if (!node) {
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node !== "object") {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        const child = node[key];
        count += Array.isArray(child) ? child.length : 1;
      }
      Object.keys(node).forEach(function (prop) {
        if (prop === "name") {
          return;
        }
        walk(node[prop]);
      });
    }

    walk(value);
    return count;
  }

  function countNodesByName(value, names) {
    const targets = Array.isArray(names) ? names : [names];
    let count = 0;

    function walk(node) {
      if (!node) {
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node !== "object") {
        return;
      }
      if (node.name && targets.indexOf(node.name) >= 0) {
        count += 1;
      }
      Object.keys(node).forEach(function (prop) {
        if (prop === "name") {
          return;
        }
        walk(node[prop]);
      });
    }

    walk(value);
    return count;
  }

  function summarizeDeclaration(declaration) {
    const normalized = coerceDeclaration(declaration);
    const identity = normalized.declaration.identity || {};
    const address = normalized.declaration.address || {};
    const scope = normalized.declaration.scope || {};
    const chapters = normalized.declaration.chapters || {};
    const relations = normalized.declaration.relations || {};
    const projections = normalized.declaration.projections || {};
    const lanes = normalized.declaration.lanes || {};
    const summary = {
      root: normalized.root,
      sid: identity.sid || identity.value || normalized.root,
      title: identity.title || "",
      kind: identity.kind || "document",
      address: address.addr || address.value || null,
      address_width: Number(address.width || 0) || null,
      scope: scope,
      section_count: normalized.sections.length,
      entry_count: countNodesByName(chapters, "entry"),
      relation_count: ["next", "grant", "gate"].reduce(function (sum, key) {
        return sum + countFormsByKey(relations, key);
      }, 0),
      lane_count: Object.keys(lanes).filter(function (key) {
        return key !== "name";
      }).length,
      projection_modes: Object.keys(projections).filter(function (key) {
        return key !== "name";
      }),
      chapters: chapters,
      lanes: lanes,
      layout: address.layout || null
    };
    return summary;
  }

  function projectDeclaration(declaration, mode) {
    const normalized = coerceDeclaration(declaration);
    const actualMode = String(mode || "lazy");
    const summary = summarizeDeclaration(normalized);
    let payload;
    if (actualMode === "lazy") {
      payload = {
        view: "lazy",
        carrier: "barcode",
        sealed_address: summary.address || summary.sid,
        witness: normalized.identity_receipt,
        scope: summary.scope,
        kind: summary.kind
      };
    } else if (actualMode === "greedy") {
      payload = {
        view: "greedy",
        chart: {
          root: summary.root,
          section_count: summary.section_count,
          entry_count: summary.entry_count,
          relation_count: summary.relation_count,
          lane_count: summary.lane_count,
          address_width: summary.address_width,
          projection_modes: summary.projection_modes,
          kind: summary.kind
        },
        witness: normalized.identity_receipt,
        scope: summary.scope
      };
    } else if (actualMode === "static") {
      payload = {
        view: "static",
        declared_space: {
          root: summary.root,
          section_order: normalized.sections.map(function (section) {
            return section.name;
          }),
          kind: summary.kind,
          scope: summary.scope
        },
        witness: normalized.identity_receipt,
        reconciliation: "stable"
      };
    } else if (actualMode === "animated") {
      payload = {
        view: "animated",
        timeline: {
          frame_count: 5040,
          frame_start: 0,
          frame_end: 5040,
          coordination: "sexagesimal rolling difference"
        },
        witness: normalized.identity_receipt,
        scope: summary.scope
      };
    } else {
      throw new Error("invalid-projection-mode");
    }

    const viewReceipt = fnv1a(stableString({
      identity_receipt: normalized.identity_receipt,
      mode: actualMode,
      payload: payload
    }));
    const projectionReceipt = fnv1a(stableString({
      identity_receipt: normalized.identity_receipt,
      mode: actualMode,
      view_receipt: viewReceipt,
      payload: payload
    }));

    return Object.assign({}, payload, {
      mode: actualMode,
      root: normalized.root,
      identity_receipt: normalized.identity_receipt,
      projection_receipt: projectionReceipt,
      package_receipt: 0,
      view_receipt: viewReceipt,
      receipts: {
        identity_receipt: normalized.identity_receipt,
        projection_receipt: projectionReceipt,
        package_receipt: 0,
        view_receipt: viewReceipt
      }
    });
  }

  return {
    tokenize: tokenize,
    parse: parse,
    normalizeNode: normalizeNode,
    parseDeclaration: parseDeclaration,
    summarizeDeclaration: summarizeDeclaration,
    projectDeclaration: projectDeclaration,
    stableDeclarationView: stableDeclarationView,
    identityReceipt: function (declaration) {
      return coerceDeclaration(declaration).identity_receipt;
    }
  };
}));
