@AGENTS.md

# Graphite — codebase map

Before any multi-file change, refactor, or question about dependencies in this repo, consult `graph-out/GRAPH_REPORT.md` and `graph-out/graph.json`. Prefer the Graphite MCP tools (`graphite_query`, `graphite_community`, `graphite_summary`) when they are available. If the graph is stale or missing, run `python -m graphite build .` or call `graphite_refresh`.
