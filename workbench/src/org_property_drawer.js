(function (root, factory) {
  const api = factory();
  root.OMIOrgPropertyDrawer = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function parse(text) {
    const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
    const properties = {};
    let inside = false;

    lines.forEach(function (line) {
      if (line.trim() === ":PROPERTIES:") {
        inside = true;
        return;
      }
      if (line.trim() === ":END:") {
        inside = false;
        return;
      }
      if (!inside) {
        return;
      }
      const match = line.match(/^:([^:]+):\s*(.*)$/);
      if (match) {
        properties[match[1].trim()] = match[2].trim();
      }
    });

    return properties;
  }

  function serialize(properties) {
    const keys = Object.keys(properties || {}).sort();
    if (keys.length === 0) {
      return "";
    }
    return [
      ":PROPERTIES:",
      keys.map(function (key) {
        return ":" + key + ": " + String(properties[key]);
      }).join("\n"),
      ":END:"
    ].join("\n");
  }

  return {
    parse: parse,
    serialize: serialize
  };
}));
