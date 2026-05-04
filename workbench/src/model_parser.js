(function (root, factory) {
  const api = factory();
  root.OMIModelParser = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function trimComment(line) {
    const idx = line.indexOf(";;");
    return idx >= 0 ? line.slice(0, idx) : line;
  }

  function parseUnits(line) {
    const match = line.match(/\(\(US\s*\.\s*([^)]+)\)\s*\.\s*(.+?)\)\s*$/);
    if (!match) {
      return null;
    }
    return {
      key: match[1].trim(),
      value: match[2].trim().replace(/\)+\s*$/, "")
    };
  }

  function parsePlane(line, plane) {
    const match = line.match(new RegExp("\\(\\(" + plane + "\\s*\\.\\s*([^)]+)\\)"));
    return match ? match[1].trim() : null;
  }

  function inferKind(id) {
    if (typeof id !== "string") {
      return "document";
    }
    if (id.indexOf("world.") === 0) {
      return "world";
    }
    if (id.indexOf("model.") === 0) {
      return "model";
    }
    return "document";
  }

  function serializeDocument(document) {
    return document && typeof document.source === "string" ? document.source : "";
  }

  function attachLookup(document) {
    document.lookup = {};
    document.groups.forEach(function (group) {
      const gsPath = document.id + "/" + group.id;
      document.lookup[gsPath] = {
        plane: "GS",
        fs: document.id,
        gs: group.id,
        path: gsPath,
        value: group
      };
      group.records.forEach(function (record) {
        const rsPath = gsPath + "/" + record.id;
        record.path = rsPath;
        document.lookup[rsPath] = {
          plane: "RS",
          fs: document.id,
          gs: group.id,
          rs: record.id,
          path: rsPath,
          value: record
        };
        record.units.forEach(function (unit) {
          unit.path = rsPath + "/" + unit.key;
          document.lookup[unit.path] = {
            plane: "US",
            fs: document.id,
            gs: group.id,
            rs: record.id,
            us: unit.key,
            path: unit.path,
            value: unit
          };
        });
      });
    });
  }

  function buildRecords(document) {
    document.records = [];
    document.groups.forEach(function (group) {
      group.records.forEach(function (record) {
        const primitiveUnit = record.units.find(function (unit) { return unit.key === "primitive"; });
        const functionUnit = record.units.find(function (unit) { return unit.key === "function"; });
        document.records.push({
          fs: document.id,
          gs: group.id,
          rs: record.id,
          path: record.path,
          primitive: primitiveUnit ? primitiveUnit.value : "",
          purpose: functionUnit ? functionUnit.value : ""
        });
      });
    });
  }

  function buildGraph(document) {
    if (document.kind !== "world") {
      return;
    }

    const objectsGroup = document.groups.find(function (group) { return group.id === "objects"; });
    const interactionsGroup = document.groups.find(function (group) { return group.id === "interactions"; });
    document.graph.nodes = objectsGroup ? objectsGroup.records.map(function (record) {
      return { id: record.id, label: record.id, path: record.path };
    }) : [];
    document.graph.edges = interactionsGroup ? interactionsGroup.records.map(function (record) {
      const sourceUnit = record.units.find(function (unit) { return unit.key === "source"; });
      const targetUnit = record.units.find(function (unit) { return unit.key === "target"; });
      const relationUnit = record.units.find(function (unit) { return unit.key === "relation"; });
      return {
        id: record.id,
        path: record.path,
        source: sourceUnit ? sourceUnit.value : "",
        target: targetUnit ? targetUnit.value : "",
        relation: relationUnit ? relationUnit.value : ""
      };
    }) : [];
  }

  function resolvePath(document, path) {
    return document && document.lookup ? document.lookup[path] || null : null;
  }

  function parseDocument(source) {
    const lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
    const document = {
      source: String(source || ""),
      id: "",
      kind: "document",
      counts: { fs: 0, gs: 0, rs: 0, us: 0 },
      groups: [],
      flat: { fs: [], gs: [], rs: [], us: [] },
      graph: { nodes: [], edges: [] },
      render: {},
      lookup: {},
      records: []
    };

    let currentGroup = null;
    let currentRecord = null;

    lines.forEach(function (rawLine) {
      const line = trimComment(rawLine).trim();
      let value;
      let unit;
      if (!line) {
        return;
      }

      value = parsePlane(line, "FS");
      if (value) {
        document.counts.fs += 1;
        document.flat.fs.push(value);
        if (!document.id) {
          document.id = value;
          document.kind = inferKind(value);
        }
        return;
      }

      value = parsePlane(line, "GS");
      if (value) {
        document.counts.gs += 1;
        currentGroup = { id: value, records: [] };
        document.groups.push(currentGroup);
        document.flat.gs.push(value);
        currentRecord = null;
        return;
      }

      value = parsePlane(line, "RS");
      if (value) {
        document.counts.rs += 1;
        currentRecord = { id: value, units: [] };
        document.flat.rs.push(value);
        if (currentGroup) {
          currentGroup.records.push(currentRecord);
        }
        return;
      }

      unit = parseUnits(line);
      if (unit) {
        document.counts.us += 1;
        document.flat.us.push(unit);
        if (currentRecord) {
          currentRecord.units.push(unit);
          if (currentGroup && currentGroup.id === "render") {
            if (!document.render[currentRecord.id]) {
              document.render[currentRecord.id] = {};
            }
            document.render[currentRecord.id][unit.key] = unit.value;
          }
        }
      }
    });

    attachLookup(document);
    buildRecords(document);
    buildGraph(document);

    return document;
  }

  return {
    parseDocument: parseDocument,
    serializeDocument: serializeDocument,
    resolvePath: resolvePath
  };
}));
