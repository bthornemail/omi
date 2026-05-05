(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./model_parser.js") : root.OMIModelParser,
    typeof require === "function" ? require("./edit_log.js") : root.OMIEditLog,
    typeof require === "function" ? require("./source_buffer.js") : root.OMISourceBuffer,
    typeof require === "function" ? require("./composition_scene.js") : root.OMICompositionScene,
    typeof require === "function" ? require("./template_registry.js") : root.OMITemplateRegistry,
    typeof require === "function" ? require("./import_pipeline.js") : root.OMIImportPipeline,
    typeof require === "function" ? require("./export_pipeline.js") : root.OMIExportPipeline,
    typeof require === "function" ? require("./drag_drop_composer.js") : root.OMIDragDropComposer,
    typeof require === "function" ? require("./composer_inspector.js") : root.OMIComposerInspector,
    typeof require === "function" ? require("./composer_package.js") : root.OMIComposerPackage
  );
  root.OMIComposerShell = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  modelParser,
  editLog,
  sourceBuffer,
  compositionScene,
  templateRegistry,
  importPipeline,
  exportPipeline,
  dragDropComposer,
  composerInspector,
  composerPackage
) {
  "use strict";

  function createComposer(source, options) {
    const initialSource = String(source || "");
    const document = modelParser.parseDocument(initialSource);
    const log = editLog.createEditLog();
    return {
      panes: ["source", "graph", "spatial-polyform", "barcode-template", "inspector"],
      source: initialSource,
      document: document,
      sourceBuffer: sourceBuffer.createSourceBuffer(initialSource),
      editLog: log,
      editLogApi: editLog,
      syncPackets: [],
      scene: compositionScene.createScene(options && options.sceneId ? options.sceneId : "composer.scene"),
      templates: templateRegistry.listTemplates()
    };
  }

  function reparse(state, source) {
    state.source = state.sourceBuffer.setSource(source);
    state.document = modelParser.parseDocument(state.source);
    return state.document;
  }

  function importSvgTemplate(state, svgText) {
    const imported = importPipeline.importSvgTemplate(svgText);
    if (imported.ok) {
      state.lastImport = imported;
    }
    return imported;
  }

  function dropTemplate(state, template, proposedPath) {
    return dragDropComposer.dropTemplate(state, template, proposedPath);
  }

  function connect(state, sourcePath, targetPath, relation) {
    return dragDropComposer.connectComponents(state, sourcePath, targetPath, relation);
  }

  function commit(state, proposalSeq) {
    return dragDropComposer.commit(state, proposalSeq);
  }

  function inspect(state, path) {
    return composerInspector.inspectPath(state, path);
  }

  function exportAll(state) {
    return exportPipeline.exportAll(state);
  }

  function exportPackage(state, options) {
    return composerPackage.exportPackage(state, options || {});
  }

  function importPackage(input) {
    return composerPackage.importPackage(input);
  }

  return {
    createComposer: createComposer,
    reparse: reparse,
    importSvgTemplate: importSvgTemplate,
    dropTemplate: dropTemplate,
    connect: connect,
    commit: commit,
    inspect: inspect,
    exportAll: exportAll,
    exportPackage: exportPackage,
    importPackage: importPackage
  };
}));
