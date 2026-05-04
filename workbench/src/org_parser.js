(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./org_property_drawer.js") : root.OMIOrgPropertyDrawer,
    typeof require === "function" ? require("./org_babel_blocks.js") : root.OMIOrgBabelBlocks
  );
  root.OMIOrgParser = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (propertyDrawer, babelBlocks) {
  "use strict";

  function parse(text) {
    const source = String(text || "");
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const sections = [];
    let current = null;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const headingMatch = line.match(/^(\*+)\s+(.*)$/);
      if (headingMatch) {
        current = {
          level: headingMatch[1].length,
          title: headingMatch[2].trim(),
          properties: {},
          body: []
        };
        sections.push(current);
        i += 1;
        if (i < lines.length && lines[i].trim() === ":PROPERTIES:") {
          const drawerLines = [];
          while (i < lines.length) {
            drawerLines.push(lines[i]);
            if (lines[i].trim() === ":END:") {
              i += 1;
              break;
            }
            i += 1;
          }
          current.properties = propertyDrawer.parse(drawerLines.join("\n"));
        }
        continue;
      }
      if (current) {
        current.body.push(line);
      }
      i += 1;
    }

    return {
      source: source,
      sections: sections,
      blocks: babelBlocks.parse(source)
    };
  }

  return {
    parse: parse
  };
}));
