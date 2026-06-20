"""Graphite command-line interface."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

from .cache import Cache
from .cluster import detect_communities
from .config import Config
from .extract.ast import extract_all
from .graph import build_graph, graph_from_json, graph_to_json
from .ingest import collect_files
from .analyze import analyze
from .query import annotate_communities, query
from .export.json import to_json as export_json
from .export.html import to_html as export_html
from .export.md import to_markdown as export_md


def _config_from_args(args: argparse.Namespace) -> Config:
    """Build config from defaults + CLI args + env."""
    base = Config.from_env()
    kwargs: dict[str, Any] = {**base.to_dict()}
    if args.output_dir is not None:
        kwargs["output_dir"] = Path(args.output_dir)
    if args.cache_dir is not None:
        kwargs["cache_dir"] = Path(args.cache_dir)
    if args.workers is not None:
        kwargs["workers"] = int(args.workers)
    if args.verbose:
        kwargs["verbose"] = True
    return Config(**kwargs)


def _write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _scan(args: argparse.Namespace, cfg: Config) -> tuple[dict[str, Any], list[Any]]:
    root = Path(args.path).resolve()
    if not root.exists():
        print(f"[graphite] path not found: {root}", file=sys.stderr)
        raise SystemExit(1)

    start = time.time()
    entries = collect_files(root, cfg)
    manifest = {
        "root": root.name,
        "file_count": len(entries),
        "files": [
            {"rel_path": e.rel_path, "language": e.language, "size": e.size, "hash": e.content_hash}
            for e in entries
        ],
    }
    if cfg.verbose:
        print(f"[graphite] scanned {len(entries)} files in {time.time() - start:.2f}s")
    return manifest, entries


def _build(
    args: argparse.Namespace,
    cfg: Config,
    manifest: dict[str, Any],
    entries: list[Any],
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    cache = Cache(cfg.cache_dir, cfg.cache_version)
    start = time.time()
    extraction = extract_all(entries, cfg, cache)
    if cfg.verbose:
        print(
            f"[graphite] extracted {len(extraction.nodes)} nodes / {len(extraction.edges)} edges "
            f"in {time.time() - start:.2f}s"
        )

    start = time.time()
    g = build_graph(extraction.nodes, extraction.edges)
    graph_data = graph_to_json(g)
    if cfg.verbose:
        print(f"[graphite] built graph in {time.time() - start:.2f}s")

    clusters = detect_communities(g, seed=cfg.seed)
    if cfg.verbose:
        print(f"[graphite] detected {clusters['count']} communities")

    annotate_communities(g, clusters["node_to_community"])
    # Re-serialize after annotation so community ids are in nodes.
    graph_data = graph_to_json(g)

    analysis = analyze(g)

    return graph_data, clusters, analysis


def _report(
    cfg: Config,
    manifest: dict[str, Any],
    graph_data: dict[str, Any],
    clusters: dict[str, Any],
    analysis: dict[str, Any],
) -> None:
    out = cfg.output_dir
    out.mkdir(parents=True, exist_ok=True)

    public_manifest = {**manifest, "llm_mode": cfg.llm_mode, "llm_tokens": 0}

    _write_json(out / ".graphite_manifest.json", public_manifest)
    _write_json(out / ".graphite_graph.json", graph_data)
    _write_json(out / ".graphite_clusters.json", clusters)
    _write_json(out / ".graphite_analysis.json", analysis)

    export_json(graph_data, clusters, analysis, public_manifest, out / "graph.json")
    export_html(graph_data, clusters, analysis, public_manifest, out / "graph.html")
    export_md(graph_data, clusters, analysis, public_manifest, out / "GRAPH_REPORT.md")

    print(f"[graphite] report written to {out}/")
    print("  - GRAPH_REPORT.md")
    print("  - graph.json")
    print("  - graph.html")


def cmd_scan(args: argparse.Namespace) -> None:
    cfg = _config_from_args(args)
    manifest, _ = _scan(args, cfg)
    _write_json(cfg.output_dir / ".graphite_manifest.json", manifest)
    print(f"[graphite] manifest written: {cfg.output_dir / '.graphite_manifest.json'}")


def cmd_build(args: argparse.Namespace) -> None:
    cfg = _config_from_args(args)
    manifest, entries = _scan(args, cfg)
    graph_data, clusters, analysis = _build(args, cfg, manifest, entries)
    _report(cfg, manifest, graph_data, clusters, analysis)


def cmd_report(args: argparse.Namespace) -> None:
    cmd_build(args)


def cmd_query(args: argparse.Namespace) -> None:
    graph_path = Path(args.graph_json)
    if not graph_path.exists():
        print(f"[graphite] graph not found: {graph_path}", file=sys.stderr)
        print("Run `graphite build .` first.", file=sys.stderr)
        raise SystemExit(1)
    with open(graph_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    g = graph_from_json(data)
    result = query(g, args.query)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="graphite", description="Local-first code knowledge graph.")
    parser.add_argument("--output-dir", default=None, help="Output directory (default: graph-out)")
    parser.add_argument("--cache-dir", default=None, help="Cache directory (default: .cache/graphite)")
    parser.add_argument("--workers", type=int, default=None, help="Parallel workers")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose logging")

    sub = parser.add_subparsers(dest="command")

    p_scan = sub.add_parser("scan", help="Scan files and write manifest")
    p_scan.add_argument("path", help="Repository path")
    p_scan.set_defaults(func=cmd_scan)

    p_build = sub.add_parser("build", help="Scan + extract + build graph + report")
    p_build.add_argument("path", help="Repository path")
    p_build.set_defaults(func=cmd_build)

    p_report = sub.add_parser("report", help="Alias for build")
    p_report.add_argument("path", help="Repository path")
    p_report.set_defaults(func=cmd_report)

    p_query = sub.add_parser("query", help="Query an existing graph.json")
    p_query.add_argument("query", help="Query string, e.g. 'depends-on db.ts'")
    p_query.add_argument("--graph-json", default="graph-out/graph.json", help="Path to graph.json")
    p_query.set_defaults(func=cmd_query)

    args = parser.parse_args(argv)
    if not args.command:
        parser.print_help()
        return 1

    try:
        args.func(args)
    except Exception as e:
        print(f"[graphite] error: {e}", file=sys.stderr)
        if os.environ.get("GRAPHITE_DEBUG"):
            import traceback
            traceback.print_exc()
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
