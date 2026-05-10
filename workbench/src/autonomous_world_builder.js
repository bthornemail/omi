(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./model_parser.js") : root.OMIModelParser,
    typeof require === "function" ? require("./composer_shell.js") : root.OMIComposerShell,
    typeof require === "function" ? require("./barcode_template.js") : root.OMIBarcodeTemplate,
    typeof require === "function" ? require("./spom_adapter.js") : root.OMISPOMAdapter,
    typeof require === "function" ? require("./raw_binary_chunk_index.js") : root.OMIRawBinaryChunkIndex,
    typeof require === "function" ? require("./universal_closure_coding.js") : root.OMIUniversalClosureCoding
  );
  root.OMIAutonomousWorldBuilder = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  modelParser,
  composerShell,
  barcodeTemplate,
  spomAdapter,
  rawBinaryChunkIndex,
  closureCoding
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

  function proposalReceipt(seed, proposal) {
    return fnv1a(stableString({
      builder: "autonomous-world-builder-model",
      seed: seed,
      proposal: proposal
    }));
  }

  function createPlan(seedInput) {
    const seed = String(seedInput || "world.autonomous-fixture");
    const objects = [
      { id: "trailer.001", model: "model.trailer.wike-ebike-cargo", pose: "x0.y0.r0", state: "empty" },
      { id: "bicycle.001", model: "model.bicycle.generic-ebike", pose: "x-2.y0.r0", state: "coupled" },
      { id: "cargo.001", model: "model.box.generic-cargo", pose: "trailer.001.cargo-volume", state: "loaded" }
    ];
    const relations = [
      { id: "hitch-link.001", source: "bicycle.001.hitch", target: "trailer.001.tow-arm", relation: "coupled-traction" },
      { id: "load-support.001", source: "cargo.001.mass", target: "trailer.001.panel.floor", relation: "supported-by" },
      { id: "rolling.001", source: "bicycle.001.forward-motion", target: "trailer.001.motion", relation: "transmitted-motion" }
    ];
    const proposals = objects.map(function (object) {
      return {
        type: "object-proposal",
        authority: false,
        object: clone(object)
      };
    }).concat(relations.map(function (relation) {
      return {
        type: "relation-proposal",
        authority: false,
        relation: clone(relation)
      };
    }));
    proposals.forEach(function (proposal, index) {
      proposal.seq = index + 1;
      proposal.proposal_receipt = proposalReceipt(seed, proposal);
    });
    return {
      seed: seed,
      authority: false,
      proposals: proposals,
      objects: objects,
      relations: relations,
      plan_receipt: fnv1a(stableString({ seed: seed, proposals: proposals }))
    };
  }

  function worldSource(plan) {
    const lines = [
      ";; ============================================================",
      ";; OMI AUTONOMOUS WORLD BUILDER FIXTURE",
      ";; World: " + plan.seed,
      ";; Authority: admitted declaration + receipts, not proposal output",
      ";; ============================================================",
      "",
      "((FS . " + plan.seed + ")",
      "",
      "  ((GS . objects)"
    ];
    plan.objects.forEach(function (object, index) {
      lines.push("    ((RS . " + object.id + ")");
      lines.push("      ((US . model) . " + object.model + ")");
      lines.push("      ((US . pose)  . " + object.pose + ")");
      lines.push("      ((US . state) . " + object.state + "))" + (index === plan.objects.length - 1 ? ")" : ""));
      lines.push("");
    });
    lines.push("  ((GS . interactions)");
    plan.relations.forEach(function (relation, index) {
      lines.push("    ((RS . " + relation.id + ")");
      lines.push("      ((US . source)   . " + relation.source + ")");
      lines.push("      ((US . target)   . " + relation.target + ")");
      lines.push("      ((US . relation) . " + relation.relation + "))" + (index === plan.relations.length - 1 ? ")" : ""));
      lines.push("");
    });
    lines.push("  ((GS . render)");
    lines.push("    ((RS . resolution)");
    lines.push("      ((US . far)     . FS.GS)");
    lines.push("      ((US . middle)  . FS.GS.RS)");
    lines.push("      ((US . near)    . FS.GS.RS.US)");
    lines.push("      ((US . inspect) . full-trace))))");
    return lines.join("\n");
  }

  function admitPlan(plan) {
    const source = worldSource(plan);
    const document = modelParser.parseDocument(source);
    const identityReceipt = fnv1a(stableString({
      seed: plan.seed,
      source: source,
      counts: document.counts,
      graph: document.graph
    }));
    return {
      authority: "declaration+receipts",
      source: source,
      document: document,
      identity_receipt: identityReceipt,
      admitted: true,
      admission_receipt: fnv1a(stableString({
        plan_receipt: plan.plan_receipt,
        identity_receipt: identityReceipt,
        proposal_receipts: plan.proposals.map(function (proposal) {
          return proposal.proposal_receipt;
        })
      }))
    };
  }

  function runComposer(admission) {
    const state = composerShell.createComposer(admission.source, {
      sceneId: admission.document.id
    });
    const imported = composerShell.importSvgTemplate(state, barcodeTemplate.toSvg({
      omi_path: admission.document.id + "/objects/trailer.001",
      carrier: "Aztec",
      scope: "public.global",
      witness: String(admission.identity_receipt)
    }));
    const dropped = composerShell.dropTemplate(
      state,
      imported.template,
      admission.document.id + "/objects/template.001"
    );
    const connected = composerShell.connect(
      state,
      admission.document.id + "/objects/template.001",
      admission.document.id + "/objects/cargo.001",
      "composed-with"
    );
    const committed = composerShell.commit(state, dropped.proposal.seq);
    const triangulation = composerShell.currentTriangulation(state);
    const pkg = composerShell.exportPackage(state);
    const importedPackage = composerShell.importPackage(pkg);
    return {
      state: state,
      imported_template: imported,
      proposals: [dropped.proposal, connected.proposal],
      committed: committed,
      triangulation: triangulation,
      package: pkg,
      imported_package: importedPackage
    };
  }

  function buildAutonomousWorld(options) {
    const plan = createPlan(options && options.seed);
    const admission = admitPlan(plan);
    const composer = runComposer(admission);
    const serializedPackage = stableString({
      manifest: composer.package.manifest,
      files: composer.package.files
    });
    const rawIndex = rawBinaryChunkIndex.createRawBinaryChunkIndex({
      index_id: admission.document.id + ".package.raw",
      omi_path: admission.document.id + "/package",
      scope: "public.global",
      identity_anchor: admission.document.id,
      block_size: options && options.block_size ? options.block_size : 64,
      bytes: serializedPackage
    });
    const closureCharacter = closureCoding.encodeClosure({
      closure_law: "unary",
      payload: admission.document.id,
      boundary: "self-delimiting",
      cons_orientation: "car-cdr",
      carrier: "character"
    });
    const closureBinary64 = closureCoding.encodeClosure({
      closure_law: "unary",
      payload: admission.document.id,
      boundary: "self-delimiting",
      cons_orientation: "car-cdr",
      carrier: "binary64"
    });
    const closureChanged = closureCoding.encodeClosure({
      closure_law: "elias",
      payload: admission.document.id,
      boundary: "self-delimiting",
      cons_orientation: "car-cdr",
      carrier: "character"
    });
    const worldTriangulation = spomAdapter.triangulateDocument(admission.document, { mode: "lazy" });
    const report = {
      kind: "autonomous-world-builder-report",
      builder: "autonomous-world-builder-model",
      seed: plan.seed,
      plan: {
        authority: false,
        proposal_count: plan.proposals.length,
        proposal_receipts: plan.proposals.map(function (proposal) {
          return proposal.proposal_receipt;
        }),
        plan_receipt: plan.plan_receipt
      },
      admission: {
        admitted: true,
        authority: admission.authority,
        identity_receipt: admission.identity_receipt,
        admission_receipt: admission.admission_receipt
      },
      world: {
        id: admission.document.id,
        kind: admission.document.kind,
        counts: clone(admission.document.counts),
        graph_node_count: admission.document.graph.nodes.length,
        graph_edge_count: admission.document.graph.edges.length,
        source: admission.source
      },
      composer: {
        proposal_count: composer.proposals.length,
        committed: composer.committed && composer.committed.type === "commit",
        triangulation_receipt: composer.triangulation.identity_receipt
      },
      package: {
        manifest_receipt: composer.package.manifest.manifest_receipt,
        imported_manifest_receipt: composer.imported_package.manifest.manifest_receipt,
        scene_root_receipt: composer.package.scene_root_receipt,
        visual_artifact_equivalence_receipt: composer.package.manifest.visual_artifact_equivalence_receipt,
        graphics_equivalence_receipt: composer.package.manifest.graphics_equivalence_receipt
      },
      raw_binary: {
        identity_receipt: rawIndex.identity_receipt,
        index_receipt: rawIndex.index_receipt,
        chunk_count: rawIndex.chunk_count,
        sparse_chunk_count: rawIndex.sparse_chunk_count
      },
      closure: {
        character_identity_receipt: closureCharacter.identity_receipt,
        binary64_identity_receipt: closureBinary64.identity_receipt,
        character_projection_receipt: closureCharacter.projection_receipt,
        binary64_projection_receipt: closureBinary64.projection_receipt,
        changed_identity_receipt: closureChanged.identity_receipt
      },
      triangulation: {
        root: worldTriangulation.root,
        identity_receipt: worldTriangulation.identity_receipt,
        triplet_count: worldTriangulation.triplets.length
      },
      authority: {
        builder_authority: false,
        proposals_authority: false,
        composer_authority: false,
        package_authority: false,
        raw_binary_authority: false,
        closure_carrier_authority: false,
        declarations_and_receipts_authority: true
      }
    };
    report.report_receipt = fnv1a(stableString(report));
    return {
      plan: plan,
      admission: admission,
      composer: composer,
      raw_binary: rawIndex,
      closure: {
        character: closureCharacter,
        binary64: closureBinary64,
        changed: closureChanged
      },
      triangulation: worldTriangulation,
      report: report
    };
  }

  return {
    createPlan: createPlan,
    admitPlan: admitPlan,
    buildAutonomousWorld: buildAutonomousWorld
  };
}));
