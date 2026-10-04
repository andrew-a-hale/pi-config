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

Setup installs pi packages (extmgr), mattpocock/skills, extension deps, and symlinks config into `~/.pi/agent/`.

## Secrets

Secrets are injected into pi's environment **at launch**, never stored in plaintext
config. `bin/pi` (installed to `~/.local/bin/pi` by `setup.sh`) reads them from
`pass` and execs pi, so pi, its MCP servers, and pi-spawned shells inherit them:

```sh
pass insert dev/brave        # BRAVE_API_KEY (brave-search MCP)
pass insert dev/openrouter   # OPENROUTER_API_KEY (jev tool)
```

`mcp.json` references `${BRAVE_API_KEY}`; `extensions/jev.ts` reads
`$OPENROUTER_API_KEY` first. A missing `pass` entry is ignored — pi still launches
without that secret. `pass` may prompt for the GPG passphrase once per gpg-agent
cache window; use `secret-tool` (gnome-keyring) instead if you want silent launch.

## MCP

Uses pi's built-in MCP support. MCP tools are reached through `codemode`
(`searchTools` / `describeTool` / `tools.mcp__<server>__<tool>`) or `tool_search`.
Config layers, highest wins:

| Path | Scope |
|------|-------|
| `~/.pi/agent/mcp.json` (symlink → `pi-config/mcp.json`) | global, all projects |
| `<project>/.pi/mcp.json` | project, pi-only overrides (`/mcp disable` writes here) |

Project files are resolved from the **cwd only**, so launch pi at the repo root.

Global servers (this repo):

- **duckdb** — DuckDB in-memory (via uvx mcp-server-motherduck)
- **brave-search** — web search
- **chrome-devtools-mcp** — browser automation against a DevTools endpoint on `:9222`

Project servers belong in that project's `.mcp.json`, not here.

## Keybindings

| Binding | Action |
|---------|--------|
| `Alt+T` | Cycle thinking level |

## Update

```sh
git pull
./setup.sh
```
