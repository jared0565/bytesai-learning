# Plan: Graphite — a safer, cheaper, more capable graphify replacement

## Goal
Reverse-engineer the `graphify` skill/package and build a replacement that is:
1. **Safer** — local-first, no absolute paths in output, no external API dependency by default.
2. **More efficient** — faster scan/extract, deterministic caching, bounded parallelism.
3. **More functional** — MCP server, query language, richer exports, incremental updates.
4. **More reliable** — reproducible output, graceful errors, versioned cache.
5. **Reduced/zero LLM cost** — AST-only default, optional local LLM (Ollama), optional cloud LLM only with explicit opt-in.

## Background on graphify

`graphify` is installed as both a Claude Code skill (`~/.claude/skills/graphify/`) and a Python package (`site-packages/graphify/`).

Pipeline observed from `graphify-out/` and source inspection:
1. **detect** — walk repo, classify files, produce `.graphify_detect.json`.
2. **extract** — two tracks:
   - **AST track**: tree-sitter parsing → files, functions, classes, imports, calls, edges (938 nodes / 2344 edges in this repo).
   - **semantic track**: LLM/subagent extraction over chunks of files → concepts/relationships (24 chunks × ~1M output tokens total).
3. **merge** — combine AST + semantic into `.graphify_extract.json`.
4. **build** — normalize IDs, assemble graph (1613 nodes / 2673 edges).
5. **cluster** — Louvain/Leiden community detection (144 communities here).
6. **analyze** — god nodes, surprising connections, suggested questions.
7. **report/export** — `GRAPH_REPORT.md`, `graph.html`, `graph.json`, `cost.json`.

Token burn is dominated by the **semantic track** (Claude Code subagents or direct Gemini/Claude/Kimi API). One run on this repo consumed **1,166,658 output tokens** (~$5–20 depending on model). Other issues: output contains absolute Windows paths, Windows-specific metadata, and generated artifacts that must not be committed.

## Proposed replacement: `graphite`

A standalone Python package in `tools/graphite/` with a thin Claude Code skill wrapper at `~/.claude/skills/graphite/`.

### Core design

| Layer | graphify approach | graphite approach |
|-------|-------------------|-------------------|
| Ingestion | custom walk | `git ls-files` + gitignore-aware walk; content-hash cache |
| Structural extraction | tree-sitter, one file at a time | tree-sitter + process-pool; per-file cache keyed by hash |
| Semantic enrichment | mandatory LLM/subagent | **default off**; comments/JSDoc/README; optional local LLM; optional cloud |
| Graph building | merge + normalize | deterministic normalize + pruning of builtin globals |
| Clustering | Louvain | Louvain with fixed seed + optional Leiden |
| Analysis | fixed report | pluggable analyzers + query engine |
| Export | md/html/json | md/html/json + MCP server + query CLI |

### Directory layout

```
tools/graphite/
├── pyproject.toml
├── README.md
├── src/graphite/
│   ├── __init__.py
│   ├── cli.py                 # `graphite scan|build|report|query|serve`
│   ├── config.py              # defaults + env overrides
│   ├── cache.py               # content-addressed JSON cache
│   ├── ingest.py              # file discovery + classification
│   ├── extract/
│   │   ├── __init__.py
│   │   ├── ast.py             # tree-sitter structural extraction
│   │   ├── comments.py        # docstring/JSDoc/comment extraction
│   │   └── semantic.py        # optional LLM enrichment (local/cloud)
│   ├── graph.py               # graph construction / normalization
│   ├── cluster.py             # Louvain / Leiden
│   ├── analyze.py             # analyzers + query engine
│   ├── export/
│   │   ├── __init__.py
│   │   ├── json.py
│   │   ├── html.py
│   │   ├── md.py
│   │   └── mcp.py             # MCP server for Claude Code
│   └── llm/
│       ├── __init__.py
│       ├── ollama.py          # local model via Ollama/OpenAI-compatible
│       └── cloud.py           # optional cloud backend
```

### Output layout (same as graphify for drop-in use)

```
graph-out/
├── .graphite_manifest.json      # file list + hashes
├── .graphite_ast.json           # structural extraction
├── .graphite_semantic.json      # optional semantic enrichment
├── .graphite_graph.json         # normalized graph
├── .graphite_clusters.json      # communities
├── .graphite_analysis.json      # findings + suggested queries
├── GRAPH_REPORT.md             # human-readable audit
├── graph.json                  # bundled graph for UI
├── graph.html                  # interactive viewer
└── cost.json                   # token/time/cost log
```

### Safety rules

1. All paths in output are **relative to the repo root**.
2. No user/system metadata (hostname, username, absolute paths).
3. Generated directory defaults to `graph-out/` and is gitignored.
4. No external network calls in default mode.
5. LLM backends require explicit `--llm local` or `--llm cloud --provider gemini`.
6. Cloud LLM requires API key in env; never log key or full prompt.

### Efficiency rules

1. Cache every extraction by content hash; only re-parse changed files.
2. Use `ProcessPoolExecutor` for AST extraction, bounded by `min(8, cpu_count)`.
3. Skip binary/generated files (`.git`, `node_modules`, `dist`, `graph-out`, lock files).
4. Tree-sitter grammars loaded once and reused.
5. Optional incremental graph updates: rebuild only affected nodes/edges.

### Reliability rules

1. Deterministic node IDs: `_make_id(...)` with NFKC normalization + casefold.
2. Fixed random seed for clustering.
3. Every parser wrapped in `_safe_extract()`; errors become `error` nodes, never crash pipeline.
4. JSON schemas for every artifact; validate on read/write.
5. Versioned cache: `v1/` prefix, invalidate on schema bump.

### LLM cost tiers

| Mode | Cost | Use case |
|------|------|----------|
| `none` (default) | $0 | AST + comments only; cluster labels from paths/comments |
| `local` | $0 (GPU optional) | Ollama/lmstudio for file summaries + cluster labels |
| `cloud` | pay-as-you-go | Only if user sets API key; batched small prompts |

## Implementation steps

### Phase 1 — Foundation (no LLM)
1. Bootstrap `tools/graphite/` package with `pyproject.toml`.
2. Implement `config.py`, `cache.py`, `ingest.py`.
3. Implement AST extraction for TypeScript/JavaScript/TSX/JSX and Python using tree-sitter.
4. Implement graph building, normalization, and builtin-pruning.
5. Add CLI commands: `scan`, `build`, `report`.
6. Write tests that compare output determinism on this repo.

### Phase 2 — Clustering & analysis
1. Add Louvain clustering with fixed seed.
2. Add analyzers: god nodes, orphans, entry points, import cycles.
3. Generate `GRAPH_REPORT.md` and `graph.json`/`graph.html`.

### Phase 3 — Functionality upgrades
1. Implement query engine: `depends-on`, `imported-by`, `path-between`, `community-of`.
2. Add MCP server so Claude Code can query the graph without re-extracting.
3. Add incremental update mode (`graphite build --incremental`).

### Phase 4 — Optional LLM
1. Implement local LLM adapter (Ollama/OpenAI-compatible local servers).
2. Implement optional cloud adapter (Gemini/Claude/OpenAI) behind explicit flags.
3. Use LLM only for cluster/file summaries when requested, with tiny prompts.

### Phase 5 — Skill wrapper
1. Create `~/.claude/skills/graphite/SKILL.md` exposing `/graphite [path]`, `/graphite report`, `/graphite query ...`.
2. Make skill default to zero-LLM mode.

## Verification criteria

- [ ] `graphite scan .` completes in <5 s on this repo (cold) and <1 s warm.
- [ ] `graphite build .` produces deterministic `graph.json` across two runs on the same commit.
- [ ] Output contains no absolute paths or system metadata.
- [ ] Default run costs **zero LLM tokens**.
- [ ] Community count and node/edge count are within ±10% of graphify's AST-only numbers.
- [ ] `GRAPH_REPORT.md` is useful and includes the same sections as graphify.
- [ ] `graph.html` is self-contained and interactive.

## Integration with this repo

Graphite lives under `tools/graphite/` and is **not** part of the Next.js build. It can be installed locally with `pip install -e tools/graphite/` or invoked via the skill wrapper. Add `graph-out/` to `.gitignore` if not already present.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| tree-sitter grammar availability | Bundle `tree-sitter-javascript`, `tree-sitter-typescript`, `tree-sitter-python`; gracefully skip unsupported languages |
| Windows path handling | Use `Path.as_posix()` everywhere; normalize to `/` in output |
| Large repos | Cache + parallelism; `--max-files` and `--max-size` guardrails |
| LLM mode costs | Explicit opt-in; default off; token counter + cost log |

## Decision checklist (Karpathy principles)

1. **Happy path**: `graphite scan . && graphite build . && graphite report .` produces a clean graph report with zero tokens.
2. **Failure modes**: parser crash → cached error node; missing tree-sitter grammar → file skipped with warning; LLM unavailable → fallback to comment-based labels.
3. **Regression metric**: diff `graph.json` against golden snapshot; assert zero diff on same commit.
4. **2am debuggable**: every artifact is JSON with schema; CLI has `--verbose` and `--dry-run`.
5. **Not over-engineering**: Phase 1 ships a useful drop-in replacement; Phases 3–5 add optional power.
6. **Readable intent**: each module <300 lines; pure functions; typed signatures.
