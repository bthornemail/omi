(function (root, factory) {
  const api = factory();
  root.OMITreeView = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function renderUnits(units) {
    return "<ul>" + units.map(function (unit) {
      return "<li data-omi-path=\"" + escapeHtml(unit.path || "") + "\"><strong>US</strong> " + escapeHtml(unit.key) + " = " + escapeHtml(unit.value) + "</li>";
    }).join("") + "</ul>";
  }

  function renderTree(document) {
    return "<ul>" + document.groups.map(function (group) {
      return "<li data-omi-path=\"" + escapeHtml(document.id + "/" + group.id) + "\"><strong>GS</strong> " + escapeHtml(group.id) +
        "<ul>" + group.records.map(function (record) {
          return "<li data-omi-path=\"" + escapeHtml(record.path || "") + "\"><strong>RS</strong> " + escapeHtml(record.id) + renderUnits(record.units) + "</li>";
        }).join("") + "</ul></li>";
    }).join("") + "</ul>";
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return {
    renderTree: renderTree
  };
}));
