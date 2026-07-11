# pi-config

My pi coding agent configuration.

## What's here

- **extensions/** — pi extensions
  - `omarchy-system-theme.ts` — syncs pi's theme with Omarchy's light/dark mode
- **skills/** — pi skills (omarchy, parallel-todos, ponytail)
  - `parallel-todos/agents/` — subagent definitions (planner, reviewer, scout, worker-flash, worker-pro)
- **keybindings.json** — custom keybindings (installed to `~/.pi/agent/`)
- **[AGENTS.md](AGENTS.md)** — agent configuration reference and sync guide

## Install

```sh
git clone <this-repo>
cd pi-config
./setup.sh
```

## Update

After pulling changes to this repo, re-run:

```sh
./setup.sh
```

`pi install` is idempotent — same extensions/skills, same keybindings, no duplication.

## Keybindings

| Binding | Action |
|---------|--------|
| `Alt+L` | Cycle ponytail mode (lite → full → ultra) |
| `Alt+T` | Cycle thinking level |
