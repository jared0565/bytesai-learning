"""JSON export of the full graph bundle."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def to_json(
    graph_data: dict[str, Any],
    clusters: dict[str, Any],
    analysis: dict[str, Any],
    manifest: dict[str, Any],
    output_path: Path,
) -> None:
    """Write the bundled graph JSON used by the HTML viewer and external tools."""
    bundle = {
        "nodes": graph_data.get("nodes", []),
        "edges": graph_data.get("edges", []),
        "clusters": clusters.get("clusters", []),
        "analysis": analysis,
        "metadata": {
            "node_count": graph_data.get("metadata", {}).get("node_count", 0),
            "edge_count": graph_data.get("metadata", {}).get("edge_count", 0),
            "community_count": clusters.get("count", 0),
            **{k: v for k, v in manifest.items() if k not in ("files",)},
        },
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=2)
