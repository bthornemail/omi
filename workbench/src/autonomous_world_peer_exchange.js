(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_package_sync.js") : root.OMIAutonomousWorldPackageSync
  );
  root.OMIAutonomousWorldPeerExchange = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldPackageSync
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

  function declarePeer(peer) {
    const declared = {
      kind: "omi.autonomous-world.peer-declaration",
      peer_id: String(peer && peer.peer_id || ""),
      label: String(peer && peer.label || peer && peer.peer_id || ""),
      endpoint: String(peer && peer.endpoint || "declared.protocol-only"),
      capabilities: (peer && peer.capabilities ? peer.capabilities : ["world.sync.offer"]).slice().sort(),
      authority: false,
      peer_receipt: null
    };
    if (!declared.peer_id) {
      throw new Error("missing-peer-id");
    }
    declared.peer_receipt = fnv1a(stableString({
      peer_id: declared.peer_id,
      label: declared.label,
      endpoint: declared.endpoint,
      capabilities: declared.capabilities,
      authority: declared.authority
    }));
    return declared;
  }

  function createPeerRegistry(peers) {
    const registry = {
      kind: "omi.autonomous-world.peer-registry",
      peers: {},
      authority: false,
      registry_receipt: null
    };
    (peers || []).forEach(function (peer) {
      const declared = peer && peer.peer_receipt ? peer : declarePeer(peer);
      registry.peers[declared.peer_id] = declared;
    });
    registry.registry_receipt = fnv1a(stableString({
      peers: Object.keys(registry.peers).sort().map(function (peerId) {
        return registry.peers[peerId].peer_receipt;
      }),
      authority: registry.authority
    }));
    return registry;
  }

  function requirePeer(registry, peerId) {
    const peer = registry && registry.peers ? registry.peers[String(peerId)] : null;
    if (!peer) {
      throw new Error("unknown-peer:" + peerId);
    }
    return peer;
  }

  function offerPackage(peer, syncPackage, options) {
    const declared = peer && peer.peer_receipt ? peer : declarePeer(peer);
    const offer = {
      kind: "omi.autonomous-world.peer-package-offer",
      offer_id: String(options && options.offer_id || "offer." + declared.peer_id + "." + syncPackage.package_receipt),
      peer_id: declared.peer_id,
      peer_receipt: declared.peer_receipt,
      peer_authority: false,
      offered_package_receipt: syncPackage.package_receipt || null,
      transport: String(options && options.transport || "protocol.fixture"),
      transport_authority: false,
      authority: false,
      offer_receipt: null
    };
    offer.offer_receipt = fnv1a(stableString({
      offer_id: offer.offer_id,
      peer_id: offer.peer_id,
      peer_receipt: offer.peer_receipt,
      offered_package_receipt: offer.offered_package_receipt,
      transport: offer.transport,
      authority: offer.authority
    }));
    return offer;
  }

  function exchangeReceipt(record) {
    return fnv1a(stableString({
      peer_id: record.peer_id,
      peer_receipt: record.peer_receipt,
      offer_receipt: record.offer_receipt,
      offered_package_receipt: record.offered_package_receipt,
      verification_status: record.verification_status,
      accepted_snapshot_identities: record.accepted_snapshot_identities,
      rejected_reason: record.rejected_reason
    }));
  }

  function rejectExchange(peer, offer, reason) {
    const record = {
      kind: "omi.autonomous-world.peer-exchange",
      peer_id: peer ? peer.peer_id : offer && offer.peer_id || "unknown",
      peer_receipt: peer ? peer.peer_receipt : null,
      peer_authority: false,
      offer_receipt: offer ? offer.offer_receipt : null,
      offered_package_receipt: offer ? offer.offered_package_receipt : null,
      verification_status: "rejected",
      rejected_reason: String(reason || "rejected"),
      accepted_snapshot_identities: [],
      imported: null,
      authority: false,
      exchange_receipt: null
    };
    record.exchange_receipt = exchangeReceipt(record);
    return record;
  }

  function receivePackage(registry, offer, syncPackage) {
    let peer;
    try {
      peer = requirePeer(registry, offer && offer.peer_id);
    } catch (err) {
      return rejectExchange(null, offer, err.message);
    }
    if (!offer || offer.peer_receipt !== peer.peer_receipt) {
      return rejectExchange(peer, offer, "peer-receipt-mismatch");
    }
    if (!offer.offered_package_receipt) {
      return rejectExchange(peer, offer, "missing-package-receipt");
    }
    if (!syncPackage || syncPackage.package_receipt !== offer.offered_package_receipt) {
      return rejectExchange(peer, offer, "offered-package-receipt-mismatch");
    }
    try {
      const imported = autonomousWorldPackageSync.importSyncPackage(syncPackage);
      const identities = Object.keys(imported.graph.snapshots).sort();
      const record = {
        kind: "omi.autonomous-world.peer-exchange",
        peer_id: peer.peer_id,
        peer_receipt: peer.peer_receipt,
        peer_authority: false,
        offer_receipt: offer.offer_receipt,
        offered_package_receipt: offer.offered_package_receipt,
        verification_status: "accepted",
        rejected_reason: null,
        accepted_snapshot_identities: identities,
        imported: imported,
        authority: false,
        exchange_receipt: null
      };
      record.exchange_receipt = exchangeReceipt(record);
      return record;
    } catch (err) {
      return rejectExchange(peer, offer, err.message);
    }
  }

  function openAcceptedSnapshot(exchange, identity) {
    if (!exchange || exchange.verification_status !== "accepted") {
      throw new Error("exchange-not-accepted");
    }
    return autonomousWorldPackageSync.openImportedSnapshot(exchange.imported, identity);
  }

  function renderAcceptedSnapshot(exchange, identity, options) {
    if (!exchange || exchange.verification_status !== "accepted") {
      throw new Error("exchange-not-accepted");
    }
    return autonomousWorldPackageSync.renderImportedSnapshot(exchange.imported, identity, options || {});
  }

  return {
    declarePeer: declarePeer,
    createPeerRegistry: createPeerRegistry,
    offerPackage: offerPackage,
    receivePackage: receivePackage,
    openAcceptedSnapshot: openAcceptedSnapshot,
    renderAcceptedSnapshot: renderAcceptedSnapshot
  };
}));
