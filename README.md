# pi-config

Pi coding agent configuration — extensions, skills, keybindings, and MCP setup.

## Structure

```
pi-config/
├── settings.json          # Provider, model, packages
├── keybindings.json       # Custom keybindings
├── system.md              # APPEND_SYSTEM (MCP instructions)
├── cloak.json             # Secret masking
├── mcp.json               # MCP servers (duckdb)
├── setup.sh               # Symlinks config → ~/.pi/agent/
├── extensions/            # Pi extensions
│   ├── continue-after-compaction.ts
│   ├── git-interceptor.ts
│   ├── herdr-agent-state.ts
│   ├── whimsical.ts
│   ├── pi-cloak/
│   ├── pi-skill-toggle/
│   └── save-md/
└── skills/
    ├── engineering/
    ├── productivity/
    └── productivity/
```

## Quickstart

```sh
git clone git@github.com:andrew-hale/pi-config.git
cd pi-config
./setup.sh
```

## Secrets

Secrets aren't stored in plaintext config. `bin/pi` (installed to
`~/.local/bin/pi`) injects them from `pass` into pi's environment at launch, so
pi, its MCP servers, and pi-spawned shells inherit them:

```sh
pass insert dev/brave        # BRAVE_API_KEY (brave-search MCP)
pass insert dev/openrouter   # OPENROUTER_API_KEY (jev tool)
```

`mcp.json` and the `jev` extension read those env vars; a missing `pass` entry is
ignored.

## MCP

Uses pi's built-in MCP support. MCP tools have `codemode` exposure: call them
from a `codemode` script (`searchTools`, `describeTool`, `tools.mcp__<server>__<tool>`),
or load them with `tool_search`.

- **duckdb** — DuckDB in-memory (via `uvx mcp-server-motherduck`)
- **brave-search** — Brave web search (needs `BRAVE_API_KEY`; see Secrets)
- **chrome-devtools-mcp** — Browser automation on `127.0.0.1:9222`

## Keybindings

| Binding | Action |
|---------|--------|
| `Alt+T` | Cycle thinking level |

## Commands

| Command | Extension |
|---------|-----------|
| `/save-md <name>` | Save assistant response as Markdown |
| `/toggle-skills` | Toggle skills agent-invocable / manual-only |
| `/cloak-status` | Secret masking status |
| `/extensions` | Manage packages (pi-extmgr) |
| `/extensions auto-update <when>` | Set package update schedule |

## Herdr

Herdr is a terminal multiplexer for coding agents.

```sh
brew install herdr
brew services start herdr
```

The `herdr-agent-state.ts` extension is auto-managed by herdr.

## Update

```sh
git pull
./setup.sh
```
