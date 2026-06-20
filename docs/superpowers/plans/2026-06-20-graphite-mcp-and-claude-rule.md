# Plan: Graphite MCP server + CLAUDE.md rule

## Goal
Make Claude Code automatically use the Graphite knowledge graph during development by:
1. Adding an **MCP server** that exposes graph queries as tools.
2. Adding a **CLAUDE.md rule** that tells Claude to consult the graph before multi-file changes, refactors, or dependency questions.

## Why

Right now Graphite is a manual CLI. To get the "graphify speeds up development" effect, Claude needs two things:
- A way to query the graph **as a tool** rather than running shell commands.
- A **prompt-level rule** so Claude reaches for that tool by default.

## Design

### 1. MCP server (`tools/graphite/src/graphite/mcp.py`)

Transport: **stdio** (most compatible with Claude Code Desktop local MCP servers).

Tools:

| Tool | Purpose |
|------|---------|
| `graphite_query` | Run `depends-on`, `imported-by`, `path a -> b`, `stats` |
| `graphite_community` | Describe a community by file/node and list its members |
| `graphite_summary` | Return graph stats, top god nodes, entry points, surprising connections |
| `graphite_refresh` | Re-run `python -m graphite build .` and reload graph.json |

Behavior:
- On startup, load `graph-out/graph.json` relative to the project root.
- If missing, return an error telling the user to run `graphite build .` first (or call `graphite_refresh`).
- Cache the parsed NetworkX graph in memory.
- Reuse existing `graphite.query`, `graphite.graph`, `graphite.analyze` modules.
- All output is JSON-serializable.

### 2. CLAUDE.md rule

Append a new section to the top-level `CLAUDE.md`:

> ## Graphite — codebase map
> Before any multi-file change, refactor, or question about dependencies in this repo, consult `graph-out/GRAPH_REPORT.md` and `graph-out/graph.json`. Prefer the Graphite MCP tools (`graphite_query`, `graphite_community`, `graphite_summary`) when available. If the graph is stale or missing, run `python -m graphite build .` or call `graphite_refresh`.

### 3. Skill update

Update `tools/graphite/skill/SKILL.md` to mention the MCP server setup and new `/graphite query` options.

### 4. README update

Add a short "Use with Claude Code" section to `tools/graphite/README.md` with the `claude_desktop_config.json` snippet.

## Implementation steps

1. Add `mcp` optional dependency to `pyproject.toml` (`mcp>=1.0`).
2. Implement `tools/graphite/src/graphite/mcp.py` with stdio server and four tools.
3. Add `tools/graphite/src/graphite/mcp_server.py` entry point or `__main__.py` support for `python -m graphite.mcp`.
4. Update `tools/graphite/skill/SKILL.md` with MCP setup.
5. Update `tools/graphite/README.md` with MCP setup.
6. Append Graphite rule to `CLAUDE.md`.
7. Reinstall package with `pip install -e "tools/graphite[mcp]"`.
8. Test the MCP server manually by sending JSON-RPC messages over stdio.

## Verification criteria

- [ ] `python -m graphite.mcp` starts and responds to `initialize`.
- [ ] Tool call for `graphite_query` with query `depends-on db.ts` returns valid JSON.
- [ ] Tool call for `graphite_summary` returns node/edge counts and top files.
- [ ] CLAUDE.md contains the new Graphite section.
- [ ] Skill README documents MCP config.
- [ ] No new warnings from `pytest`.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| `mcp` package not installed | Made optional; server errors gracefully with import-time message |
| `graph-out/graph.json` missing | Tools return clear error + instruction to run build |
| Stale graph | `graphite_refresh` tool always rebuilds from scratch |
| Windows path issues in MCP config | Document forward-slash paths for `claude_desktop_config.json` |

## No LLM cost

This plan adds no LLM calls. MCP tools read the already-built deterministic graph.
