(function (root, factory) {
  const api = factory();
  root.OMIAsciiPlane = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CONTROL_MAP = {
    FS: "0x1C",
    GS: "0x1D",
    RS: "0x1E",
    US: "0x1F"
  };

  function classifyByte(code) {
    if (code <= 0x1f) {
      return "control";
    }
    if (code <= 0x2f) {
      return "operator";
    }
    if (code <= 0x3f) {
      return "metric";
    }
    if (code <= 0x7f) {
      return "symbol";
    }
    return "extended";
  }

  function inspectAsciiPlanes(source, document) {
    const summary = { control: 0, operator: 0, metric: 0, symbol: 0, extended: 0 };
    const printable = [];
    const structural = [];

    String(source || "").split("").forEach(function (ch) {
      const code = ch.charCodeAt(0);
      const plane = classifyByte(code);
      summary[plane] = (summary[plane] || 0) + 1;
      printable.push({ char: ch, code: "0x" + code.toString(16).padStart(2, "0"), plane: plane });
    });

    if (document && document.flat) {
      document.flat.fs.forEach(function (value) { structural.push({ plane: "FS", code: CONTROL_MAP.FS, value: value }); });
      document.flat.gs.forEach(function (value) { structural.push({ plane: "GS", code: CONTROL_MAP.GS, value: value }); });
      document.flat.rs.forEach(function (value) { structural.push({ plane: "RS", code: CONTROL_MAP.RS, value: value }); });
      document.flat.us.forEach(function (entry) { structural.push({ plane: "US", code: CONTROL_MAP.US, value: entry.key + "=" + entry.value }); });
    }

    return {
      summary: summary,
      structural: structural,
      printable: printable
    };
  }

  function renderInspector(view) {
    function chips(items, limit) {
      return items.slice(0, limit).map(function (item) {
        return "<span class=\"chip\">" + item.code + " " + item.plane + " " + escapeHtml(item.value || item.char) + "</span>";
      }).join("");
    }

    return [
      "<div><strong>Structural control projection</strong><div>" + chips(view.structural, 16) + "</div></div>",
      "<div style=\"margin-top:12px;\"><strong>Printable byte projection</strong><div>" + chips(view.printable.filter(function (item) { return item.char.trim() !== ""; }), 24) + "</div></div>"
    ].join("");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return {
    inspectAsciiPlanes: inspectAsciiPlanes,
    renderInspector: renderInspector
  };
}));
