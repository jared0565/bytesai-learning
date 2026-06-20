:name graphite
:description Local-first, zero-LLM knowledge graph extraction using the graphite package.
:author user
:version 0.1.0

## /graphite [path]

Build a knowledge graph for the repository at `path` (defaults to current directory). Runs entirely locally with zero LLM tokens by default.

Examples:
- `/graphite .`
- `/graphite tools/graphite`

## /graphite report [path]

Same as `/graphite [path]` — scans, builds graph, clusters, and writes `graph-out/GRAPH_REPORT.md`, `graph.json`, and `graph.html`.

## /graphite query "<query>"

Query the existing `graph-out/graph.json`. Supported queries:
- `depends-on <node>` — direct dependencies of a node.
- `imported-by <node>` — direct consumers of a node.
- `path <a> -> <b>` — shortest directed path.
- `stats` — graph statistics.

Examples:
- `/graphite query "depends-on db.ts"`
- `/graphite query "path article-gen/route.ts -> db.ts"`

## Claude Code MCP tools

When the Graphite MCP server is configured, Claude can query the graph directly:
- `graphite_query` — run structured queries.
- `graphite_community` — describe a node's community/cluster.
- `graphite_summary` — high-level stats, god nodes, entry points.
- `graphite_refresh` — rebuild and reload `graph-out/graph.json`.

To configure, install the MCP dependency and add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "graphite": {
      "command": "python",
      "args": [
        "-m",
        "graphite.mcp"
      ],
      "env": {},
      "cwd": "F:\\Projects\\BytesAI Learning\\app"
    }
  }
}
```

## Implementation

This skill calls the local `graphite` Python package installed from `tools/graphite/`.

```bash
pip install -e tools/graphite
python -m graphite build . -v
```

When LLM enrichment is desired, set `GRAPHITE_LLM=local` (requires Ollama or OpenAI-compatible local server) or `GRAPHITE_LLM=cloud` with the provider API key.

## Safety

- No absolute paths or system metadata leak into artifacts.
- No external API calls in default mode.
- Generated output goes to `graph-out/` which is gitignored.
