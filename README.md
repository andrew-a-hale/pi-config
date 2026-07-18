# pi-config

My pi coding agent configuration. Agent definitions, skills, extensions, prompts, and sandboxed vm.

## What's here

- **extensions/** — pi extensions (mermaid, todo, subagent, omarchy-system-theme)
- **skills/** — pi skills (omarchy, parallel-todos, ponytail, memory)
  - `parallel-todos/agents/` — subagent definitions (planner, reviewer, scout, worker-flash, worker-pro)
- **prompts/** — pi prompt templates (implement, review, scout-and-plan, remember)
- **keybindings.json** — custom keybindings (installed to `~/.pi/agent/`)
- **[AGENTS.md](AGENTS.md)** — agent configuration reference and sync guide

## Quickstart (new machine)

```sh
git clone git@github.com:you/pi-config.git
cd pi-config
./setup.sh --gondolin
```

`./setup.sh` alone installs pi config (symlinks, agents, keybindings).

## Update

After pulling changes:

```sh
./setup.sh           # pi config only
```

## VPN (access the host from anywhere)

[Tailscale](https://tailscale.com) — free for personal use, works on iOS, Android, Linux, macOS, Windows.

On the Raspberry Pi (tom):

```sh
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Install the Tailscale app on iPhone and laptop. All devices get a stable `100.x.x.x` IP on the same mesh network. Then:

No port forwarding, no DNS, no dynamic IP wrangling.

## Keybindings

| Binding | Action |
|---------|--------|
| `Alt+L` | Cycle ponytail mode (lite → full → ultra) |
| `Alt+T` | Cycle thinking level |
