(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./edit_log.js") : root.OMIEditLog,
    typeof require === "function" ? require("./source_buffer.js") : root.OMISourceBuffer,
    typeof require === "function" ? require("./composition_scene.js") : root.OMICompositionScene
  );
  root.OMIDragDropComposer = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (editLog, sourceBuffer, compositionScene) {
  "use strict";

  function dropTemplate(state, template, proposedPath) {
    const component = compositionScene.addComponent(state.scene, template, proposedPath);
    const proposalText = sourceBuffer.proposePropertyEdit(
      state.document,
      component.id,
      "US . component-source",
      component.path
    );
    const proposal = editLog.appendProposal(state.editLog, {
      action: "ADD_COMPONENT",
      path: component.path,
      proposalText: proposalText
    });
    return {
      component: component,
      proposal: proposal
    };
  }

  function connectComponents(state, sourcePath, targetPath, relation) {
    const edge = compositionScene.addRelation(state.scene, sourcePath, targetPath, relation || "related-to");
    const proposalText = sourceBuffer.proposeRelationEdit(sourcePath, targetPath, edge.relation);
    const proposal = editLog.appendProposal(state.editLog, {
      action: "CREATE_RELATION",
      path: edge.id,
      proposalText: proposalText
    });
    return {
      relation: edge,
      proposal: proposal
    };
  }

  function commit(state, proposalSeq) {
    return editLog.commitProposal(state.editLog, proposalSeq);
  }

  return {
    dropTemplate: dropTemplate,
    connectComponents: connectComponents,
    commit: commit
  };
}));
