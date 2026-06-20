"""Markdown report generation."""
from __future__ import annotations

from pathlib import Path
from typing import Any


def to_markdown(
    graph_data: dict[str, Any],
    clusters: dict[str, Any],
    analysis: dict[str, Any],
    manifest: dict[str, Any],
    output_path: Path,
) -> None:
    """Write a human-readable Markdown audit report."""
    lines: list[str] = []
    lines.append(f"# Graphite Report: `{manifest.get('root', 'codebase')}`")
    lines.append("")
    lines.append("## Summary")
    lines.append(f"- **Files scanned:** {manifest.get('file_count', 0)}")
    lines.append(f"- **Total nodes:** {graph_data.get('metadata', {}).get('node_count', 0)}")
    lines.append(f"- **Total edges:** {graph_data.get('metadata', {}).get('edge_count', 0)}")
    lines.append(f"- **Communities detected:** {clusters.get('count', 0)}")
    lines.append(f"- **LLM tokens used:** {manifest.get('llm_tokens', 0)} (mode: {manifest.get('llm_mode', 'none')})")
    lines.append("")

    lines.append("## Top Files by Connectivity")
    for item in analysis.get("top_files_by_links", [])[:10]:
        lines.append(f"- `{item['name']}` — degree {item['degree']}")
    lines.append("")

    lines.append("## God Nodes")
    for item in analysis.get("god_nodes", [])[:10]:
        lines.append(f"- `{item['name']}` ({item['kind']}) — in {item['in_degree']} / out {item['out_degree']}")
    lines.append("")

    lines.append("## Entry Points")
    for item in analysis.get("entry_points", [])[:10]:
        lines.append(f"- `{item['name']}` — out {item['out_degree']} / in {item['in_degree']} (ratio {item['ratio']:.1f})")
    lines.append("")

    lines.append("## Surprising Connections")
    for item in analysis.get("surprising_connections", [])[:10]:
        lines.append(f"- `{item['source']}` → `{item['target']}` ({item['relation']})")
    lines.append("")

    lines.append("## Communities")
    for c in clusters.get("clusters", [])[:20]:
        labels = ", ".join(c.get("labels", [])) or "mixed"
        lines.append(f"### Community {c['id']} ({labels})")
        lines.append(f"- size: {c['size']} (files: {c['file_count']}, functions: {c['function_count']}, classes: {c['class_count']})")
        file_members = [m for m in c.get("members", []) if any(chr.isalnum() for chr in m)]
        lines.append(f"- members: {', '.join(f'`{m}`' for m in file_members[:15])}{' …' if len(file_members) > 15 else ''}")
    lines.append("")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
