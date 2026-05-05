(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./diagram_fixture_registry.js") : root.OMIDiagramFixtureRegistry
  );
  root.OMITemplateRegistry = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (diagramFixtureRegistry) {
  "use strict";

  function listTemplates() {
    return diagramFixtureRegistry.listFixtures().map(function (fixture) {
      return {
        id: fixture.id,
        kind: "diagram-fixture",
        family: fixture.family,
        carrier: fixture.carrier,
        scope: fixture.scope,
        template_id: fixture.template_id,
        source: fixture.source
      };
    });
  }

  function getTemplate(id) {
    const fixture = diagramFixtureRegistry.getFixture(id);
    if (!fixture) {
      return null;
    }
    return {
      id: fixture.id,
      kind: "diagram-fixture",
      family: fixture.family,
      carrier: fixture.carrier,
      scope: fixture.scope,
      template_id: fixture.template_id,
      source: fixture.source
    };
  }

  return {
    listTemplates: listTemplates,
    getTemplate: getTemplate
  };
}));
