(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./omilisp_declaration.js") : root.OMIOmilispDeclaration,
    typeof require === "function" ? require("./spom_adapter.js") : root.OMISPOMAdapter
  );
  root.OMITransmutator = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  omilispDeclaration,
  spomAdapter
) {
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

  function encodeBase64(text) {
    const value = String(text || "");
    if (typeof Buffer !== "undefined") {
      return Buffer.from(value, "utf8").toString("base64");
    }
    if (typeof btoa !== "undefined") {
      return btoa(unescape(encodeURIComponent(value)));
    }
    throw new Error("missing-base64-encoder");
  }

  function decodeBase64(text) {
    const value = String(text || "");
    if (typeof Buffer !== "undefined") {
      return Buffer.from(value, "base64").toString("utf8");
    }
    if (typeof atob !== "undefined") {
      return decodeURIComponent(escape(atob(value)));
    }
    throw new Error("missing-base64-decoder");
  }

  function stringAtom(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, "\\\"");
  }

  function factAtom(value) {
    return String(value === undefined || value === null ? "null" : value)
      .replace(/[^A-Za-z0-9_:-]/g, "_");
  }

  function canonicalSource(input) {
    if (typeof input === "string") {
      return input;
    }
    if (input && typeof input.source === "string") {
      return input.source;
    }
    throw new Error("missing-canonical-source");
  }

  function parseOmi(input) {
    const source = canonicalSource(input);
    const declaration = omilispDeclaration.parseDeclaration(source);
    return { source: source, declaration: declaration };
  }

  function receiptFor(kind, identityReceipt, payload) {
    return fnv1a(stableString({
      transmutator: "omi-transmutator-roundtrip",
      kind: kind,
      identity_receipt: identityReceipt,
      payload: payload
    }));
  }

  function transmuteOmiToSpom(input) {
    const parsed = parseOmi(input);
    const triangulation = spomAdapter.triangulateSource(parsed.source);
    const payload = {
      kind: "spom",
      source_kind: triangulation.source_kind,
      root: triangulation.root,
      triplets: triangulation.triplets,
      adapter_authority: false,
      canonical_source_base64: encodeBase64(parsed.source)
    };
    return {
      kind: "spom",
      source: parsed.source,
      declaration: parsed.declaration,
      projection: payload,
      identity_receipt: parsed.declaration.identity_receipt,
      projection_receipt: receiptFor("spom", parsed.declaration.identity_receipt, payload),
      adapter_authority: false
    };
  }

  function transmuteOmiToProlog(input) {
    const spom = transmuteOmiToSpom(input);
    const lines = [
      `omi_identity_receipt(${spom.identity_receipt}).`,
      `omi_source_base64("${encodeBase64(spom.source)}").`,
      "adapter_authority(false)."
    ];
    spom.projection.triplets.forEach(function (triplet) {
      lines.push(`spom(${factAtom(triplet.subject)},${factAtom(triplet.predicate)},"${stringAtom(stableString(triplet.object))}").`);
    });
    const payload = lines.join("\n") + "\n";
    return {
      kind: "prolog",
      source: spom.source,
      declaration: spom.declaration,
      projection: payload,
      identity_receipt: spom.identity_receipt,
      projection_receipt: receiptFor("prolog", spom.identity_receipt, payload),
      adapter_authority: false
    };
  }

  function transmuteOmiToRdf(input) {
    const spom = transmuteOmiToSpom(input);
    const payload = {
      type: "rdf-like-triples",
      identity_receipt: spom.identity_receipt,
      adapter_authority: false,
      canonical_source_base64: encodeBase64(spom.source),
      triples: spom.projection.triplets.map(function (triplet) {
        return {
          subject: triplet.subject,
          predicate: triplet.predicate,
          object: clone(triplet.object)
        };
      })
    };
    return {
      kind: "rdf",
      source: spom.source,
      declaration: spom.declaration,
      projection: payload,
      identity_receipt: spom.identity_receipt,
      projection_receipt: receiptFor("rdf", spom.identity_receipt, payload),
      adapter_authority: false
    };
  }

  function transmuteOmiToJson(input) {
    const spom = transmuteOmiToSpom(input);
    const payload = {
      type: "json-like-projection",
      identity_receipt: spom.identity_receipt,
      adapter_authority: false,
      canonical_source_base64: encodeBase64(spom.source),
      declaration_summary: omilispDeclaration.summarizeDeclaration(spom.declaration),
      spom_summary: spom.projection.triplets.map(function (triplet) {
        return {
          subject: triplet.subject,
          predicate: triplet.predicate,
          object: clone(triplet.object)
        };
      })
    };
    return {
      kind: "json",
      source: spom.source,
      declaration: spom.declaration,
      projection: payload,
      identity_receipt: spom.identity_receipt,
      projection_receipt: receiptFor("json", spom.identity_receipt, payload),
      adapter_authority: false
    };
  }

  function extractPrologSource(text) {
    const match = String(text || "").match(/omi_source_base64\("([^"]+)"\)\./);
    if (!match) {
      throw new Error("missing-prolog-canonical-source");
    }
    return decodeBase64(match[1]);
  }

  function extractRdfSource(input) {
    if (!input || typeof input !== "object" || !input.canonical_source_base64) {
      throw new Error("missing-rdf-canonical-source");
    }
    return decodeBase64(input.canonical_source_base64);
  }

  function extractJsonSource(input) {
    if (!input || typeof input !== "object" || !input.canonical_source_base64) {
      throw new Error("missing-json-canonical-source");
    }
    return decodeBase64(input.canonical_source_base64);
  }

  function transmutePrologToOmi(input) {
    const source = extractPrologSource(input);
    const declaration = omilispDeclaration.parseDeclaration(source);
    return {
      kind: "omilisp",
      source: source,
      declaration: declaration,
      identity_receipt: declaration.identity_receipt,
      projection_receipt: receiptFor("omilisp-from-prolog", declaration.identity_receipt, source),
      adapter_authority: false
    };
  }

  function transmuteRdfToOmi(input) {
    const source = extractRdfSource(input);
    const declaration = omilispDeclaration.parseDeclaration(source);
    return {
      kind: "omilisp",
      source: source,
      declaration: declaration,
      identity_receipt: declaration.identity_receipt,
      projection_receipt: receiptFor("omilisp-from-rdf", declaration.identity_receipt, source),
      adapter_authority: false
    };
  }

  function transmuteJsonToOmi(input) {
    const source = extractJsonSource(input);
    const declaration = omilispDeclaration.parseDeclaration(source);
    return {
      kind: "omilisp",
      source: source,
      declaration: declaration,
      identity_receipt: declaration.identity_receipt,
      projection_receipt: receiptFor("omilisp-from-json", declaration.identity_receipt, source),
      adapter_authority: false
    };
  }

  function phraseGrounding(input) {
    const data = typeof input === "string" ? { phrase: input } : (input || {});
    const phrase = String(data.phrase || "");
    const synset = String(data.synset || "synset.stub");
    const relation = String(data.relation || "lexical-grounding");
    const sid = "phrase-grounding-" + fnv1a(phrase + "|" + synset);
    const source = `(omi
  (identity
    (sid ${sid})
    (title "Phrase / Synset Grounding Stub")
    (kind semantic.grounding-projection))
  (address
    (addr ${sid}.self)
    (locator wordnet-prolog-semantic-grounding.self)
    (binding transmutator.phrase-grounding.v0))
  (scope
    (fs omi)
    (gs semantic)
    (rs phrase)
    (us grounding))
  (grounding
    (sid ${sid})
    (phrase "${stringAtom(phrase)}")
    (synset ${synset})
    (relation ${relation})
    (adapter-authority false)
    (identity-authority canonical-omi-declaration))
  (spom
    (sid ${sid}.spom)
    (subject phrase)
    (predicate ${relation})
    (object ${synset})
    (modality receipt-verified-grounding)
    (authority false))
  (receipts
    (identity pending)
    (projection pending)
    (package pending)
    (view pending)))`;
    const declaration = omilispDeclaration.parseDeclaration(source);
    const triangulation = spomAdapter.triangulateSource(source);
    const payload = {
      phrase: phrase,
      synset: synset,
      relation: relation,
      adapter_authority: false,
      triangulation: triangulation
    };
    return {
      kind: "phrase-synset-grounding",
      source: source,
      declaration: declaration,
      projection: payload,
      identity_receipt: declaration.identity_receipt,
      projection_receipt: receiptFor("phrase-synset-grounding", declaration.identity_receipt, payload),
      adapter_authority: false
    };
  }

  function transmute(input, options) {
    const opts = options || {};
    const from = String(opts.from || "omilisp");
    const to = String(opts.to || "spom");
    if (from === "omilisp" && to === "spom") return transmuteOmiToSpom(input);
    if (from === "omilisp" && to === "prolog") return transmuteOmiToProlog(input);
    if (from === "omilisp" && to === "rdf") return transmuteOmiToRdf(input);
    if (from === "omilisp" && to === "json") return transmuteOmiToJson(input);
    if (from === "prolog" && to === "omilisp") return transmutePrologToOmi(input);
    if (from === "rdf" && to === "omilisp") return transmuteRdfToOmi(input);
    if (from === "json" && to === "omilisp") return transmuteJsonToOmi(input);
    if ((from === "phrase" || from === "synset") && (to === "spom" || to === "omilisp")) return phraseGrounding(input);
    throw new Error("unsupported-transmutation");
  }

  return {
    transmute: transmute,
    transmuteOmiToSpom: transmuteOmiToSpom,
    transmuteOmiToProlog: transmuteOmiToProlog,
    transmuteOmiToRdf: transmuteOmiToRdf,
    transmuteOmiToJson: transmuteOmiToJson,
    transmutePrologToOmi: transmutePrologToOmi,
    transmuteRdfToOmi: transmuteRdfToOmi,
    transmuteJsonToOmi: transmuteJsonToOmi,
    phraseGrounding: phraseGrounding
  };
}));
