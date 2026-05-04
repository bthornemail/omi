(function (root, factory) {
  const api = factory();
  root.OMIESP32SyncAdapter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const OMI_TIMING_MASTER_5040 = 5040;
  const OMI_TIMING_PUBLIC_240 = 240;
  const OMI_TIMING_PRIVATE_60 = 60;
  const OMI_TIMING_KERNEL_8 = 8;
  const OMI_TIMING_FANO_7 = 7;

  const envelopeKinds = {
    IO_CHANGE: 1,
    POINTER_SELECT: 2,
    CARRIER_SCAN: 3,
    MODEL_SYNC: 4,
    RECEIPT_APPEND: 5,
    TIMING_OBSERVE: 6
  };

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

  function fnv1a(text) {
    let hash = 2166136261;
    const data = String(text || "");
    for (let i = 0; i < data.length; i += 1) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function defaultTiming() {
    return {
      master_5040: OMI_TIMING_MASTER_5040,
      public_240: OMI_TIMING_PUBLIC_240,
      private_60: OMI_TIMING_PRIVATE_60,
      kernel_8: OMI_TIMING_KERNEL_8,
      fano_7: OMI_TIMING_FANO_7
    };
  }

  function validateTiming(timing) {
    return timing &&
      timing.master_5040 === OMI_TIMING_MASTER_5040 &&
      timing.public_240 === OMI_TIMING_PUBLIC_240 &&
      timing.private_60 === OMI_TIMING_PRIVATE_60 &&
      timing.kernel_8 === OMI_TIMING_KERNEL_8 &&
      timing.fano_7 === OMI_TIMING_FANO_7;
  }

  function kindForPacket(packet) {
    if (!packet) {
      return 0;
    }
    if (packet.packet_kind === "CONFLICT_RECORD") {
      return envelopeKinds.RECEIPT_APPEND;
    }
    if (packet.packet_kind === "BASE_RECEIPT") {
      return envelopeKinds.TIMING_OBSERVE;
    }
    return envelopeKinds.MODEL_SYNC;
  }

  function relationForPacket(packet) {
    if (!packet) {
      return "";
    }
    if (packet.packet_kind === "CONFLICT_RECORD") {
      return "receipt-append";
    }
    if (packet.packet_kind === "BASE_RECEIPT") {
      return "timing-observe";
    }
    return "model-sync";
  }

  function normalizeEnvelope(envelope) {
    return {
      profile_id: String(envelope && envelope.profile_id ? envelope.profile_id : ""),
      packet_kind: Number(envelope && envelope.packet_kind ? envelope.packet_kind : 0),
      device_id: String(envelope && envelope.device_id ? envelope.device_id : ""),
      model_id: String(envelope && envelope.model_id ? envelope.model_id : ""),
      source: String(envelope && envelope.source ? envelope.source : ""),
      target: String(envelope && envelope.target ? envelope.target : ""),
      relation: String(envelope && envelope.relation ? envelope.relation : ""),
      timing: {
        master_5040: Number(envelope && envelope.timing && envelope.timing.master_5040 ? envelope.timing.master_5040 : 0),
        public_240: Number(envelope && envelope.timing && envelope.timing.public_240 ? envelope.timing.public_240 : 0),
        private_60: Number(envelope && envelope.timing && envelope.timing.private_60 ? envelope.timing.private_60 : 0),
        kernel_8: Number(envelope && envelope.timing && envelope.timing.kernel_8 ? envelope.timing.kernel_8 : 0),
        fano_7: Number(envelope && envelope.timing && envelope.timing.fano_7 ? envelope.timing.fano_7 : 0)
      },
      payload_text: String(envelope && envelope.payload_text ? envelope.payload_text : ""),
      payload_receipt: Number(envelope && envelope.payload_receipt ? envelope.payload_receipt : 0)
    };
  }

  function validateEnvelope(envelope, syncPacketApi, expectedBaseReceipt) {
    const normalized = normalizeEnvelope(envelope);
    if (normalized.profile_id !== "device.esp32-event-witness") {
      return { ok: false, error: "invalid-esp32-profile" };
    }
    if (!validateTiming(normalized.timing)) {
      return { ok: false, error: "invalid-timing-receipt" };
    }
    if (normalized.packet_kind < envelopeKinds.IO_CHANGE ||
        normalized.packet_kind > envelopeKinds.TIMING_OBSERVE) {
      return { ok: false, error: "invalid-esp32-packet-kind" };
    }
    if (!normalized.device_id || normalized.device_id !== "device.esp32-event-witness") {
      return { ok: false, error: "invalid-device-id" };
    }
    if (!normalized.payload_text) {
      return { ok: false, error: "missing-sync-payload" };
    }
    let packet;
    try {
      packet = syncPacketApi.decodePacket(normalized.payload_text, expectedBaseReceipt);
    } catch (error) {
      return { ok: false, error: error.message };
    }
    if (fnv1a(normalized.payload_text) !== normalized.payload_receipt) {
      return { ok: false, error: "payload-receipt-mismatch" };
    }
    return {
      ok: true,
      envelope: normalized,
      packet: packet
    };
  }

  function encodeSyncPacket(packet, syncPacketApi, expectedBaseReceipt) {
    const payloadText = syncPacketApi.encodePacket(packet, expectedBaseReceipt);
    const envelope = normalizeEnvelope({
      profile_id: "device.esp32-event-witness",
      packet_kind: kindForPacket(packet),
      device_id: "device.esp32-event-witness",
      model_id: "sync.base." + packet.base_receipt,
      source: "esp32.network",
      target: "workbench.sync",
      relation: relationForPacket(packet),
      timing: defaultTiming(),
      payload_text: payloadText,
      payload_receipt: fnv1a(payloadText)
    });
    return stableString(envelope);
  }

  function decodeSyncPacket(text, syncPacketApi, expectedBaseReceipt) {
    const parsed = JSON.parse(String(text || ""));
    const validation = validateEnvelope(parsed, syncPacketApi, expectedBaseReceipt);
    if (!validation.ok) {
      throw new Error(validation.error);
    }
    return validation;
  }

  function applyDecodedEnvelope(state, text, syncPacketApi, editLogApi, expectedBaseReceipt) {
    const decoded = decodeSyncPacket(text, syncPacketApi, expectedBaseReceipt);
    const result = syncPacketApi.applyPacket(state, decoded.packet, editLogApi);
    return {
      envelope: decoded.envelope,
      packet: decoded.packet,
      result: result
    };
  }

  return {
    constants: {
      OMI_TIMING_MASTER_5040: OMI_TIMING_MASTER_5040,
      OMI_TIMING_PUBLIC_240: OMI_TIMING_PUBLIC_240,
      OMI_TIMING_PRIVATE_60: OMI_TIMING_PRIVATE_60,
      OMI_TIMING_KERNEL_8: OMI_TIMING_KERNEL_8,
      OMI_TIMING_FANO_7: OMI_TIMING_FANO_7
    },
    encodeSyncPacket: encodeSyncPacket,
    decodeSyncPacket: decodeSyncPacket,
    applyDecodedEnvelope: applyDecodedEnvelope
  };
}));
