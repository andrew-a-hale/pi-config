# pi-config

My pi coding agent configuration. Agent definitions, skills, extensions, prompts, and the Docker-based isolated coding environment.

## What's here

- **extensions/** — pi extensions (mermaid, todo, subagent, omarchy-system-theme)
- **skills/** — pi skills (omarchy, parallel-todos, ponytail, memory)
  - `parallel-todos/agents/` — subagent definitions (planner, reviewer, scout, worker-flash, worker-pro)
- **prompts/** — pi prompt templates (implement, review, scout-and-plan, remember)
- **keybindings.json** — custom keybindings (installed to `~/.pi/agent/`)
- **docker/** — container image and env template for isolated coding
- **bin/isolate** — one-shot containerized fix script (installed to `/usr/local/bin`)
- **[AGENTS.md](AGENTS.md)** — agent configuration reference and sync guide

## Quickstart (new machine)

```sh
git clone git@github.com:you/pi-config.git
cd pi-config
./setup.sh --docker
```

`./setup.sh` alone installs pi config (symlinks, agents, keybindings).
`./setup.sh --docker` also installs Docker, builds the pi container, and installs `isolate`.

## Update

After pulling changes:

```sh
./setup.sh           # pi config only
./setup.sh --docker  # also rebuild container image if Dockerfile changed
```

## VPN (access the host from anywhere)

[Tailscale](https://tailscale.com) — free for personal use, works on iOS, Android, Linux, macOS, Windows.

On the Raspberry Pi (tom):

```sh
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Install the Tailscale app on iPhone and laptop. All devices get a stable `100.x.x.x` IP on the same mesh network. Then:

```sh
ssh tom@100.xx.xx.xx isolate ~/projects/foo "fix the thing"
```

No port forwarding, no DNS, no dynamic IP wrangling.

## Isolate (containerized coding)

```sh
# From any device on the VPN or LAN:
ssh tom isolate https://github.com/you/proj "fix issue #42, run tests, show evidence"
ssh tom isolate ~/projects/foo "refactor auth.ts and verify"
```

What happens:
1. Repo cloned to a temp dir in the container (or local path bind-mounted)
2. pi runs headless with the prompt, tools execute inside the container
3. Changes committed and pushed (for remote repos)
4. Temp dir cleaned up

Secrets live in `docker/.pi-env` (gitignored, `chmod 600`). The named Docker volume `pi-agent-home` persists pi sessions and OAuth tokens across runs.

### Auth bootstrap (one-time)

If you use subscription/OAuth providers (OpenCode, Claude Pro, etc.), log in once from a machine with a browser:

```sh
# On laptop (with browser):
pi
# Inside pi: /login opencode-go

# Copy tokens to tom:
scp ~/.pi/agent/auth.json tom:~

# On tom, seed into the named volume:
docker run --rm \
  -v pi-agent-home:/root/.pi/agent \
  -v ~/auth.json:/tmp/auth.json:ro \
  alpine cp /tmp/auth.json /root/.pi/agent/auth.json
rm ~/auth.json
```

After that tokens auto-refresh. No browser needed on the server again.

## Keybindings

| Binding | Action |
|---------|--------|
| `Alt+L` | Cycle ponytail mode (lite → full → ultra) |
| `Alt+T` | Cycle thinking level |
