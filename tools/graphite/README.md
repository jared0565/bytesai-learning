# Graphite

Local-first, deterministic knowledge graph extraction for codebases. A safer, faster, cheaper replacement for `graphify`.

## Principles

- **Zero-LLM by default** — structural extraction only; no API keys, no tokens, no cost.
- **Local-first** — runs entirely on your machine. Optional local LLM (Ollama) for enrichment.
- **Deterministic** — same commit produces the same graph.
- **Safe output** — no absolute paths or system metadata leak into artifacts.
- **Incremental** — content-addressed cache means only changed files are re-parsed.

## Installation

```bash
pip install -e tools/graphite
```

Optional local LLM support:

```bash
pip install -e "tools/graphite[local-llm]"
```

## Usage

```bash
# Scan a repo (zero tokens)
graphite scan .

# Build the graph (zero tokens)
graphite build .

# Generate report and interactive viewer
graphite report .

# Query the graph
graphite query . "depends-on src/lib/db.ts"

# Optional local LLM enrichment for summaries
GRAPHITE_LLM=local graphite report .
```

## Output

Artifacts are written to `graph-out/`:

- `graph.json` — bundled graph for external tools
- `GRAPH_REPORT.md` — human-readable audit
- `graph.html` — interactive viewer
- `.graphite_*.json` — intermediate pipeline artifacts

## Claude Code skill

A skill template lives at `tools/graphite/skill/SKILL.md`. To install:

```bash
mkdir -p ~/.claude/skills/graphite
cp tools/graphite/skill/SKILL.md ~/.claude/skills/graphite/SKILL.md
```

Then use `/graphite [path]` inside Claude Code. The skill defaults to zero-LLM mode.

### MCP server for Claude Code

Install the optional MCP dependency:

```bash
pip install -e "tools/graphite[mcp]"
```

Then configure Claude Code (Desktop) to use the local server. Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "graphite": {
      "command": "python",
      "args": ["-m", "graphite.mcp"],
      "cwd": "F:/Projects/BytesAI Learning/app"
    }
  }
}
```

Once configured, Claude can call these tools automatically:

- `graphite_query` — e.g. `depends-on db.ts`, `imported-by db.ts`, `path article-gen/route.ts -> db.ts`, `stats`
- `graphite_community` — list the community around a node
- `graphite_summary` — stats, god nodes, entry points, surprising connections
- `graphite_refresh` — rebuild and reload the graph
