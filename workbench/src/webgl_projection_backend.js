(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./gpu_command_stream.js") : root.OMIGPUCommandStream
  );
  root.OMIWebGLProjectionBackend = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (gpuCommandStream) {
  "use strict";

  function project(options) {
    return gpuCommandStream.project(options);
  }

  return {
    project: project
  };
}));
