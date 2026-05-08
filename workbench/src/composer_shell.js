(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./model_parser.js") : root.OMIModelParser,
    typeof require === "function" ? require("./edit_log.js") : root.OMIEditLog,
    typeof require === "function" ? require("./source_buffer.js") : root.OMISourceBuffer,
    typeof require === "function" ? require("./stream_declaration.js") : root.OMIStreamDeclaration,
    typeof require === "function" ? require("./stream_projection.js") : root.OMIStreamProjection,
    typeof require === "function" ? require("./spom_adapter.js") : root.OMISPOMAdapter,
    typeof require === "function" ? require("./composition_scene.js") : root.OMICompositionScene,
    typeof require === "function" ? require("./template_registry.js") : root.OMITemplateRegistry,
    typeof require === "function" ? require("./import_pipeline.js") : root.OMIImportPipeline,
    typeof require === "function" ? require("./export_pipeline.js") : root.OMIExportPipeline,
    typeof require === "function" ? require("./drag_drop_composer.js") : root.OMIDragDropComposer,
    typeof require === "function" ? require("./composer_inspector.js") : root.OMIComposerInspector,
    typeof require === "function" ? require("./composer_package.js") : root.OMIComposerPackage,
    typeof require === "function" ? require("./view_switcher.js") : root.OMIViewSwitcher,
    typeof require === "function" ? require("./animation_timeline.js") : root.OMIAnimationTimeline,
    typeof require === "function" ? require("./fractal_subchart_unfolder.js") : root.OMIFractalSubchartUnfolder,
    typeof require === "function" ? require("./cube_differential_template.js") : root.OMICubeDifferentialTemplate,
    typeof require === "function" ? require("./barcode_template_composition.js") : root.OMIBarcodeTemplateComposition,
    typeof require === "function" ? require("./composition_bundle.js") : root.OMICompositionBundle,
    typeof require === "function" ? require("./stream_overlay_package.js") : root.OMIStreamOverlayPackage
  );
  root.OMIComposerShell = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  modelParser,
  editLog,
  sourceBuffer,
  streamDeclaration,
  streamProjection,
  spomAdapter,
  compositionScene,
  templateRegistry,
  importPipeline,
  exportPipeline,
  dragDropComposer,
  composerInspector,
  composerPackage,
  viewSwitcher,
    animationTimeline,
    fractalSubchartUnfolder,
    cubeDifferentialTemplate,
    barcodeTemplateComposition,
    compositionBundle,
    streamOverlayPackage
) {
  "use strict";

  function createComposer(source, options) {
    const initialSource = String(source || "");
    const document = modelParser.parseDocument(initialSource);
    const log = editLog.createEditLog();
    const streamIdRoot = options && options.sceneId ? options.sceneId : (document.id || "composer.scene");
    const stream = streamDeclaration.createStreamDeclaration(initialSource, {
      stream_id: streamIdRoot + "/stream-declaration",
      stream_scope: "pre-os.declaration",
      active_presentation: "barcode"
    });
    const triangulation = spomAdapter.triangulateSource(initialSource, {
      mode: "lazy"
    });
    const switcher = viewSwitcher.createViewSwitcher(document.id, {
      scene: options && options.sceneId ? options.sceneId : "composer.scene",
      mode: "lazy"
    });
    const timeline = animationTimeline.createAnimationTimeline(document.id, {
      scene: options && options.sceneId ? options.sceneId : "composer.scene",
      viewSwitcher: switcher,
      frame: 0
    });
    const subchartUnfolder = fractalSubchartUnfolder.createFractalSubchartUnfolder(document.id, {
      scene: options && options.sceneId ? options.sceneId : "composer.scene",
      mode: "lazy"
    });
    const cubeDifferential = cubeDifferentialTemplate.createCubeDifferentialComponent({
      omi_path: "diagram.two-cube-differential",
      carrier: "Code16K",
      scope: "protected.local",
      witness: document.id
    }, {
      mode: "lazy"
    });
    const barcodeComposition = barcodeTemplateComposition.createBarcodeTemplateComposition({
      omi_path: document.id + "/barcode-composition"
    }, {
      mode: "lazy"
    });

    return {
      panes: ["source", "graph", "stream-declaration", "stream-projection", "semantic-triangulation", "spatial-polyform", "barcode-template", "inspector"],
      source: initialSource,
      document: document,
      sourceBuffer: sourceBuffer.createSourceBuffer(initialSource),
      streamDeclaration: stream,
      triangulation: triangulation,
      editLog: log,
      editLogApi: editLog,
      syncPackets: [],
      scene: compositionScene.createScene(options && options.sceneId ? options.sceneId : "composer.scene"),
      templates: templateRegistry.listTemplates(),
      viewMode: "lazy",
      viewSwitcher: switcher,
      animationTimeline: timeline,
      subchartUnfolder: subchartUnfolder,
      cubeDifferential: cubeDifferential,
      barcodeComposition: barcodeComposition
    };
  }

  function reparse(state, source) {
    state.source = state.sourceBuffer.setSource(source);
    state.document = modelParser.parseDocument(state.source);
    state.triangulation = spomAdapter.triangulateSource(state.source, {
      mode: state.viewMode || "lazy"
    });
    if (state.streamDeclaration) {
      state.streamDeclaration.setSource(state.source);
    }
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

  function declareStreamRegion(state, region) {
    if (!state.streamDeclaration) {
      return null;
    }
    return state.streamDeclaration.declareRegion(region);
  }

  function setStreamPresentation(state, presentation) {
    if (!state.streamDeclaration) {
      return null;
    }
    return state.streamDeclaration.setPresentation(presentation);
  }

  function toggleStreamPresentation(state) {
    if (!state.streamDeclaration) {
      return null;
    }
    return state.streamDeclaration.togglePresentation();
  }

  function currentStreamDeclaration(state) {
    return state.streamDeclaration ? state.streamDeclaration.snapshot() : null;
  }

  function inspectStreamDeclaration(state, index) {
    return state.streamDeclaration ? state.streamDeclaration.resolveIndex(index) : null;
  }

  function projectStreamDeclaration(state, options) {
    if (!state.streamDeclaration) {
      return null;
    }
    return streamProjection.projectStreamDeclaration(state.streamDeclaration.snapshot(), options || {});
  }

  function inspectStreamProjection(state, index, options) {
    if (!state.streamDeclaration) {
      return null;
    }
    return streamProjection.projectStreamIndex(state.streamDeclaration.snapshot(), index, options || {});
  }

  function triangulateSource(source, options) {
    return spomAdapter.triangulateSource(source, options || {});
  }

  function triangulateDeclaration(declaration, options) {
    return spomAdapter.triangulateDeclaration(declaration, options || {});
  }

  function triangulateDocument(document, options) {
    return spomAdapter.triangulateDocument(document, options || {});
  }

  function projectTriangulation(state, mode) {
    if (!state.triangulation) {
      return null;
    }
    return spomAdapter.projectTriangulation(state.triangulation, mode || state.viewMode || "lazy");
  }

  function currentStreamProjection(state) {
    if (!state.streamDeclaration) {
      return null;
    }
    return streamProjection.projectStreamDeclaration(state.streamDeclaration.snapshot(), {
      mode: state.streamDeclaration.snapshot().active.presentation
    });
  }

  function currentTriangulation(state) {
    return state.triangulation ? spomAdapter.projectTriangulation(state.triangulation, state.viewMode || "lazy") : null;
  }

  function exportPackage(state, options) {
    return composerPackage.exportPackage(state, options || {});
  }

  function importPackage(input, options) {
    return composerPackage.importPackage(input, options || {});
  }

  function setViewMode(state, mode) {
    const snapshot = state.viewSwitcher.setMode(mode);
    state.viewMode = state.viewSwitcher.getMode();
    return snapshot;
  }

  function toggleViewMode(state) {
    const snapshot = state.viewSwitcher.toggle();
    state.viewMode = state.viewSwitcher.getMode();
    return snapshot;
  }

  function currentView(state) {
    return state.viewSwitcher ? state.viewSwitcher.snapshot() : null;
  }

  function setAnimationFrame(state, frame) {
    const snapshot = state.animationTimeline.seek(frame);
    state.viewMode = state.viewSwitcher.getMode();
    return snapshot;
  }

  function nextAnimationFrame(state) {
    const snapshot = state.animationTimeline.next();
    state.viewMode = state.viewSwitcher.getMode();
    return snapshot;
  }

  function previousAnimationFrame(state) {
    const snapshot = state.animationTimeline.previous();
    state.viewMode = state.viewSwitcher.getMode();
    return snapshot;
  }

  function currentAnimationFrame(state) {
    return state.animationTimeline ? state.animationTimeline.snapshot() : null;
  }

  function openSubchart(state) {
    const snapshot = state.subchartUnfolder.openSubchart();
    state.viewMode = "greedy";
    if (state.viewSwitcher) {
      state.viewSwitcher.setMode("greedy");
    }
    return snapshot;
  }

  function refoldSubchart(state) {
    const snapshot = state.subchartUnfolder.refoldSubchart();
    state.viewMode = "lazy";
    if (state.viewSwitcher) {
      state.viewSwitcher.setMode("lazy");
    }
    return snapshot;
  }

  function currentSubchart(state) {
    return state.subchartUnfolder ? state.subchartUnfolder.snapshot() : null;
  }

  function setCubeDifferentialMode(state, mode) {
    const snapshot = state.cubeDifferential.setMode(mode);
    return snapshot;
  }

  function toggleCubeDifferentialMode(state) {
    return state.cubeDifferential.toggle();
  }

  function currentCubeDifferential(state) {
    return state.cubeDifferential ? state.cubeDifferential.snapshot() : null;
  }

  function composeBarcodeTemplates(state, templates, options) {
    state.barcodeComposition = barcodeTemplateComposition.composeTemplates(templates, Object.assign({
      composition_id: state.document.id + "/barcode-composition"
    }, options || {}));
    return state.barcodeComposition.snapshot();
  }

  function addBarcodeTemplate(state, template, proposedPath) {
    if (!state.barcodeComposition) {
      state.barcodeComposition = barcodeTemplateComposition.createBarcodeTemplateComposition({
        omi_path: state.document.id + "/barcode-composition"
      }, {
        mode: "lazy"
      });
    }
    const component = state.barcodeComposition.addTemplate(template, proposedPath);
    return component ? state.barcodeComposition.snapshot() : null;
  }

  function connectBarcodeTemplates(state, sourcePath, targetPath, relation) {
    if (!state.barcodeComposition) {
      state.barcodeComposition = barcodeTemplateComposition.createBarcodeTemplateComposition({
        omi_path: state.document.id + "/barcode-composition"
      }, {
        mode: "lazy"
      });
    }
    state.barcodeComposition.connect(sourcePath, targetPath, relation);
    return state.barcodeComposition.snapshot();
  }

  function setBarcodeCompositionMode(state, mode) {
    if (!state.barcodeComposition) {
      return null;
    }
    return state.barcodeComposition.setMode(mode);
  }

  function toggleBarcodeCompositionMode(state) {
    if (!state.barcodeComposition) {
      return null;
    }
    return state.barcodeComposition.toggle();
  }

  function currentBarcodeComposition(state) {
    return state.barcodeComposition ? state.barcodeComposition.snapshot() : null;
  }

  function sealBarcodeComposition(state, signerFixtures) {
    if (!state.barcodeComposition) {
      return null;
    }
    return state.barcodeComposition.seal(signerFixtures);
  }

  function setBarcodeCompositionTrust(state, trustBundle) {
    if (!state.barcodeComposition) {
      return null;
    }
    return state.barcodeComposition.setTrustBundle(trustBundle);
  }

  function currentBarcodeCompositionTrust(state) {
    return state.barcodeComposition ? state.barcodeComposition.trustStatus() : null;
  }

  function exportBarcodeCompositionBundle(state, options) {
    if (!state.barcodeComposition) {
      return null;
    }
    return compositionBundle.exportCompositionBundle(state.barcodeComposition, options || {});
  }

  function importBarcodeCompositionBundle(input) {
    return compositionBundle.importCompositionBundle(input);
  }

  function exportStreamOverlayPackage(state, options) {
    return streamOverlayPackage.exportStreamOverlayPackage(state.streamDeclaration || state, options || {});
  }

  function importStreamOverlayPackage(input) {
    return streamOverlayPackage.importStreamOverlayPackage(input);
  }

  return {
    createComposer: createComposer,
    reparse: reparse,
    importSvgTemplate: importSvgTemplate,
    dropTemplate: dropTemplate,
    connect: connect,
    commit: commit,
    inspect: inspect,
    setViewMode: setViewMode,
    toggleViewMode: toggleViewMode,
    currentView: currentView,
    declareStreamRegion: declareStreamRegion,
    setStreamPresentation: setStreamPresentation,
    toggleStreamPresentation: toggleStreamPresentation,
    currentStreamDeclaration: currentStreamDeclaration,
    inspectStreamDeclaration: inspectStreamDeclaration,
    projectStreamDeclaration: projectStreamDeclaration,
    inspectStreamProjection: inspectStreamProjection,
    currentStreamProjection: currentStreamProjection,
    triangulateSource: triangulateSource,
    triangulateDeclaration: triangulateDeclaration,
    triangulateDocument: triangulateDocument,
    projectTriangulation: projectTriangulation,
    currentTriangulation: currentTriangulation,
    setAnimationFrame: setAnimationFrame,
    nextAnimationFrame: nextAnimationFrame,
    previousAnimationFrame: previousAnimationFrame,
    currentAnimationFrame: currentAnimationFrame,
    openSubchart: openSubchart,
    refoldSubchart: refoldSubchart,
    currentSubchart: currentSubchart,
    setCubeDifferentialMode: setCubeDifferentialMode,
    toggleCubeDifferentialMode: toggleCubeDifferentialMode,
    currentCubeDifferential: currentCubeDifferential,
    composeBarcodeTemplates: composeBarcodeTemplates,
    addBarcodeTemplate: addBarcodeTemplate,
    connectBarcodeTemplates: connectBarcodeTemplates,
    setBarcodeCompositionMode: setBarcodeCompositionMode,
    toggleBarcodeCompositionMode: toggleBarcodeCompositionMode,
    currentBarcodeComposition: currentBarcodeComposition,
    sealBarcodeComposition: sealBarcodeComposition,
    setBarcodeCompositionTrust: setBarcodeCompositionTrust,
    currentBarcodeCompositionTrust: currentBarcodeCompositionTrust,
    exportBarcodeCompositionBundle: exportBarcodeCompositionBundle,
    importBarcodeCompositionBundle: importBarcodeCompositionBundle,
    exportStreamOverlayPackage: exportStreamOverlayPackage,
    importStreamOverlayPackage: importStreamOverlayPackage,
    exportAll: exportAll,
    exportPackage: exportPackage,
    importPackage: importPackage
  };
}));
