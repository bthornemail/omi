(function (root, factory) {
  const api = factory();
  root.OMIFileSyncAdapter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const fs = typeof require === "function" ? require("fs") : null;

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

  function requireFs() {
    if (!fs) {
      throw new Error("fs-unavailable");
    }
  }

  function bundleReceipt(packets, syncPacketApi, expectedBaseReceipt) {
    return fnv1a(packets.map(function (packet) {
      return syncPacketApi.encodePacket(packet, expectedBaseReceipt);
    }).join("\n"));
  }

  function buildBundle(packets, syncPacketApi, expectedBaseReceipt) {
    const normalized = packets.map(function (packet) {
      return syncPacketApi.decodePacket(
        syncPacketApi.encodePacket(packet, expectedBaseReceipt),
        expectedBaseReceipt
      );
    });
    return {
      format: "omi-synclog",
      packet_count: normalized.length,
      packets: normalized,
      bundle_receipt: bundleReceipt(normalized, syncPacketApi, expectedBaseReceipt)
    };
  }

  function validateBundle(bundle, syncPacketApi, expectedBaseReceipt) {
    if (!bundle || bundle.format !== "omi-synclog") {
      throw new Error("invalid-synclog-format");
    }
    if (!Array.isArray(bundle.packets)) {
      throw new Error("invalid-synclog-packets");
    }
    const normalized = bundle.packets.map(function (packet) {
      return syncPacketApi.decodePacket(
        syncPacketApi.encodePacket(packet, expectedBaseReceipt),
        expectedBaseReceipt
      );
    });
    const expectedReceipt = bundleReceipt(normalized, syncPacketApi, expectedBaseReceipt);
    if (Number(bundle.packet_count) !== normalized.length) {
      throw new Error("invalid-synclog-count");
    }
    if (Number(bundle.bundle_receipt) !== expectedReceipt) {
      throw new Error("invalid-synclog-receipt");
    }
    return {
      format: "omi-synclog",
      packet_count: normalized.length,
      packets: normalized,
      bundle_receipt: expectedReceipt
    };
  }

  function writePacketFile(filePath, packet, syncPacketApi, expectedBaseReceipt) {
    requireFs();
    const encoded = syncPacketApi.encodePacket(packet, expectedBaseReceipt);
    fs.writeFileSync(filePath, encoded + "\n", "utf8");
    return encoded;
  }

  function readPacketFile(filePath, syncPacketApi, expectedBaseReceipt) {
    requireFs();
    const text = fs.readFileSync(filePath, "utf8").trim();
    return syncPacketApi.decodePacket(text, expectedBaseReceipt);
  }

  function writeSyncLogFile(filePath, packets, syncPacketApi, expectedBaseReceipt) {
    requireFs();
    const bundle = buildBundle(packets, syncPacketApi, expectedBaseReceipt);
    const encoded = stableString(bundle);
    fs.writeFileSync(filePath, encoded + "\n", "utf8");
    return bundle;
  }

  function readSyncLogFile(filePath, syncPacketApi, expectedBaseReceipt) {
    requireFs();
    const bundle = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return validateBundle(bundle, syncPacketApi, expectedBaseReceipt);
  }

  function applyPacketFile(state, filePath, syncPacketApi, editLogApi, expectedBaseReceipt) {
    const packet = readPacketFile(filePath, syncPacketApi, expectedBaseReceipt);
    return syncPacketApi.applyPacket(state, packet, editLogApi);
  }

  function applySyncLogFile(state, filePath, syncPacketApi, editLogApi, expectedBaseReceipt) {
    const bundle = readSyncLogFile(filePath, syncPacketApi, expectedBaseReceipt);
    const results = [];
    const emitted_packets = [];
    let applied = 0;
    let duplicates = 0;

    bundle.packets.forEach(function (packet) {
      const result = syncPacketApi.applyPacket(state, packet, editLogApi);
      results.push(result);
      if (result.status === "applied") {
        applied += 1;
      } else if (result.status === "duplicate") {
        duplicates += 1;
      }
      if (result.emitted_packet) {
        emitted_packets.push(result.emitted_packet);
      }
    });

    return {
      bundle: bundle,
      results: results,
      applied: applied,
      duplicates: duplicates,
      emitted_packets: emitted_packets
    };
  }

  return {
    writePacketFile: writePacketFile,
    readPacketFile: readPacketFile,
    writeSyncLogFile: writeSyncLogFile,
    readSyncLogFile: readSyncLogFile,
    applyPacketFile: applyPacketFile,
    applySyncLogFile: applySyncLogFile
  };
}));
