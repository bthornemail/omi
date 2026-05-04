(function (root, factory) {
  const api = factory();
  root.OMIOrgBabelBlocks = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function parseHeaderArgs(text) {
    const args = {};
    const pattern = /:([A-Za-z0-9_-]+)\s+("[^"]*"|'[^']*'|[^\s]+)/g;
    let match;
    while ((match = pattern.exec(text || ""))) {
      const key = match[1];
      const raw = match[2];
      args[key] = raw.replace(/^['"]|['"]$/g, "");
    }
    return args;
  }

  function parse(text) {
    const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let pendingName = "";
    let current = null;

    lines.forEach(function (line) {
      if (!current) {
        const nameMatch = line.match(/^#\+name:\s*(.+)\s*$/i);
        if (nameMatch) {
          pendingName = nameMatch[1].trim();
          return;
        }
        const beginMatch = line.match(/^#\+begin_src\s+([^\s]+)(.*)$/i);
        if (beginMatch) {
          current = {
            name: pendingName,
            language: beginMatch[1].trim(),
            headerArgs: parseHeaderArgs(beginMatch[2] || ""),
            body: []
          };
          pendingName = "";
        }
        return;
      }

      if (/^#\+end_src\s*$/i.test(line)) {
        current.text = current.body.join("\n");
        blocks.push(current);
        current = null;
        return;
      }

      current.body.push(line);
    });

    return blocks;
  }

  return {
    parse: parse,
    parseHeaderArgs: parseHeaderArgs
  };
}));
