(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity
  );
  root.OMIPlatformDistributionManifest = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (artifactIdentity) {
  "use strict";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function manifestReceipt(value) {
    return artifactIdentity.fnv1a(artifactIdentity.stableString(value));
  }

  function normalizeWindow(options) {
    const width = Math.max(320, Number(options && options.width) || 1280);
    const height = Math.max(240, Number(options && options.height) || 800);
    return {
      title: String(options && options.title || "OMI Platform Workbench"),
      width: width,
      height: height,
      entry: String(options && options.entry || "workbench/omi.html"),
      backend: String(options && options.backend || "webview"),
      authority: false
    };
  }

  function defaultComponents() {
    return [
      { id: "janet", role: "declaration-host", authority: false },
      { id: "guix", role: "distribution-closure", authority: false },
      { id: "boot-kernel", role: "raw-binary-authority-carrier", authority: true },
      { id: "omi-lisp-compiler", role: "canonical-declaration-compiler", authority: false },
      { id: "atom-browser", role: "projection-workbench-shell", authority: false },
      { id: "webview", role: "html-css-projection-window", authority: false },
      { id: "semantic-web-bridge", role: "wordnet-prolog-rdf-sparql-bridge", authority: false }
    ];
  }

  function defaultLanes() {
    return [
      { id: "declaration", kind: "compiler-lane", mode: "multiplexed" },
      { id: "receipt", kind: "witness-lane", mode: "append-only" },
      { id: "semantic", kind: "grounding-lane", mode: "advisory" },
      { id: "ui", kind: "projection-lane", mode: "projection-only" },
      { id: "transport", kind: "modem-lane", mode: "duplex" }
    ];
  }

  function createPlatformDistributionManifest(options) {
    const manifestId = String(options && options.manifest_id || "omi.platform.distribution");
    const entry = normalizeWindow(options && options.window);
    const components = defaultComponents();
    const lanes = defaultLanes().map(function (lane) {
      return {
        id: lane.id,
        kind: lane.kind,
        mode: lane.mode,
        receipt: manifestReceipt({ manifest_id: manifestId, lane: lane })
      };
    });
    const transport = {
      modem: {
        authority: false,
        role: "carrier-transmutation-without-identity-rewrite"
      },
      multiplexer: {
        authority: false,
        role: "lane-interleaving-with-separate-receipts"
      },
      demultiplexer: {
        authority: false,
        role: "lane-separation-before-admission"
      }
    };

    const manifest = {
      manifest_id: manifestId,
      kind: "platform.distribution-manifest",
      authority: false,
      kernel_authority: "declared-kernel-and-receipts",
      window: entry,
      boot: {
        carrier: "raw-binary",
        package_manager: "guix",
        host_language: "janet",
        compiler: "omi-lisp",
        semantic_bridge: ["wordnet", "prolog", "rdf", "sparql"],
        ui_projection: ["dom", "cssom", entry.backend]
      },
      components: components,
      lanes: lanes,
      transport: transport
    };

    manifest.identity_receipt = manifestReceipt({
      manifest_id: manifest.manifest_id,
      kind: manifest.kind,
      boot: manifest.boot,
      components: manifest.components,
      lanes: manifest.lanes,
      window: manifest.window
    });
    manifest.view_receipt = manifestReceipt({
      identity_receipt: manifest.identity_receipt,
      window: manifest.window,
      transport: manifest.transport
    });
    return manifest;
  }

  function projectChannelMatrix(manifest) {
    const snapshot = clone(manifest);
    return {
      manifest_id: snapshot.manifest_id,
      identity_receipt: snapshot.identity_receipt,
      authority: false,
      channels: snapshot.lanes.map(function (lane, index) {
        return {
          id: lane.id,
          column: index,
          kind: lane.kind,
          mode: lane.mode,
          receipt: lane.receipt
        };
      }),
      modem: snapshot.transport.modem,
      multiplexer: snapshot.transport.multiplexer
    };
  }

  function summarizeManifest(manifest) {
    const snapshot = clone(manifest);
    return {
      manifest_id: snapshot.manifest_id,
      authority: snapshot.authority,
      kernel_authority: snapshot.kernel_authority,
      component_count: snapshot.components.length,
      lane_count: snapshot.lanes.length,
      browser_shell: snapshot.window.backend,
      semantic_bridge: snapshot.boot.semantic_bridge.join(","),
      identity_receipt: snapshot.identity_receipt,
      view_receipt: snapshot.view_receipt
    };
  }

  return {
    createPlatformDistributionManifest: createPlatformDistributionManifest,
    projectChannelMatrix: projectChannelMatrix,
    summarizeManifest: summarizeManifest
  };
}));
