"""Smoke tests for the Graphite MCP server tools."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def _call_tools() -> list[dict]:
    cwd = Path(__file__).resolve().parents[3]
    proc = subprocess.Popen(
        [sys.executable, "-m", "graphite.mcp"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=str(cwd),
    )

    def send(obj: dict) -> None:
        s = json.dumps(obj)
        assert proc.stdin is not None
        proc.stdin.write(f"Content-Length: {len(s)}\r\n\r\n{s}")
        proc.stdin.flush()

    def recv() -> dict:
        assert proc.stdout is not None
        headers: dict[str, str] = {}
        while True:
            line = proc.stdout.readline()
            if line == "\r\n":
                break
            k, v = line.strip().split(":", 1)
            headers[k.strip()] = v.strip()
        length = int(headers.get("Content-Length", 0))
        return json.loads(proc.stdout.read(length))

    send(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "test", "version": "1.0"},
            },
        }
    )
    init = recv()
    assert init["result"]["serverInfo"]["name"] == "graphite"

    send({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
    tools = recv()
    tool_names = {t["name"] for t in tools["result"]["tools"]}
    assert tool_names >= {"graphite_query", "graphite_summary", "graphite_community", "graphite_refresh"}

    send(
        {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "graphite_query", "arguments": {"query": "stats"}},
        }
    )
    query_result = recv()

    send({"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "graphite_summary", "arguments": {}}})
    summary_result = recv()

    proc.terminate()
    return [query_result, summary_result]


def test_mcp_tools() -> None:
    results = _call_tools()
    query_text = results[0]["result"]["content"][0]["text"]
    summary_text = results[1]["result"]["content"][0]["text"]
    query_data = json.loads(query_text)
    summary_data = json.loads(summary_text)

    assert "node_count" in query_data
    assert query_data["node_count"] > 0
    assert "node_count" in summary_data
    assert "edge_count" in summary_data
    assert "god_nodes" in summary_data
