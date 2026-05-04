(function (root, factory) {
  const api = factory();
  root.OMITrampPath = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function parse(pathText) {
    const text = String(pathText || "");
    const match = text.match(/^\/([^:]+):([^:]+):(.+)$/);
    if (!match) {
      return null;
    }

    const method = match[1];
    const target = match[2];
    const path = match[3];
    let user = "";
    let host = target;

    if (target.indexOf("@") >= 0) {
      const parts = target.split("@");
      user = parts[0];
      host = parts.slice(1).join("@");
    }

    return {
      method: method,
      user: user,
      host: host,
      path: path,
      authority: "carrier-locator"
    };
  }

  return {
    parse: parse
  };
}));
