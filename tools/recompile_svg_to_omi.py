#!/usr/bin/env python3
"""Recompile SVG XML carriers into OMI-LISP declaration forms.

This is a carrier-to-declaration projection: SVG remains the observed source,
OMI-LISP becomes the canonical declaration surface for downstream projection,
verification, and receipts.
"""
from __future__ import annotations
import hashlib
import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Iterable

SOURCES = [
    "Genaille_division_rods.txt",
    "Karnaugh_map_torus.txt",
    "Four_bit_adder_with_carry_lookahead.txt",
    "Distances_between_double_cube_corners.txt",
    "Smith_chart_gen.txt",
    "01-_Dreiteilung_des_Winkels_60°.txt",
]

KIND_BY_FILE = {
    "Genaille_division_rods.txt": "arithmetic.rod.svg",
    "Karnaugh_map_torus.txt": "boolean.torus.svg",
    "Four_bit_adder_with_carry_lookahead.txt": "logic.circuit.svg",
    "Distances_between_double_cube_corners.txt": "geometry.distance.svg",
    "Smith_chart_gen.txt": "projection.curve.svg",
    "01-_Dreiteilung_des_Winkels_60°.txt": "geometry.construction.svg",
}

SID_BY_FILE = {
    "Genaille_division_rods.txt": "genaille-division-rods",
    "Karnaugh_map_torus.txt": "karnaugh-map-torus",
    "Four_bit_adder_with_carry_lookahead.txt": "four-bit-adder-carry-lookahead",
    "Distances_between_double_cube_corners.txt": "double-cube-corner-distances",
    "Smith_chart_gen.txt": "smith-chart-generator",
    "01-_Dreiteilung_des_Winkels_60°.txt": "angle-trisection-60deg",
}

TITLE_BY_FILE = {
    "Genaille_division_rods.txt": "Genaille Division Rods",
    "Karnaugh_map_torus.txt": "Karnaugh Map Torus",
    "Four_bit_adder_with_carry_lookahead.txt": "Four Bit Adder With Carry Lookahead",
    "Distances_between_double_cube_corners.txt": "Distances Between Double Cube Corners",
    "Smith_chart_gen.txt": "Smith Chart Generator",
    "01-_Dreiteilung_des_Winkels_60°.txt": "Dreiteilung des Winkels 60°",
}


def strip_doctype(s: str) -> str:
    return re.sub(r"<!DOCTYPE[^>]*(?:\[[\s\S]*?\]\s*)?>", "", s)


def local_name(q: str) -> str:
    if "}" in q:
        return q.split("}", 1)[1]
    if ":" in q:
        return q.split(":", 1)[1]
    return q


def sym(s: str) -> str:
    s = local_name(s)
    s = re.sub(r"[^A-Za-z0-9_+\-./:?]", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "unnamed"


def q(s: str) -> str:
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '') + '"'


def sha256_text(s: str) -> str:
    return "sha256:" + hashlib.sha256(s.encode("utf-8", errors="surrogatepass")).hexdigest()


def sha256_bytes(b: bytes) -> str:
    return "sha256:" + hashlib.sha256(b).hexdigest()


def count_tags(root: ET.Element) -> Dict[str, int]:
    out: Dict[str, int] = {}
    for el in root.iter():
        t = local_name(el.tag)
        out[t] = out.get(t, 0) + 1
    return dict(sorted(out.items()))


def element_form(el: ET.Element, depth: int = 0, path: str = "0") -> str:
    tag = sym(el.tag)
    attrs = []
    for k in sorted(el.attrib):
        attrs.append(f"({sym(k)} {q(el.attrib[k])})")
    attr_block = "" if not attrs else "\n" + "  " * (depth + 2) + "(attrs\n" + "\n".join("  " * (depth + 3) + a for a in attrs) + "\n" + "  " * (depth + 2) + ")"
    text = (el.text or "").strip()
    text_block = "" if not text else "\n" + "  " * (depth + 2) + f"(text {q(text)})"
    children = list(el)
    child_block = ""
    if children:
        pieces = [element_form(c, depth + 3, f"{path}.{i}") for i, c in enumerate(children)]
        child_block = "\n" + "  " * (depth + 2) + "(children\n" + "\n".join(pieces) + "\n" + "  " * (depth + 2) + ")"
    return "  " * depth + f"(element\n" + \
           "  " * (depth + 1) + f"(tag {tag})\n" + \
           "  " * (depth + 1) + f"(path {q(path)})" + \
           attr_block + text_block + child_block + "\n" + "  " * depth + ")"


def compile_one(src_dir: Path, filename: str) -> tuple[str, Dict[str, int], str]:
    p = src_dir / filename
    raw = p.read_bytes()
    text = raw.decode("utf-8", errors="replace")
    root = ET.fromstring(strip_doctype(text))
    counts = count_tags(root)
    sid = SID_BY_FILE[filename]
    module = f"""(omi
  (identity
    (sid {sid})
    (title {q(TITLE_BY_FILE[filename])})
    (kind {KIND_BY_FILE[filename]})
    (source {q(filename)}))
  (address
    (addr {sid}.addr128)
    (locator addr128.v0)
    (binding svg-carrier.binding.v0))
  (scope
    (fs omi-svg-composer)
    (gs {sid})
    (rs svg-element)
    (us attribute))
  (carrier
    (format image/svg+xml)
    (source-bytes {len(raw)})
    (source-digest {q(sha256_bytes(raw))})
    (parse xml.elementtree)
    (doctype stripped-for-parse))
  (svg
    (root-tag {sym(root.tag)})
    (width {q(root.attrib.get('width', ''))})
    (height {q(root.attrib.get('height', ''))})
    (viewBox {q(root.attrib.get('viewBox', ''))}))
  (counts
"""
    for k, v in counts.items():
        module += f"    ({sym(k)} {v})\n"
    module += "  )\n  (tree\n"
    module += element_form(root, depth=2, path="0")
    module += "\n  )\n  (projections\n    (lazy ndjson)\n    (greedy svg-roundtrip)\n    (static declaration-codex)\n    (animated composer-trace))\n  (receipts\n    (identity pending)\n    (projection pending)\n    (package pending)\n    (view pending)))\n"
    return module, counts, sha256_bytes(raw)


def main(argv: list[str]) -> int:
    src_dir = Path(argv[1]) if len(argv) > 1 else Path("/mnt/data")
    out = Path(argv[2]) if len(argv) > 2 else Path("/mnt/data/omi-svg-recompiled.omi")
    modules = []
    summary = []
    for fn in SOURCES:
        module, counts, digest = compile_one(src_dir, fn)
        modules.append(module)
        summary.append((fn, counts, digest))
    prelude = ";; Generated by recompile_svg_to_omi.py\n;; Authority: SVG source carriers observed, OMI-LISP declaration emitted.\n\n"
    bundle = prelude + "\n".join(modules)
    out.write_text(bundle, encoding="utf-8")
    manifest = Path(str(out).replace(".omi", ".manifest.omi"))
    man = "(omi\n  (identity\n    (sid omi-svg-recompiled-bundle)\n    (title \"OMI SVG Recompiled Bundle Manifest\")\n    (kind package.manifest)\n    (source \"omi-svg-recompiled.omi\"))\n  (package\n"
    for fn, counts, digest in summary:
        man += f"    (entry (sid {SID_BY_FILE[fn]}) (source {q(fn)}) (digest {q(digest)}) (elements {sum(counts.values())}))\n"
    man += f"  )\n  (receipts\n    (package {q(sha256_text(bundle))})))\n"
    manifest.write_text(man, encoding="utf-8")
    print(out)
    print(manifest)
    return 0

if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
