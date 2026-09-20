# pi-config

My pi coding agent configuration.

## Structure

```
pi-config/
├── settings.json        # Provider, model, theme, packages
├── keybindings.json     # Custom keybindings
├── system.md            # APPEND_SYSTEM instructions (MCP usage)
├── cloak.json           # Secret masking patterns
├── mcp.json             # MCP servers (global scope; symlinked into ~/.pi/agent/)
├── setup.sh             # Symlinks everything → ~/.pi/agent/
├── bin/                 # Global helper scripts (referenced by MCP configs)
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

pi-mcp-adapter provides a single `mcp()` proxy tool. Config layers, highest wins:

| Path | Scope |
|------|-------|
| `~/.pi/agent/mcp.json` (symlink → `pi-config/mcp.json`) | global, all projects |
| `<project>/.mcp.json` | project — read by pi and Claude Code |
| `<project>/.pi/mcp.json` | project, pi-only overrides (`/mcp disable` writes here) |

Project files are resolved from the **cwd only**, so launch pi at the repo root.

Global servers (this repo):

- **duckdb** — DuckDB in-memory (via uvx mcp-server-motherduck)
- **brave-search** — web search
- **chrome-devtools-mcp** — browser automation against a DevTools endpoint on `:9222`

Project servers belong in that project's `.mcp.json`, not here. `vivanti-labs-platform`
(`~/digital/vivanti-labs-platform/.mcp.json`) carries `clay`, `mox`, `academy`, and `gcp-run`.
The `gcp-run` entry calls `bin/gcp-mcp-headers.sh`, which mints a fresh `gcloud` ADC bearer
token per connection.

## Keybindings

| Binding | Action |
|---------|--------|
| `Alt+T` | Cycle thinking level |

## Update

```sh
git pull
./setup.sh
```
