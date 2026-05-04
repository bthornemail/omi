(function (root, factory) {
  const api = factory();
  root.OMIGraphView = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function renderGraph(document) {
    if (document.kind !== "world") {
      return "<div class=\"edge-card\" data-omi-path=\"" + escapeHtml(document.id) + "\"><strong>Model graph</strong><p class=\"muted\">Relation graph is centered on world interaction edges. This model view exposes grouped part records instead.</p></div>";
    }

    return [
      "<div class=\"edge-card\"><strong>Nodes</strong><div>" +
      document.graph.nodes.map(function (node) {
        return "<span class=\"chip\" data-omi-path=\"" + escapeHtml(node.path || "") + "\">" + escapeHtml(node.label) + "</span>";
      }).join("") + "</div></div>",
      document.graph.edges.map(function (edge) {
        return "<div class=\"edge-card\" data-omi-path=\"" + escapeHtml(edge.path || "") + "\"><strong>" + escapeHtml(edge.id) + "</strong><div class=\"muted\">" +
          escapeHtml(edge.source) + " -> " + escapeHtml(edge.target) +
          "</div><div>" + escapeHtml(edge.relation) + "</div></div>";
      }).join("")
    ].join("");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return {
    renderGraph: renderGraph
  };
}));
