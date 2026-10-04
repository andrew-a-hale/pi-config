## MCP

MCP tools are registered as `mcp__<server>__<tool>` and use `codemode` exposure, so they are not declared to you directly. Reach them from a `codemode` script:

- `await searchTools("query")` — rank callable MCP tools (BM25, default limit 8)
- `await describeTool(name)` / `await describeNamespace("mcp__<server>")` — schema, or a server's instructions and tools
- `await tools.mcp__<server>__<tool>({ ... })` — call one; characters invalid in a JS identifier become `_` (e.g. `brave-search` → `tools.mcp__brave_search__...`)
- `ALL_TOOLS` — every callable tool

`tool_search` declares matching tools directly for the next call. Resource tools (`list_mcp_resources`, `read_mcp_resource`) are declared directly.

Configured servers: duckdb, brave-search, chrome-devtools-mcp.
