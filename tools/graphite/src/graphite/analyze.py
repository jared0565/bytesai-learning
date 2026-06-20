"""Graph analysis: god nodes, orphans, entry points, cycles."""
from __future__ import annotations

from collections import Counter
from typing import Any

import networkx as nx


def analyze(g: nx.DiGraph, top_n: int = 20) -> dict[str, Any]:
    """Run the full analysis suite."""
    return {
        "god_nodes": god_nodes(g, top_n),
        "orphans": orphan_nodes(g, top_n),
        "entry_points": entry_points(g, top_n),
        "surprising_connections": surprising_connections(g, top_n),
        "cycles": list(nx.simple_cycles(g))[:top_n],
        "top_files_by_links": top_files_by_links(g, top_n),
    }


def god_nodes(g: nx.DiGraph, top_n: int = 20) -> list[dict[str, Any]]:
    """Nodes with the highest total degree (in + out)."""
    degrees = [(n, g.degree(n)) for n in g.nodes()]
    degrees.sort(key=lambda x: x[1], reverse=True)
    return [
        {
            "id": n,
            "name": g.nodes[n].get("name", n),
            "kind": g.nodes[n].get("kind", "unknown"),
            "degree": deg,
            "in_degree": g.in_degree(n),
            "out_degree": g.out_degree(n),
        }
        for n, deg in degrees[:top_n]
    ]


def orphan_nodes(g: nx.DiGraph, top_n: int = 20) -> list[dict[str, Any]]:
    """Nodes with zero connections."""
    orphans = [n for n in g.nodes() if g.degree(n) == 0]
    return [
        {
            "id": n,
            "name": g.nodes[n].get("name", n),
            "kind": g.nodes[n].get("kind", "unknown"),
        }
        for n in orphans[:top_n]
    ]


def entry_points(g: nx.DiGraph, top_n: int = 20) -> list[dict[str, Any]]:
    """File nodes with many outgoing edges and few incoming edges."""
    file_nodes = [n for n in g.nodes() if g.nodes[n].get("kind") == "file"]
    scored = []
    for n in file_nodes:
        out_deg = g.out_degree(n)
        in_deg = g.in_degree(n)
        if out_deg > 0:
            scored.append((n, out_deg, in_deg, out_deg / max(in_deg, 1)))
    scored.sort(key=lambda x: x[3], reverse=True)
    return [
        {
            "id": n,
            "name": g.nodes[n].get("name", n),
            "out_degree": out_deg,
            "in_degree": in_deg,
            "ratio": ratio,
        }
        for n, out_deg, in_deg, ratio in scored[:top_n]
    ]


def surprising_connections(g: nx.DiGraph, top_n: int = 20) -> list[dict[str, Any]]:
    """Edges between nodes that share no common neighbours (weak structural coupling)."""
    scored = []
    for u, v in g.edges():
        common = len(set(g.predecessors(u)).intersection(g.predecessors(v))) + \
                 len(set(g.successors(u)).intersection(g.successors(v)))
        if common == 0:
            scored.append({
                "source": u,
                "target": v,
                "source_kind": g.nodes[u].get("kind", "unknown"),
                "target_kind": g.nodes[v].get("kind", "unknown"),
                "relation": g[u][v].get("relation", "unknown"),
            })
    return scored[:top_n]


def top_files_by_links(g: nx.DiGraph, top_n: int = 20) -> list[dict[str, Any]]:
    """File nodes ranked by total degree."""
    file_nodes = [n for n in g.nodes() if g.nodes[n].get("kind") == "file"]
    ranked = sorted(file_nodes, key=lambda n: g.degree(n), reverse=True)
    return [
        {
            "id": n,
            "name": g.nodes[n].get("name", n),
            "degree": g.degree(n),
            "source_file": g.nodes[n].get("source_file"),
        }
        for n in ranked[:top_n]
    ]
