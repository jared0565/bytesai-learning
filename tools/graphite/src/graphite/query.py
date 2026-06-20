"""Simple query engine over the graph."""
from __future__ import annotations

from collections import deque
from typing import Any

import networkx as nx


def query(g: nx.DiGraph, q: str) -> dict[str, Any]:
    """Answer a simple query string.

    Supported patterns:
    - depends-on <node>         : nodes that <node> directly depends on (out-edges)
    - imported-by <node>          : nodes that directly point to <node> (in-edges)
    - path <a> -> <b>             : shortest directed path from a to b
    - community-of <node>       : cluster/community label for a node
    - stats                       : basic graph statistics
    """
    tokens = q.strip().lower().split()
    if not tokens:
        return {"error": "empty query"}

    verb = tokens[0]

    if verb == "stats":
        return {
            "node_count": g.number_of_nodes(),
            "edge_count": g.number_of_edges(),
            "density": nx.density(g),
        }

    if verb in ("depends-on", "depends_on", "out"):
        node_id = _find_node(g, " ".join(tokens[1:]))
        if not node_id:
            return {"error": f"node not found: {' '.join(tokens[1:])}"}
        neighbors = sorted(g.successors(node_id))
        return {
            "node": node_id,
            "count": len(neighbors),
            "depends_on": [
                {"id": n, "name": g.nodes[n].get("name", n), "kind": g.nodes[n].get("kind", "unknown")}
                for n in neighbors
            ],
        }

    if verb in ("imported-by", "imported_by", "in"):
        node_id = _find_node(g, " ".join(tokens[1:]))
        if not node_id:
            return {"error": f"node not found: {' '.join(tokens[1:])}"}
        neighbors = sorted(g.predecessors(node_id))
        return {
            "node": node_id,
            "count": len(neighbors),
            "imported_by": [
                {"id": n, "name": g.nodes[n].get("name", n), "kind": g.nodes[n].get("kind", "unknown")}
                for n in neighbors
            ],
        }

    if verb == "path":
        # path <a> -> <b>
        try:
            arrow = tokens.index("->")
            a = " ".join(tokens[1:arrow])
            b = " ".join(tokens[arrow + 1 :])
        except ValueError:
            return {"error": "path query format: path <a> -> <b>"}
        src = _find_node(g, a)
        dst = _find_node(g, b)
        if not src:
            return {"error": f"source not found: {a}"}
        if not dst:
            return {"error": f"target not found: {b}"}
        try:
            p = nx.shortest_path(g, src, dst)
        except nx.NetworkXNoPath:
            return {"error": f"no path from {src} to {dst}"}
        return {
            "source": src,
            "target": dst,
            "length": len(p) - 1,
            "path": [
                {"id": n, "name": g.nodes[n].get("name", n), "kind": g.nodes[n].get("kind", "unknown")}
                for n in p
            ],
        }

    if verb in ("community-of", "community_of"):
        node_id = _find_node(g, " ".join(tokens[1:]))
        if not node_id:
            return {"error": f"node not found: {' '.join(tokens[1:])}"}
        return {
            "node": node_id,
            "community": g.nodes[node_id].get("community"),
            "name": g.nodes[node_id].get("name", node_id),
        }

    return {"error": f"unknown query verb: {verb}"}


def _find_node(g: nx.DiGraph, token: str) -> str | None:
    """Match a node by exact id, name, or file path."""
    token = token.strip().lower().strip("`")
    # Exact id.
    if token in g:
        return token
    # Match by name.
    for n in g.nodes():
        if g.nodes[n].get("name", "").lower() == token:
            return n
    # Match by source_file suffix.
    for n in g.nodes():
        sf = g.nodes[n].get("source_file", "")
        if sf and sf.lower().endswith(token):
            return n
    # Fuzzy contains.
    for n in g.nodes():
        if token in n:
            return n
    return None


def annotate_communities(g: nx.DiGraph, partition: dict[str, int]) -> None:
    """Write community id into each graph node attribute."""
    for n, comm in partition.items():
        if n in g.nodes:
            g.nodes[n]["community"] = comm
