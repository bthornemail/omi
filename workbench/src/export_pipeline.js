(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./org_exporter.js") : root.OMIOrgExporter,
    typeof require === "function" ? require("./svg_backend.js") : root.OMISvgBackend,
    typeof require === "function" ? require("./gltf_exporter.js") : root.OMIGltfExporter,
    typeof require === "function" ? require("./obj_mtl_exporter.js") : root.OMIObjMtlExporter,
    typeof require === "function" ? require("./polyform_2d.js") : root.OMIPolyform2D,
    typeof require === "function" ? require("./polyform_3d.js") : root.OMIPolyform3D,
    typeof require === "function" ? require("./sync_packet.js") : root.OMISyncPacket,
    typeof require === "function" ? require("./barcode_sync_adapter.js") : root.OMIBarcodeSyncAdapter
  );
  root.OMIExportPipeline = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  orgExporter,
  svgBackend,
  gltfExporter,
  objMtlExporter,
  polyform2D,
  polyform3D,
  syncPacket,
  barcodeSyncAdapter
) {
  "use strict";

  function sceneId(state) {
    return state && state.scene && state.scene.id ? state.scene.id : (state && state.document && state.document.id ? state.document.id : "composer.scene");
  }

  function editReceipt(state) {
    return state.editLogApi.receipt(state.editLog);
  }

  function rootMetadata(state) {
    return artifactIdentity.rootMetadata(sceneId(state));
  }

  function decoratePath(document, state, item, depth, intent, extras) {
    const metadata = artifactIdentity.pathMetadata(item.path, sceneId(state), Object.assign({
      projection_intent: intent || item.kind || "projection"
    }, item.metadata || {}, extras || {}));
    return Object.assign({}, item, { metadata: metadata });
  }

  function sceneOverlayItems(state) {
    const scene = state && state.scene ? state.scene : { components: [], relations: [] };
    const overlays = [];

    (scene.components || []).forEach(function (component, index) {
      overlays.push(decoratePath(state.document, state, {
        kind: "node",
        path: component.path
      }, "middle", "component", {
        scope: component.scope,
        carrier: component.carrier,
        witness: component.witness
      }));
    });

    (scene.relations || []).forEach(function (relation, index) {
      const relationPath = scene.id + "/relation/" + relation.id;
      overlays.push(decoratePath(state.document, state, {
        kind: "line",
        path: relationPath
      }, "middle", "relation", {
        scope: "public.global",
        carrier: 255,
        witness: relation.witness,
        coordinate_receipt: relation.witness,
        closure_receipt: relation.witness
      }));
    });

    return overlays;
  }

  function decorateShapes(state, shapes, depth) {
    return shapes.map(function (shape) {
      return decoratePath(state.document, state, shape, depth, shape.kind || "shape", {
        scope: rootMetadata(state).scope,
        carrier: rootMetadata(state).carrier
      });
    });
  }

  function decorateSolids(state, solids, depth) {
    return solids.map(function (solid) {
      return decoratePath(state.document, state, solid, depth, solid.kind || "solid", {
        scope: rootMetadata(state).scope,
        carrier: rootMetadata(state).carrier
      });
    });
  }

  function exportSvg(state) {
    const shapes = decorateShapes(state, polyform2D.build(state.document, "near").concat(sceneOverlayItems(state)), "near");
    return svgBackend.buildSvg(state.document, shapes, "near", {
      editReceipt: editReceipt(state),
      rootMetadata: rootMetadata(state)
    });
  }

  function exportGltf(state) {
    return gltfExporter.build(state.document, decorateSolids(state, exportSolids(state.document).concat(sceneOverlayItems(state)), "near"), "near", {
      editReceipt: editReceipt(state),
      rootMetadata: rootMetadata(state)
    });
  }

  function exportObjMtl(state) {
    return objMtlExporter.build(state.document, decorateSolids(state, exportSolids(state.document).concat(sceneOverlayItems(state)), "near"), "near", {
      editReceipt: editReceipt(state),
      rootMetadata: rootMetadata(state)
    });
  }

  function exportSolids(document) {
    if (document && document.kind === "world") {
      return polyform2D.build(document, "near").map(function (shape) {
        return {
          kind: "node",
          path: shape.path
        };
      });
    }
    return polyform3D.build(document);
  }

  function exportOrgBundle(state) {
    return orgExporter.exportBundle({
      source: state.source,
      document: state.document,
      editLog: state.editLog,
      editLogApi: state.editLogApi,
      syncPackets: state.syncPackets || [],
      syncPacketApi: syncPacket
    });
  }

  function exportSyncPacket(state) {
    return syncPacket.createPacket(syncPacket.packetKinds.EDIT_LOG_SEGMENT, {
      base_receipt: syncPacket.sourceReceipt(state.source),
      source_peer: "composer.local",
      target_peer: "composer.remote",
      sequence: 1,
      log_events: state.editLog.events,
      conflict_events: []
    });
  }

  function exportBarcodeCarrier(state) {
    const packet = exportSyncPacket(state);
    return barcodeSyncAdapter.encodeCarrierDeclaration(packet, syncPacket, syncPacket.sourceReceipt(state.source));
  }

  function exportAll(state) {
    return {
      "model.omilisp": state.source,
      "bundle.org": exportOrgBundle(state)["README.org"],
      "scene.svg": exportSvg(state),
      "scene.gltf.json": JSON.stringify(exportGltf(state), null, 2),
      "scene.obj.mtl": exportObjMtl(state),
      "sync.packet.json": JSON.stringify(exportSyncPacket(state), null, 2),
      "barcode.carrier.json": exportBarcodeCarrier(state)
    };
  }

  return {
    exportSvg: exportSvg,
    exportGltf: exportGltf,
    exportObjMtl: exportObjMtl,
    exportOrgBundle: exportOrgBundle,
    exportSyncPacket: exportSyncPacket,
    exportBarcodeCarrier: exportBarcodeCarrier,
    exportAll: exportAll
  };
}));
