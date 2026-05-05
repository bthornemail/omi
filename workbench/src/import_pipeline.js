(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./model_parser.js") : root.OMIModelParser,
    typeof require === "function" ? require("./barcode_template.js") : root.OMIBarcodeTemplate,
    typeof require === "function" ? require("./sync_packet.js") : root.OMISyncPacket
  );
  root.OMIImportPipeline = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (modelParser, barcodeTemplate, syncPacket) {
  "use strict";

  function importOmiLisp(source) {
    const document = modelParser.parseDocument(String(source || ""));
    return {
      kind: "omi-lisp",
      document: document,
      source: String(source || ""),
      receipt: syncPacket.sourceReceipt(source)
    };
  }

  function importSvgTemplate(svgText) {
    const template = barcodeTemplate.fromSvg(svgText);
    if (!template) {
      return { kind: "svg-template", ok: false, error: "missing-omi-path" };
    }
    return {
      kind: "svg-template",
      ok: true,
      template: template,
      receipt: template.source_receipt
    };
  }

  function importOrgBundle(text) {
    return {
      kind: "org-bundle",
      source: String(text || ""),
      receipt: syncPacket.sourceReceipt(text)
    };
  }

  function importSyncPacket(text, expectedBaseReceipt) {
    try {
      return {
        kind: "sync-packet",
        ok: true,
        packet: syncPacket.decodePacket(text, expectedBaseReceipt)
      };
    } catch (error) {
      return {
        kind: "sync-packet",
        ok: false,
        error: error.message
      };
    }
  }

  function importBarcodeCarrier(text, barcodeSyncAdapter, expectedBaseReceipt) {
    try {
      return {
        kind: "barcode-carrier",
        ok: true,
        decoded: barcodeSyncAdapter.decodeCarrierDeclaration(text, syncPacket, expectedBaseReceipt)
      };
    } catch (error) {
      return {
        kind: "barcode-carrier",
        ok: false,
        error: error.message
      };
    }
  }

  return {
    importOmiLisp: importOmiLisp,
    importSvgTemplate: importSvgTemplate,
    importOrgBundle: importOrgBundle,
    importSyncPacket: importSyncPacket,
    importBarcodeCarrier: importBarcodeCarrier
  };
}));
