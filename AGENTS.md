# pi-config

My pi coding agent configuration.

## Structure

```
pi-config/
├── settings.json        # Provider, model, theme, packages
├── keybindings.json     # Custom keybindings
├── system.md            # APPEND_SYSTEM instructions (MCP usage)
├── cloak.json           # Secret masking patterns
├── mcp.json             # MCP server config (duckdb)
├── setup.sh             # Symlinks everything → ~/.pi/agent/
├── extensions/          # Extensions (auto-discovered by pi)
│   ├── git-interceptor.ts
│   ├── whimsical.ts
│   ├── continue-after-compaction.ts
│   ├── herdr-agent-state.ts
│   ├── save-md/          (package extension)
│   ├── pi-skill-toggle/  (package extension)
│   └── pi-cloak/         (package extension)
├── skills/               # Global skills (mattpocock + herdr)
│   ├── engineering/
│   ├── productivity/
│   ├── misc/
│   └── herdr/
└── .gitignore
```

## Quickstart

```sh
git clone git@github.com:you/pi-config.git
cd pi-config
./setup.sh
```

Setup installs pi packages (mcp-adapter, extmgr), mattpocock/skills, extension deps, and symlinks config into `~/.pi/agent/`.

## MCP

pi-mcp-adapter provides a single `mcp()` proxy tool. Configured servers:

- **duckdb** — DuckDB in-memory (via uvx mcp-server-motherduck)

## Keybindings

| Binding | Action |
|---------|--------|
| `Alt+T` | Cycle thinking level |

## Update

```sh
git pull
./setup.sh
```
