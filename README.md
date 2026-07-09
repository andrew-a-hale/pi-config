# pi-config

My pi coding agent configuration.

## What's here

- **extensions/** — pi extensions
  - `modes.ts` — plan / review / build work modes, cycled with `Shift+Tab`
  - `omarchy-system-theme.ts` — syncs pi's theme with Omarchy's light/dark mode
- **skills/** — pi skills (omarchy, parallel-todos, ponytail)
- **keybindings.json** — custom keybindings (installed to `~/.pi/agent/`)

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
| `Shift+Tab` | Cycle work mode (plan → review → build) |
| `Alt+C` | Cycle caveman mode (off → lite → full → ultra) |
| `Alt+L` | Cycle ponytail mode (off → lite → full → ultra) |
| `Alt+T` | Cycle thinking level |
