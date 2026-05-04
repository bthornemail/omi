(function (root, factory) {
  const api = factory();
  root.OMIBarcodeSyncAdapter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const OMI_TIMING_MASTER_5040 = 5040;
  const OMI_TIMING_PRIVATE_60 = 60;
  const OMI_TIMING_OPERATOR_16 = 16;
  const OMI_TIMING_KERNEL_8 = 8;
  const OMI_TIMING_FANO_7 = 7;
  const OMI_TIMING_GLOBAL_360 = 360;
  const OMI_TIMING_PUBLIC_240 = 240;
  const OMI_BEECODE_MAX_15BIT = 32767;

  function fnv1a(text) {
    let hash = 2166136261;
    const data = String(text || "");
    for (let i = 0; i < data.length; i += 1) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function stableString(value) {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return "[" + value.map(stableString).join(",") + "]";
    }
    return "{" + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ":" + stableString(value[key]);
    }).join(",") + "}";
  }

  function selectorFromPacket(packet) {
    const seed = [
      packet.packet_kind || "",
      String(packet.sequence || 0),
      String(packet.receipt_hash || 0)
    ].join("|");
    return fnv1a(seed) % (OMI_BEECODE_MAX_15BIT + 1);
  }

  function normalizeCarrierDeclaration(declaration) {
    return {
      format: String(declaration && declaration.format ? declaration.format : ""),
      code16k: {
        master_5040: Number(declaration && declaration.code16k && declaration.code16k.master_5040 ? declaration.code16k.master_5040 : 0),
        private_60: Number(declaration && declaration.code16k && declaration.code16k.private_60 ? declaration.code16k.private_60 : 0),
        operator_16: Number(declaration && declaration.code16k && declaration.code16k.operator_16 ? declaration.code16k.operator_16 : 0),
        kernel_8: Number(declaration && declaration.code16k && declaration.code16k.kernel_8 ? declaration.code16k.kernel_8 : 0),
        fano_7: Number(declaration && declaration.code16k && declaration.code16k.fano_7 ? declaration.code16k.fano_7 : 0),
        sequence: Number(declaration && declaration.code16k && declaration.code16k.sequence ? declaration.code16k.sequence : 0)
      },
      aztec: {
        global_360: Number(declaration && declaration.aztec && declaration.aztec.global_360 ? declaration.aztec.global_360 : 0),
        object_id: String(declaration && declaration.aztec && declaration.aztec.object_id ? declaration.aztec.object_id : ""),
        base_receipt: Number(declaration && declaration.aztec && declaration.aztec.base_receipt ? declaration.aztec.base_receipt : 0)
      },
      maxicode: {
        public_240: Number(declaration && declaration.maxicode && declaration.maxicode.public_240 ? declaration.maxicode.public_240 : 0),
        canvas_id: String(declaration && declaration.maxicode && declaration.maxicode.canvas_id ? declaration.maxicode.canvas_id : ""),
        bundle_receipt: Number(declaration && declaration.maxicode && declaration.maxicode.bundle_receipt ? declaration.maxicode.bundle_receipt : 0)
      },
      beecode: {
        selector_15bit: Number(declaration && declaration.beecode && declaration.beecode.selector_15bit ? declaration.beecode.selector_15bit : 0)
      },
      packet_text: String(declaration && declaration.packet_text ? declaration.packet_text : ""),
      packet_receipt: Number(declaration && declaration.packet_receipt ? declaration.packet_receipt : 0)
    };
  }

  function validateCarrierDeclaration(declaration, syncPacketApi, expectedBaseReceipt) {
    const normalized = normalizeCarrierDeclaration(declaration);
    if (normalized.format !== "omi-barcode-sync") {
      return { ok: false, error: "invalid-barcode-format" };
    }
    if (normalized.code16k.master_5040 !== OMI_TIMING_MASTER_5040 ||
        normalized.code16k.private_60 !== OMI_TIMING_PRIVATE_60 ||
        normalized.code16k.operator_16 !== OMI_TIMING_OPERATOR_16 ||
        normalized.code16k.kernel_8 !== OMI_TIMING_KERNEL_8 ||
        normalized.code16k.fano_7 !== OMI_TIMING_FANO_7) {
      return { ok: false, error: "invalid-code16k-timing" };
    }
    if (normalized.aztec.global_360 !== OMI_TIMING_GLOBAL_360 || !normalized.aztec.object_id) {
      return { ok: false, error: "invalid-aztec-receipt" };
    }
    if (normalized.maxicode.public_240 !== OMI_TIMING_PUBLIC_240 || !normalized.maxicode.canvas_id) {
      return { ok: false, error: "invalid-maxicode-receipt" };
    }
    if (normalized.beecode.selector_15bit < 0 || normalized.beecode.selector_15bit > OMI_BEECODE_MAX_15BIT) {
      return { ok: false, error: "invalid-beecode-selector" };
    }
    let packet;
    try {
      packet = syncPacketApi.decodePacket(normalized.packet_text, expectedBaseReceipt);
    } catch (error) {
      return { ok: false, error: error.message };
    }
    if (packet.receipt_hash !== normalized.packet_receipt) {
      return { ok: false, error: "packet-receipt-mismatch" };
    }
    if (packet.sequence !== normalized.code16k.sequence) {
      return { ok: false, error: "sequence-mismatch" };
    }
    if (packet.base_receipt !== normalized.aztec.base_receipt) {
      return { ok: false, error: "base-receipt-mismatch" };
    }
    if (normalized.maxicode.bundle_receipt !== fnv1a(normalized.packet_text)) {
      return { ok: false, error: "bundle-receipt-mismatch" };
    }
    return {
      ok: true,
      declaration: normalized,
      packet: packet
    };
  }

  function encodeCarrierDeclaration(packet, syncPacketApi, expectedBaseReceipt) {
    const encodedPacket = syncPacketApi.encodePacket(packet, expectedBaseReceipt);
    const declaration = normalizeCarrierDeclaration({
      format: "omi-barcode-sync",
      code16k: {
        master_5040: OMI_TIMING_MASTER_5040,
        private_60: OMI_TIMING_PRIVATE_60,
        operator_16: OMI_TIMING_OPERATOR_16,
        kernel_8: OMI_TIMING_KERNEL_8,
        fano_7: OMI_TIMING_FANO_7,
        sequence: packet.sequence
      },
      aztec: {
        global_360: OMI_TIMING_GLOBAL_360,
        object_id: "sync.base." + packet.base_receipt,
        base_receipt: packet.base_receipt
      },
      maxicode: {
        public_240: OMI_TIMING_PUBLIC_240,
        canvas_id: "sync.bundle." + fnv1a(encodedPacket),
        bundle_receipt: fnv1a(encodedPacket)
      },
      beecode: {
        selector_15bit: selectorFromPacket(packet)
      },
      packet_text: encodedPacket,
      packet_receipt: packet.receipt_hash
    });
    return stableString(declaration);
  }

  function decodeCarrierDeclaration(text, syncPacketApi, expectedBaseReceipt) {
    const parsed = JSON.parse(String(text || ""));
    const validation = validateCarrierDeclaration(parsed, syncPacketApi, expectedBaseReceipt);
    if (!validation.ok) {
      throw new Error(validation.error);
    }
    return validation;
  }

  function applyDecodedCarrier(state, declarationText, syncPacketApi, editLogApi, expectedBaseReceipt) {
    const decoded = decodeCarrierDeclaration(declarationText, syncPacketApi, expectedBaseReceipt);
    const result = syncPacketApi.applyPacket(state, decoded.packet, editLogApi);
    return {
      declaration: decoded.declaration,
      packet: decoded.packet,
      result: result
    };
  }

  return {
    constants: {
      OMI_TIMING_MASTER_5040: OMI_TIMING_MASTER_5040,
      OMI_TIMING_PRIVATE_60: OMI_TIMING_PRIVATE_60,
      OMI_TIMING_OPERATOR_16: OMI_TIMING_OPERATOR_16,
      OMI_TIMING_KERNEL_8: OMI_TIMING_KERNEL_8,
      OMI_TIMING_FANO_7: OMI_TIMING_FANO_7,
      OMI_TIMING_GLOBAL_360: OMI_TIMING_GLOBAL_360,
      OMI_TIMING_PUBLIC_240: OMI_TIMING_PUBLIC_240,
      OMI_BEECODE_MAX_15BIT: OMI_BEECODE_MAX_15BIT
    },
    encodeCarrierDeclaration: encodeCarrierDeclaration,
    decodeCarrierDeclaration: decodeCarrierDeclaration,
    applyDecodedCarrier: applyDecodedCarrier
  };
}));
