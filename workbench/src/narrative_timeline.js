(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("fs") : root.fs,
    typeof require === "function" ? require("path") : root.path,
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./omilisp_declaration.js") : root.OMIOmilispDeclaration
  );
  root.OMINarrativeTimeline = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (fs, path, artifactIdentity, omilispDeclaration) {
  "use strict";

  const DEFAULT_VIEW_MODE = "story";
  const DEFAULT_BASE_DIR = typeof process !== "undefined" && process && process.cwd ? process.cwd() : ".";

  function fnv1a(text) {
    return artifactIdentity.fnv1a(String(text || ""));
  }

  function stableString(value) {
    return artifactIdentity.stableString(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function requireFs() {
    if (!fs || !path) {
      throw new Error("fs-unavailable");
    }
  }

  function normalizeMode(value) {
    const mode = String(value || "");
    if (mode === "lazy" || mode === "barcode") {
      return "lazy";
    }
    if (mode === "greedy" || mode === "movie") {
      return "greedy";
    }
    if (mode === "static" || mode === "codex") {
      return "static";
    }
    if (mode === "animated" || mode === "timeline") {
      return "animated";
    }
    return null;
  }

  function normalizeViewMode(value, mode) {
    const viewMode = String(value || "");
    if (viewMode.trim()) {
      return viewMode;
    }
    if (mode === "lazy") {
      return "story";
    }
    if (mode === "greedy") {
      return "movie";
    }
    if (mode === "static") {
      return "codex";
    }
    if (mode === "animated") {
      return "timeline";
    }
    return DEFAULT_VIEW_MODE;
  }

  function readText(filePath) {
    requireFs();
    return fs.readFileSync(filePath, "utf8");
  }

  function loadDeclaration(input, options) {
    if (!input) {
      return null;
    }
    if (typeof input.snapshot === "function") {
      return loadDeclaration(input.snapshot(), options || {});
    }
    if (typeof input === "string") {
      const text = input.trim();
      if (!text) {
        return null;
      }
      if (text[0] === "(") {
        return omilispDeclaration.parseDeclaration(text);
      }
      if (fs && path) {
        const candidate = path.isAbsolute(text) ? text : path.resolve((options && options.base_dir) || DEFAULT_BASE_DIR, text);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return omilispDeclaration.parseDeclaration(readText(candidate));
        }
      }
      return null;
    }
    if (isPlainObject(input) && input.declaration && input.sections) {
      return input;
    }
    return null;
  }

  function unwrapValue(node, key) {
    if (!node || typeof node !== "object") {
      return null;
    }
    const child = node[key];
    if (child === undefined || child === null) {
      return null;
    }
    if (typeof child === "object" && !Array.isArray(child) && Object.prototype.hasOwnProperty.call(child, "value")) {
      return child.value;
    }
    return child;
  }

  function listChapterEntries(chapters) {
    const order = ["prelude", "article", "aside", "epilogue"];
    const entries = [];
    order.forEach(function (sectionName) {
      const section = chapters && chapters[sectionName];
      if (!section) {
        return;
      }
      let rawEntries;
      if (Array.isArray(section)) {
        rawEntries = section;
      } else if (section.name === "entry") {
        rawEntries = [section];
      } else if (section.entry) {
        rawEntries = Array.isArray(section.entry) ? section.entry : [section.entry];
      } else {
        rawEntries = [];
      }
      rawEntries.forEach(function (entry, index) {
        if (!entry || typeof entry !== "object") {
          return;
        }
        entries.push({
          section: sectionName,
          section_index: index,
          entry: entry
        });
      });
    });
    return entries;
  }

  function deriveMarkdownBeats(markdownText, chapterId, chapterTitle, chapterPath) {
    const text = String(markdownText || "");
    const lines = text.split(/\r?\n/);
    const headingPattern = /^(#{1,6})\s+(.*\S)\s*$/;
    const beats = [];
    let current = null;

    lines.forEach(function (line, lineIndex) {
      const headingMatch = line.match(headingPattern);
      if (headingMatch) {
        if (current) {
          current.end_line = lineIndex;
          current.text = current.lines.join("\n");
          current.content_hash = fnv1a(stableString({
            chapter_id: chapterId,
            heading: current.heading,
            heading_level: current.heading_level,
            lines: current.lines
          }));
          beats.push(current);
        }
        current = {
          beat_index: beats.length,
          heading_level: headingMatch[1].length,
          heading: headingMatch[2],
          start_line: lineIndex + 1,
          end_line: lineIndex + 1,
          lines: [line],
          chapter_id: chapterId,
          chapter_title: chapterTitle,
          chapter_path: chapterPath
        };
        return;
      }
      if (!current) {
        current = {
          beat_index: beats.length,
          heading_level: 0,
          heading: chapterTitle || chapterId,
          start_line: 1,
          end_line: lineIndex + 1,
          lines: [line],
          chapter_id: chapterId,
          chapter_title: chapterTitle,
          chapter_path: chapterPath
        };
        return;
      }
      current.lines.push(line);
      current.end_line = lineIndex + 1;
    });

    if (current) {
      current.text = current.lines.join("\n");
      current.content_hash = fnv1a(stableString({
        chapter_id: chapterId,
        heading: current.heading,
        heading_level: current.heading_level,
        lines: current.lines
      }));
      beats.push(current);
    }

    if (beats.length === 0) {
      beats.push({
        beat_index: 0,
        heading_level: 0,
        heading: chapterTitle || chapterId,
        start_line: 1,
        end_line: lines.length,
        lines: lines,
        text: text,
        chapter_id: chapterId,
        chapter_title: chapterTitle,
        chapter_path: chapterPath,
        content_hash: fnv1a(stableString({
          chapter_id: chapterId,
          chapter_title: chapterTitle,
          text: text
        }))
      });
    }

    return beats.map(function (beat, index) {
      const contentHash = beat.content_hash || fnv1a(stableString({
        chapter_id: chapterId,
        heading: beat.heading,
        heading_level: beat.heading_level,
        text: beat.text || ""
      }));
      return {
        beat_index: index,
        chapter_id: chapterId,
        chapter_title: chapterTitle,
        chapter_path: chapterPath,
        heading: beat.heading,
        heading_level: beat.heading_level,
        start_line: beat.start_line,
        end_line: beat.end_line,
        line_count: Math.max(1, beat.end_line - beat.start_line + 1),
        text: beat.text || beat.lines.join("\n"),
        content_hash: contentHash,
        beat_receipt: fnv1a(stableString({
          chapter_id: chapterId,
          beat_index: index,
          heading: beat.heading,
          heading_level: beat.heading_level,
          content_hash: contentHash,
          chapter_path: chapterPath
        }))
      };
    });
  }

  function parseInterjections(markdownText, chapterId, chapterTitle, chapterPath) {
    const text = String(markdownText || "");
    const lines = text.split(/\r?\n/);
    const overlays = [];
    lines.forEach(function (line, index) {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      if (!/^[-*]\s+/.test(trimmed) && !/^\d+\.\s+/.test(trimmed)) {
        return;
      }
      const overlayText = trimmed.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
      const contentHash = fnv1a(stableString({
        chapter_id: chapterId,
        text: overlayText,
        line: index + 1
      }));
      overlays.push({
        overlay_index: overlays.length,
        chapter_id: chapterId,
        chapter_title: chapterTitle,
        chapter_path: chapterPath,
        line: index + 1,
        text: overlayText,
        content_hash: contentHash,
        overlay_receipt: fnv1a(stableString({
          chapter_id: chapterId,
          overlay_index: overlays.length,
          text: overlayText,
          content_hash: contentHash,
          chapter_path: chapterPath
        })),
        kind: "overlay-candidate"
      });
    });
    return overlays;
  }

  function flattenDeclarationChapters(view) {
    const chapters = [];
    const entries = listChapterEntries(view.chapters || {});
    entries.forEach(function (item) {
      const entry = item.entry;
      chapters.push({
        section: item.section,
        section_index: item.section_index,
        sid: String(unwrapValue(entry, "sid") || (item.section + "." + item.section_index)),
        title: String(unwrapValue(entry, "title") || unwrapValue(entry, "roman") || unwrapValue(entry, "label") || item.section + " " + item.section_index),
        path: String(unwrapValue(entry, "path") || ""),
        kind: item.section
      });
    });
    return chapters;
  }

  function deriveNarrativeModel(input, options) {
    const declaration = loadDeclaration(input, options || {});
    if (!declaration || !declaration.declaration) {
      throw new Error("invalid-narrative-declaration");
    }

    const view = omilispDeclaration.stableDeclarationView(declaration);
    const rootIdentity = view.identity || {};
    const root = String((rootIdentity && (rootIdentity.sid || rootIdentity.value)) || view.root || declaration.root || "narrative-series");
    const scope = view.scope || {};
    const chapterEntries = flattenDeclarationChapters(view);
    const baseDir = (options && options.base_dir) || DEFAULT_BASE_DIR;
    const scenes = [];
    const frames = [];
    const interjections = [];
    const triplets = [];
    const relations = declaration.declaration.relations || {};
    const chapterOrder = [];
    const sceneOrder = [];
    const beatOrder = [];
    let globalFrameIndex = 0;

    chapterEntries.forEach(function (chapter, chapterIndex) {
      const resolvedPath = chapter.path ? (path.isAbsolute(chapter.path) ? chapter.path : path.resolve(baseDir, chapter.path)) : null;
      if (!resolvedPath || !fs.existsSync(resolvedPath)) {
        throw new Error("missing-narrative-chapter:" + chapter.path);
      }
      const text = readText(resolvedPath);
      const lineCount = text.split(/\r?\n/).length;
      const wordCount = (text.match(/[A-Za-z][A-Za-z'-]{2,}/g) || []).length;
      const headingCount = (text.match(/^#{1,6}\s+/gm) || []).length;
      const contentHash = fnv1a(stableString({
        chapter_id: chapter.sid,
        title: chapter.title,
        path: chapter.path,
        text: text
      }));
      const beats = deriveMarkdownBeats(text, chapter.sid, chapter.title, chapter.path);
      const sceneReceipt = fnv1a(stableString({
        root: root,
        chapter_id: chapter.sid,
        title: chapter.title,
        path: chapter.path,
        content_hash: contentHash,
        beat_receipts: beats.map(function (beat) {
          return beat.beat_receipt;
        })
      }));

      chapterOrder.push(chapter.sid);
      sceneOrder.push(chapter.sid);
      beats.forEach(function (beat) {
        const frameReceipt = fnv1a(stableString({
          root: root,
          chapter_id: chapter.sid,
          beat_receipt: beat.beat_receipt,
          frame_index: globalFrameIndex
        }));
        frames.push({
          frame_index: globalFrameIndex,
          scene_id: chapter.sid,
          chapter_id: chapter.sid,
          chapter_title: chapter.title,
          chapter_path: chapter.path,
          beat_index: beat.beat_index,
          beat_heading: beat.heading,
          beat_heading_level: beat.heading_level,
          line_count: beat.line_count,
          content_hash: beat.content_hash,
          frame_receipt: frameReceipt,
          kind: "frame"
        });
        beatOrder.push(chapter.sid + "#" + beat.beat_index);
        globalFrameIndex += 1;
      });

      scenes.push({
        scene_index: chapterIndex,
        scene_id: chapter.sid,
        chapter_id: chapter.sid,
        chapter_section: chapter.section,
        title: chapter.title,
        path: chapter.path,
        line_count: lineCount,
        word_count: wordCount,
        heading_count: headingCount,
        beat_count: beats.length,
        content_hash: contentHash,
        beat_receipts: beats.map(function (beat) {
          return beat.beat_receipt;
        }),
        scene_receipt: sceneReceipt,
        kind: "scene"
      });

      if (chapter.section === "aside") {
        const overlays = parseInterjections(text, chapter.sid, chapter.title, chapter.path);
        overlays.forEach(function (overlay) {
          interjections.push(overlay);
          triplets.push({
            subject: root,
            predicate: "interjection",
            object: overlay.overlay_receipt,
            coordinates: {
              fs: root,
              gs: "aside",
              rs: overlay.chapter_id,
              us: "interjection"
            },
            modality: {
              source_kind: "narrative",
              authority: "projection",
              scope: "overlay.candidate",
              evidence: "aside",
              kind: "overlay",
              section: "aside",
              path: overlay.chapter_path + "#overlay-" + overlay.overlay_index,
              view: "movie",
              hearing: {
                subject_band: "latin",
                predicate_band: "latin",
                object_band: "digit",
                modality_band: "latin"
              }
            }
          });
        });
      }
    });

    Object.keys(relations).forEach(function (key) {
      const relation = relations[key];
      if (!relation) {
        return;
      }
      if (key === "next" && Array.isArray(relation)) {
        relation.forEach(function (item, index) {
          if (!item || typeof item !== "object" || !item.from || !item.to) {
            return;
          }
          triplets.push({
            subject: String(item.from),
            predicate: "next",
            object: String(item.to),
            coordinates: {
              fs: root,
              gs: "relations",
              rs: String(item.to),
              us: "next"
            },
            modality: {
              source_kind: "narrative",
              authority: "declaration",
              scope: "chapter.relation",
              evidence: "relation",
              kind: "relation",
              section: "relations",
              path: "relations/next/" + index,
              view: "movie",
              hearing: {
                subject_band: "latin",
                predicate_band: "latin",
                object_band: "latin",
                modality_band: "latin"
              }
            }
          });
        });
      }
      if (relation && typeof relation === "object" && !Array.isArray(relation)) {
        Object.keys(relation).forEach(function (subKey) {
          const value = relation[subKey];
          if (Array.isArray(value)) {
            value.forEach(function (item, index) {
              if (!item || typeof item !== "object") {
                return;
              }
              const subject = String(unwrapValue(item, "from") || unwrapValue(item, "subject") || subKey);
              const object = String(unwrapValue(item, "to") || unwrapValue(item, "target") || unwrapValue(item, "requires") || unwrapValue(item, "value") || "");
              if (!object) {
                return;
              }
              triplets.push({
                subject: subject,
                predicate: subKey,
                object: object,
                coordinates: {
                  fs: root,
                  gs: "relations",
                  rs: subject,
                  us: subKey
                },
                modality: {
                  source_kind: "narrative",
                  authority: "declaration",
                  scope: "chapter.relation",
                  evidence: "relation",
                  kind: "relation",
                  section: "relations",
                  path: "relations/" + subKey + "/" + index,
                  view: "movie",
                  hearing: {
                    subject_band: "latin",
                    predicate_band: "latin",
                    object_band: "latin",
                    modality_band: "latin"
                  }
                }
              });
            });
          }
        });
      }
    });

    chapterEntries.forEach(function (chapter, chapterIndex) {
      triplets.push({
        subject: root,
        predicate: "chapter",
        object: chapter.sid,
        coordinates: {
          fs: root,
          gs: chapter.section,
          rs: chapter.sid,
          us: "chapter"
        },
        modality: {
          source_kind: "narrative",
          authority: "declaration",
          scope: scope.kind || "narrative.world",
          evidence: "chapter",
          kind: "chapter",
          section: chapter.section,
          path: chapter.path,
          view: "movie",
          hearing: {
            subject_band: "latin",
            predicate_band: "latin",
            object_band: "latin",
            modality_band: "latin"
          }
        }
      });
      triplets.push({
        subject: chapter.sid,
        predicate: "title",
        object: chapter.title,
        coordinates: {
          fs: root,
          gs: chapter.section,
          rs: chapter.sid,
          us: "title"
        },
        modality: {
          source_kind: "narrative",
          authority: "declaration",
          scope: scope.kind || "narrative.world",
          evidence: "field",
          kind: "field",
          section: chapter.section,
          path: chapter.path,
          view: "movie",
          hearing: {
            subject_band: "latin",
            predicate_band: "latin",
            object_band: "latin",
            modality_band: "latin"
          }
        }
      });
      triplets.push({
        subject: chapter.sid,
        predicate: "path",
        object: chapter.path,
        coordinates: {
          fs: root,
          gs: chapter.section,
          rs: chapter.sid,
          us: "path"
        },
        modality: {
          source_kind: "narrative",
          authority: "declaration",
          scope: scope.kind || "narrative.world",
          evidence: "field",
          kind: "field",
          section: chapter.section,
          path: chapter.path,
          view: "movie",
          hearing: {
            subject_band: "latin",
            predicate_band: "latin",
            object_band: "latin",
            modality_band: "latin"
          }
        }
      });
      triplets.push({
        subject: chapter.sid,
        predicate: "frame-count",
        object: beatsCountForChapter(chapter.sid, scenes),
        coordinates: {
          fs: root,
          gs: chapter.section,
          rs: chapter.sid,
          us: "frame-count"
        },
        modality: {
          source_kind: "narrative",
          authority: "declaration",
          scope: scope.kind || "narrative.world",
          evidence: "frame",
          kind: "frame",
          section: chapter.section,
          path: chapter.path,
          view: "movie",
          hearing: {
            subject_band: "latin",
            predicate_band: "latin",
            object_band: "digit",
            modality_band: "digit"
          }
        }
      });
    });

    return {
      declaration: declaration,
      view: view,
      root: root,
      scope: scope,
      chapters: chapterEntries,
      scenes: scenes,
      frames: frames,
      interjections: interjections,
      triplets: triplets,
      summary: {
        chapter_count: chapterEntries.length,
        scene_count: scenes.length,
        beat_count: frames.length,
        interjection_count: interjections.length,
        frame_count: frames.length,
        chapter_order: chapterEntries.map(function (chapter) { return chapter.sid; }),
        scene_order: sceneOrder,
        beat_order: beatOrder,
        interjection_order: interjections.map(function (overlay) { return overlay.overlay_receipt; }),
        section_order: view.sections.map(function (section) { return section.name; })
      }
    };
  }

  function beatsCountForChapter(chapterId, scenes) {
    const scene = scenes.find(function (item) {
      return item.chapter_id === chapterId;
    });
    return scene ? scene.beat_count : 0;
  }

  function createNarrativeTimeline(input, options) {
    const model = deriveNarrativeModel(input, options || {});
    const activeProjection = normalizeMode(options && options.mode !== undefined ? options.mode : "lazy");
    const activeView = normalizeViewMode(options && options.view_mode !== undefined ? options.view_mode : DEFAULT_VIEW_MODE, activeProjection);
    const identityReceipt = fnv1a(stableString({
      root: model.root,
      declaration_identity: model.declaration.identity_receipt,
      summary: model.summary,
      chapters: model.chapters.map(function (chapter) {
        return {
          sid: chapter.sid,
          title: chapter.title,
          path: chapter.path
        };
      }),
      scenes: model.scenes.map(function (scene) {
        return {
          scene_id: scene.scene_id,
          content_hash: scene.content_hash,
          beat_receipts: scene.beat_receipts
        };
      }),
      frames: model.frames.map(function (frame) {
        return {
          frame_index: frame.frame_index,
          frame_receipt: frame.frame_receipt
        };
      }),
      interjections: model.interjections.map(function (overlay) {
        return {
          overlay_receipt: overlay.overlay_receipt,
          text: overlay.text
        };
      }),
      triplets: model.triplets.map(function (triplet) {
        return {
          subject: triplet.subject,
          predicate: triplet.predicate,
          object: triplet.object,
          modality: triplet.modality.kind,
          receipt: fnv1a(stableString({
            subject: triplet.subject,
            predicate: triplet.predicate,
            object: triplet.object,
            modality: triplet.modality.kind,
            path: triplet.modality.path
          }))
        };
      })
    }));

    const timeline = {
      source_kind: "narrative",
      root: model.root,
      scope: model.scope,
      declaration: clone(model.declaration),
      chapters: clone(model.chapters),
      scenes: clone(model.scenes),
      frames: clone(model.frames),
      interjections: clone(model.interjections),
      triplets: clone(model.triplets),
      summary: clone(model.summary),
      active: {
        projection_mode: activeProjection || "lazy",
        view_mode: activeView
      },
      identity_receipt: identityReceipt,
      projection_receipt: 0,
      package_receipt: 0,
      view_receipt: 0
    };

    timeline.receipts = {
      identity_receipt: identityReceipt,
      projection_receipt: 0,
      package_receipt: 0,
      view_receipt: 0
    };

    return timeline;
  }

  function projectNarrativeTimeline(input, options) {
    if (!input) {
      throw new Error("invalid-narrative-projection");
    }
    const timeline = typeof input === "string" && input.trim().startsWith("{") ? JSON.parse(input) : input;
    const model = timeline && timeline.identity_receipt ? timeline : createNarrativeTimeline(input, options || {});
    const projectionMode = normalizeMode(options && options.mode !== undefined ? options.mode : (model.active && model.active.projection_mode) || "lazy");
    if (!projectionMode) {
      throw new Error("invalid-narrative-projection");
    }
    const viewMode = normalizeViewMode(options && options.view_mode !== undefined ? options.view_mode : (model.active && model.active.view_mode), projectionMode);

    let projectionSurfaceCore;
    if (projectionMode === "lazy") {
      projectionSurfaceCore = {
        mode: projectionMode,
        view: "lazy",
        carrier: "markdown",
        sealed_address: model.root,
        chapter_order: model.summary.chapter_order,
        chapter_count: model.summary.chapter_count,
        scene_count: model.summary.scene_count,
        beat_count: model.summary.beat_count,
        interjection_count: model.summary.interjection_count,
        sealed_timeline: {
          root: model.root,
          chapter_order: model.summary.chapter_order,
          scene_order: model.summary.scene_order,
          beat_order: model.summary.beat_order,
          interjection_order: model.summary.interjection_order,
          chapter_count: model.summary.chapter_count,
          scene_count: model.summary.scene_count,
          beat_count: model.summary.beat_count,
          interjection_count: model.summary.interjection_count,
          witness: model.identity_receipt
        },
        preview_interjections: model.interjections.slice(0, 3)
      };
    } else if (projectionMode === "greedy") {
      projectionSurfaceCore = {
        mode: projectionMode,
        view: "greedy",
        carrier: "movie",
        movie: {
          root: model.root,
          chapter_order: model.summary.chapter_order,
          scene_order: model.summary.scene_order,
          beat_order: model.summary.beat_order,
          chapter_count: model.summary.chapter_count,
          scene_count: model.summary.scene_count,
          beat_count: model.summary.beat_count,
          frame_count: model.summary.frame_count,
          chapters: model.chapters,
          scenes: model.scenes,
          frames: model.frames,
          interjections: model.interjections
        }
      };
    } else if (projectionMode === "static") {
      projectionSurfaceCore = {
        mode: projectionMode,
        view: "static",
        declared_space: {
          root: model.root,
          section_order: model.summary.section_order,
          chapter_order: model.summary.chapter_order,
          scene_order: model.summary.scene_order,
          beat_order: model.summary.beat_order,
          interjection_order: model.summary.interjection_order,
          chapter_count: model.summary.chapter_count,
          scene_count: model.summary.scene_count,
          beat_count: model.summary.beat_count,
          frame_count: model.summary.frame_count
        },
        reconciliation: "stable"
      };
    } else if (projectionMode === "animated") {
      projectionSurfaceCore = {
        mode: projectionMode,
        view: "animated",
        timeline: {
          root: model.root,
          frame_count: model.summary.frame_count,
          frame_start: 0,
          frame_end: model.summary.frame_count,
          coordination: "declared-world walk",
          frames: model.frames,
          scenes: model.scenes,
          chapters: model.chapters,
          interjections: model.interjections
        }
      };
    } else {
      throw new Error("invalid-narrative-projection");
    }

    const projectionReceipt = fnv1a(stableString({
      identity_receipt: model.identity_receipt,
      projection_mode: projectionMode,
      surface: projectionSurfaceCore
    }));

    const projectionSurface = Object.assign({}, projectionSurfaceCore, {
      identity_receipt: model.identity_receipt,
      projection_receipt: projectionReceipt
    });

    const viewSurface = Object.assign({}, projectionSurface, {
      view_mode: viewMode,
      presentation: viewMode
    });

    const viewReceipt = fnv1a(stableString({
      identity_receipt: model.identity_receipt,
      projection_mode: projectionMode,
      view_mode: viewMode,
      surface: viewSurface
    }));

    return Object.assign({}, viewSurface, {
      projection_mode: projectionMode,
      view_mode: viewMode,
      projection_surface: projectionSurface,
      view_surface: viewSurface,
      identity_receipt: model.identity_receipt,
      projection_receipt: projectionReceipt,
      package_receipt: 0,
      view_receipt: viewReceipt,
      receipts: {
        identity_receipt: model.identity_receipt,
        projection_receipt: projectionReceipt,
        package_receipt: 0,
        view_receipt: viewReceipt
      }
    });
  }

  function decorateTimeline(timeline) {
    const data = clone(timeline);
    const api = clone(data);

    Object.defineProperties(api, {
      snapshot: {
        enumerable: false,
        value: function snapshot() {
          return clone(data);
        }
      },
      project: {
        enumerable: false,
        value: function project(mode, viewMode) {
          return projectNarrativeTimeline(data, {
            mode: mode,
            view_mode: viewMode
          });
        }
      }
    });

    return api;
  }

  return {
    createNarrativeTimeline: function createNarrativeTimelineApi(input, options) {
      const timeline = createNarrativeTimeline(input, options || {});
      return decorateTimeline(timeline);
    },
    projectNarrativeTimeline: function projectNarrativeTimelineApi(input, options) {
      const projection = projectNarrativeTimeline(input, options || {});
      if (!projection) {
        throw new Error("invalid-narrative-projection");
      }
      return projection;
    }
  };
}));
