(function (root, factory) {
  const api = factory();
  root.OMICanvas2DBackend = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function buildProjection(document, shapes, depth) {
    return {
      backend: "canvas2d",
      documentId: document.id,
      depth: depth,
      width: 260,
      height: 170,
      operations: shapes.map(function (shape) {
        return Object.assign({
          data: {
            omiPath: shape.path,
            omiFs: document.id,
            omiDepth: depth
          }
        }, shape);
      })
    };
  }

  function renderToCanvas(canvas, projection) {
    if (!canvas || !canvas.getContext) {
      return;
    }
    const ctx = canvas.getContext("2d");
    canvas.width = projection.width;
    canvas.height = projection.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#0f766e";
    ctx.fillStyle = "#ccfbf1";
    ctx.lineWidth = 2;
    projection.operations.forEach(function (op) {
      if (op.kind === "rect") {
        ctx.strokeRect(op.x, op.y, op.w, op.h);
      } else if (op.kind === "circle") {
        ctx.beginPath();
        ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (op.kind === "line") {
        ctx.beginPath();
        ctx.moveTo(op.x1, op.y1);
        ctx.lineTo(op.x2, op.y2);
        ctx.stroke();
      } else if (op.kind === "polyline") {
        ctx.beginPath();
        for (let i = 0; i < op.points.length; i += 2) {
          if (i === 0) {
            ctx.moveTo(op.points[i], op.points[i + 1]);
          } else {
            ctx.lineTo(op.points[i], op.points[i + 1]);
          }
        }
        ctx.stroke();
      } else if (op.kind === "node") {
        ctx.beginPath();
        ctx.arc(op.x, op.y, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText(op.label, op.x - 18, op.y + 30);
      }
    });
  }

  return {
    buildProjection: buildProjection,
    renderToCanvas: renderToCanvas
  };
}));
