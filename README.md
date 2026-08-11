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

## MCP

pi-mcp-adapter provides a single `mcp()` proxy tool.

- **duckdb** — DuckDB in-memory (via `uvx mcp-server-motherduck`)

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
