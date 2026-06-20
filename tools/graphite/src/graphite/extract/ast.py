"""Deterministic structural extraction via tree-sitter."""
from __future__ import annotations

import importlib
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ..cache import Cache, content_hash
from ..config import Config
from ..ingest import FileEntry


@dataclass
class ExtractionResult:
    nodes: list[dict[str, Any]] = field(default_factory=list)
    edges: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None


_LANGUAGE_BUILTIN_GLOBALS: frozenset[str] = frozenset({
    "String", "Number", "Boolean", "Object", "Array", "Symbol", "BigInt",
    "Date", "RegExp", "Error", "TypeError", "RangeError", "SyntaxError",
    "ReferenceError", "EvalError", "URIError",
    "Promise", "Map", "Set", "WeakMap", "WeakSet", "JSON", "Math",
    "Reflect", "Proxy", "Intl",
    "parseInt", "parseFloat", "isNaN", "isFinite",
    "encodeURIComponent", "decodeURIComponent", "encodeURI", "decodeURI",
    "URL", "URLSearchParams", "FormData", "Blob", "File",
    "Headers", "Request", "Response", "AbortController", "AbortSignal",
    "TextEncoder", "TextDecoder", "console",
    "str", "int", "float", "bool", "list", "dict", "set", "tuple", "bytes",
    "len", "range", "enumerate", "zip", "map", "filter", "sum", "min", "max",
    "print", "open", "isinstance", "type", "super", "sorted", "reversed",
    "any", "all", "abs", "round", "next", "iter", "hash", "id", "repr",
    "callable", "getattr", "setattr", "hasattr", "delattr", "vars", "dir",
})


_MAX_ID_LEN = 120


def _make_id(*parts: str) -> str:
    combined = "_".join(p.strip("_.") for p in parts if p)
    combined = unicodedata.normalize("NFKC", combined)
    cleaned = re.sub(r"[^\w]+", "_", combined, flags=re.UNICODE)
    cleaned = re.sub(r"_+", "_", cleaned)
    cleaned = cleaned.strip("_").casefold()
    if len(cleaned) > _MAX_ID_LEN:
        cleaned = cleaned[:_MAX_ID_LEN]
    return cleaned


def _file_node_id(rel_path: str) -> str:
    path = Path(rel_path)
    parent = path.parent.name
    stem = path.stem
    if parent and parent not in (".", ""):
        return _make_id(f"{parent}.{stem}")
    return _make_id(stem)


def _node(
    id_: str,
    kind: str,
    name: str,
    rel_path: str,
    line: int | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    n: dict[str, Any] = {
        "id": id_,
        "kind": kind,
        "name": name,
        "source_file": rel_path,
    }
    if line is not None:
        n["source_location"] = f"L{line}"
    if extra:
        n.update(extra)
    return n


def _edge(
    source: str,
    target: str,
    relation: str,
    rel_path: str,
    line: int | None = None,
    context: str | None = None,
) -> dict[str, Any]:
    e: dict[str, Any] = {
        "source": source,
        "target": target,
        "relation": relation,
        "source_file": rel_path,
        "confidence": "EXTRACTED",
        "weight": 1.0,
    }
    if line is not None:
        e["source_location"] = f"L{line}"
    if context:
        e["context"] = context
    return e


class _TreeSitterLoader:
    """Lazy parser cache per language."""

    def __init__(self) -> None:
        self._parsers: dict[str, Any] = {}

    def parser(self, language: str) -> Any | None:
        if language in self._parsers:
            return self._parsers[language]
        mapping = {
            "javascript": ("tree_sitter_javascript", "language"),
            "typescript": ("tree_sitter_typescript", "language_typescript"),
            "tsx": ("tree_sitter_typescript", "language_tsx"),
            "jsx": ("tree_sitter_javascript", "language"),
            "python": ("tree_sitter_python", "language"),
        }
        item = mapping.get(language)
        if not item:
            return None
        pkg, attr = item
        try:
            mod = importlib.import_module(pkg)
            lang_fn = getattr(mod, attr)
            lang_mod = importlib.import_module("tree_sitter")
            parser = lang_mod.Parser(lang_mod.Language(lang_fn()))
            self._parsers[language] = parser
            return parser
        except Exception as e:
            if sys.stderr:
                print(f"[graphite] parser load failed for {language}: {e}", file=sys.stderr)
            return None


_LOADER = _TreeSitterLoader()


def _extract_ts_js(file_id: str, rel_path: str, source: bytes, tree: Any) -> ExtractionResult:
    result = ExtractionResult()
    root = tree.root_node

    def _line(node: Any) -> int:
        return (node.start_point[0] + 1) if node.start_point else 1

    def _name(node: Any) -> str | None:
        # identifiers, property_identifier, type_identifier, etc.
        for child in node.children:
            if child.type.endswith("identifier"):
                text = child.text.decode("utf-8", errors="ignore") if child.text else None
                return _short_name(text)
        return None

    # Add file node.
    result.nodes.append(_node(file_id, "file", Path(rel_path).name, rel_path))

    # Walk for declarations and calls.
    def walk(node: Any, parent_id: str | None = None) -> None:
        if node.type in ("function_declaration", "method_definition", "arrow_function", "function"):
            name = _name(node)
            if name:
                mid = _make_id(file_id, name)
                result.nodes.append(_node(mid, "function", name, rel_path, _line(node)))
                if parent_id:
                    result.edges.append(_edge(parent_id, mid, "contains", rel_path, _line(node)))
                walk_children(node, mid)
            else:
                walk_children(node, parent_id)
        elif node.type == "class_declaration":
            name = _name(node)
            if name:
                cid = _make_id(file_id, name)
                result.nodes.append(_node(cid, "class", name, rel_path, _line(node)))
                if parent_id:
                    result.edges.append(_edge(parent_id, cid, "contains", rel_path, _line(node)))
                walk_children(node, cid)
            else:
                walk_children(node, parent_id)
        elif node.type == "import_statement":
            # import ... from 'module' or import 'module'
            source_lit = None
            for child in node.children:
                if child.type == "string":
                    source_lit = child.text.decode("utf-8", errors="ignore").strip("'\"")
                elif child.type == "import_clause":
                    pass
            if source_lit:
                target = _resolve_import(rel_path, source_lit)
                if target:
                    result.edges.append(_edge(file_id, _file_node_id(target), "imports", rel_path, _line(node)))
                else:
                    result.edges.append(_edge(file_id, _make_id(source_lit), "imports", rel_path, _line(node)))
            walk_children(node, parent_id)
        elif node.type in ("call_expression", "new_expression"):
            func = node.child_by_field_name("function")
            if func:
                called = _call_target_name(func, source)
                if called and called not in _LANGUAGE_BUILTIN_GLOBALS:
                    target_id = _resolve_call(file_id, called)
                    result.edges.append(_edge(file_id, target_id, "calls", rel_path, _line(node)))
            walk_children(node, parent_id)
        else:
            walk_children(node, parent_id)

    def walk_children(node: Any, parent_id: str | None) -> None:
        for child in node.children:
            walk(child, parent_id)

    walk(root, file_id)
    return result


_MAX_NAME_LEN = 80


def _short_name(text: str | None) -> str | None:
    if not text:
        return None
    text = text.strip()
    if len(text) > _MAX_NAME_LEN:
        # For chained/long names keep the final segment.
        return text.split(".")[-1][: _MAX_NAME_LEN]
    return text


def _simple_object_name(node: Any) -> str | None:
    """Return a short name for the object of a member_expression, or None if too complex."""
    if node.type.endswith("identifier"):
        return node.text.decode("utf-8", errors="ignore") if node.text else None
    if node.type == "member_expression":
        obj = node.child_by_field_name("object")
        prop = node.child_by_field_name("property")
        if obj and prop:
            obj_name = _simple_object_name(obj)
            prop_name = prop.text.decode("utf-8", errors="ignore") if prop.text else None
            if obj_name and prop_name:
                combined = f"{obj_name}.{prop_name}"
                return _short_name(combined)
        return None
    # Complex literals (array, object, parenthesized, call) — don't stringify.
    return None


def _call_target_name(node: Any, source: bytes) -> str | None:
    """Best-effort name for a call target."""
    if node.type.endswith("identifier"):
        return _short_name(node.text.decode("utf-8", errors="ignore") if node.text else None)
    if node.type == "member_expression":
        obj = node.child_by_field_name("object")
        prop = node.child_by_field_name("property")
        prop_name = prop.text.decode("utf-8", errors="ignore") if prop and prop.text else None
        obj_name = _simple_object_name(obj) if obj else None
        if prop_name:
            return _short_name(f"{obj_name}.{prop_name}" if obj_name else prop_name)
        return _short_name(prop_name)
    # Fallback: first identifier child.
    for child in node.children:
        if child.type.endswith("identifier"):
            return _short_name(child.text.decode("utf-8", errors="ignore") if child.text else None)
    return None


def _extract_python(file_id: str, rel_path: str, source: bytes, tree: Any) -> ExtractionResult:
    result = ExtractionResult()
    root = tree.root_node

    def _line(node: Any) -> int:
        return (node.start_point[0] + 1) if node.start_point else 1

    result.nodes.append(_node(file_id, "file", Path(rel_path).name, rel_path))

    def walk(node: Any, parent_id: str | None = None) -> None:
        if node.type == "function_definition":
            name_node = node.child_by_field_name("name")
            name = _short_name(name_node.text.decode("utf-8", errors="ignore")) if name_node and name_node.text else None
            if name:
                mid = _make_id(file_id, name)
                result.nodes.append(_node(mid, "function", name, rel_path, _line(node)))
                if parent_id:
                    result.edges.append(_edge(parent_id, mid, "contains", rel_path, _line(node)))
                walk_children(node, mid)
            else:
                walk_children(node, parent_id)
        elif node.type == "class_definition":
            name_node = node.child_by_field_name("name")
            name = _short_name(name_node.text.decode("utf-8", errors="ignore")) if name_node and name_node.text else None
            if name:
                cid = _make_id(file_id, name)
                result.nodes.append(_node(cid, "class", name, rel_path, _line(node)))
                if parent_id:
                    result.edges.append(_edge(parent_id, cid, "contains", rel_path, _line(node)))
                # Inheritance
                for base in node.children:
                    if base.type == "argument_list":
                        for arg in base.children:
                            if arg.type.endswith("identifier") and arg.text:
                                base_name = arg.text.decode("utf-8", errors="ignore")
                                result.edges.append(_edge(cid, _make_id(base_name), "inherits", rel_path, _line(arg)))
                walk_children(node, cid)
            else:
                walk_children(node, parent_id)
        elif node.type == "import_statement" or node.type == "import_from_statement":
            # Collect module names from dotted_name children.
            for child in node.children:
                if child.type == "dotted_name":
                    mod = child.text.decode("utf-8", errors="ignore") if child.text else None
                    if mod:
                        result.edges.append(_edge(file_id, _make_id(mod), "imports", rel_path, _line(node)))
                elif child.type == "string" and node.type == "import_from_statement":
                    mod = child.text.decode("utf-8", errors="ignore").strip("'\"")
                    if mod:
                        result.edges.append(_edge(file_id, _make_id(mod), "imports", rel_path, _line(node)))
            walk_children(node, parent_id)
        elif node.type == "call":
            func = node.child_by_field_name("function")
            called = _call_target_name(func, source) if func else None
            if called and called not in _LANGUAGE_BUILTIN_GLOBALS:
                result.edges.append(_edge(file_id, _resolve_call(file_id, called), "calls", rel_path, _line(node)))
            walk_children(node, parent_id)
        else:
            walk_children(node, parent_id)

    def walk_children(node: Any, parent_id: str | None) -> None:
        for child in node.children:
            walk(child, parent_id)

    walk(root, file_id)
    return result


def _resolve_import(rel_path: str, source_lit: str) -> str | None:
    """Best-effort resolve relative/local imports to a file path."""
    if source_lit.startswith("."):
        base = Path(rel_path).parent
        target = (base / source_lit).resolve()
        if target.is_file():
            return Path(rel_path).parent.joinpath(source_lit).as_posix()
        for ext in (".ts", ".tsx", ".js", ".jsx", ".mjs", ".py"):
            cand = target.with_suffix(ext)
            if cand.is_file():
                return (Path(rel_path).parent / source_lit).with_suffix(ext).as_posix()
    return None


def _resolve_call(file_id: str, called: str) -> str:
    """Convert a call target string into a node id."""
    # Local call: if called starts with lowercase or is relative, attach to file namespace.
    if called and not called.startswith(".") and not called.startswith("node_modules"):
        # Try namespaced under file first; fallback to bare id.
        return _make_id(file_id, called)
    return _make_id(called)


def _extract_generic(file_id: str, rel_path: str, source: bytes, language: str) -> ExtractionResult:
    """Fallback for languages we can't parse structurally yet."""
    result = ExtractionResult()
    result.nodes.append(_node(file_id, "file", Path(rel_path).name, rel_path))
    # TODO: add comment extraction, markdown headings, JSON keys, etc.
    return result


def extract_file(entry: FileEntry, cfg: Config, cache: Cache | None = None) -> ExtractionResult:
    """Extract nodes and edges from a single file, using cache if available."""
    if cache is not None:
        cached = cache.read("ast", entry.content_hash, entry.language or "unknown")
        if cached is not None:
            return _result_from_dict(cached)

    rel_path = entry.rel_path
    file_id = _file_node_id(rel_path)

    try:
        with open(entry.abs_path, "rb") as f:
            source = f.read()
    except Exception as e:
        return ExtractionResult(error=f"read_error: {e}")

    if entry.language in ("javascript", "typescript", "tsx", "jsx"):
        parser = _LOADER.parser(entry.language)
        if parser is None:
            return _extract_generic(file_id, rel_path, source, entry.language)
        try:
            tree = parser.parse(source)
        except Exception as e:
            return ExtractionResult(error=f"parse_error: {e}")
        result = _extract_ts_js(file_id, rel_path, source, tree)
    elif entry.language == "python":
        parser = _LOADER.parser(entry.language)
        if parser is None:
            return _extract_generic(file_id, rel_path, source, entry.language)
        try:
            tree = parser.parse(source)
        except Exception as e:
            return ExtractionResult(error=f"parse_error: {e}")
        result = _extract_python(file_id, rel_path, source, tree)
    else:
        result = _extract_generic(file_id, rel_path, source, entry.language or "unknown")

    if cache is not None:
        cache.write(_result_to_dict(result), "ast", entry.content_hash, entry.language or "unknown")

    return result


def _result_to_dict(result: ExtractionResult) -> dict[str, Any]:
    return {"nodes": result.nodes, "edges": result.edges, "error": result.error}


def _result_from_dict(data: dict[str, Any]) -> ExtractionResult:
    return ExtractionResult(
        nodes=data.get("nodes", []),
        edges=data.get("edges", []),
        error=data.get("error"),
    )


def extract_all(entries: list[FileEntry], cfg: Config, cache: Cache | None = None) -> ExtractionResult:
    """Extract all files, optionally in parallel."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    results: list[ExtractionResult] = []
    if cfg.workers <= 1:
        for entry in entries:
            results.append(extract_file(entry, cfg, cache))
        return _merge(results)

    with ThreadPoolExecutor(max_workers=cfg.workers) as pool:
        futures = {pool.submit(extract_file, entry, cfg, cache): entry for entry in entries}
        for future in as_completed(futures):
            try:
                results.append(future.result())
            except Exception as e:
                entry = futures[future]
                results.append(ExtractionResult(error=f"worker_error: {entry.rel_path}: {e}", nodes=[], edges=[]))
    return _merge(results)


def _merge(results: list[ExtractionResult]) -> ExtractionResult:
    merged = ExtractionResult()
    # Collect all nodes/edges, then sort deterministically before dedup.
    all_nodes: list[dict[str, Any]] = []
    all_edges: list[dict[str, Any]] = []
    for r in results:
        all_nodes.extend(r.nodes)
        all_edges.extend(r.edges)
        if r.error:
            merged.error = r.error

    all_nodes.sort(key=lambda n: (n.get("id", ""), n.get("source_file", "")))
    seen_nodes: set[str] = set()
    for n in all_nodes:
        if n["id"] not in seen_nodes:
            merged.nodes.append(n)
            seen_nodes.add(n["id"])

    all_edges.sort(
        key=lambda e: (
            e.get("source", ""),
            e.get("target", ""),
            e.get("relation", ""),
            e.get("source_file", ""),
            e.get("source_location", ""),
        )
    )
    seen_edges: set[tuple[str, str, str]] = set()
    for e in all_edges:
        key = (e["source"], e["target"], e["relation"])
        if key not in seen_edges:
            merged.edges.append(e)
            seen_edges.add(key)
    return merged
