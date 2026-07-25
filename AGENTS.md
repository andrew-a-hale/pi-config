# Agents

Pi subagent definitions — the source of truth shared across machines.

## Agent inventory

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| `planner` | deepseek-v4-pro | read, grep, find, ls | Structured implementation plans from scouted context |
| `reviewer` | deepseek-v4-pro | read, grep, find, ls, bash | Code review — bugs, security, over-engineering |
| `scout` | deepseek-v4-flash | read, grep, find, ls | Fast reconnaissance, compressed context for other agents |
| `worker-flash` | deepseek-v4-flash | read, write, edit, bash, grep, find, ls | Simple edits, dead code, one-liners, mechanical changes |
| `worker-pro` | deepseek-v4-pro | read, write, edit, bash, grep, find, ls | Complex multi-file changes, security-critical, judgment |

Agent definitions live in `skills/parallel-todos/agents/` as `.md.in` templates with YAML frontmatter. `setup.sh` substitutes `@PRO@`/`@FLASH@` model placeholders from `machine.conf` and generates the `.md` files into `skills/parallel-todos/agents-generated/`, then symlinks `~/.pi/agent/agents` → that directory. (There is no `package.json` `agents` key — wiring is purely via this symlink.)

## Installation

```sh
git clone <this-repo>
cd pi-config
cp machine.conf.example machine.conf   # edit if your models differ
./setup.sh
```

`setup.sh` generates agent files from `.md.in` templates using model names from `machine.conf`, then symlinks `~/.pi/agent/agents` → `skills/parallel-todos/agents-generated/`.

## Machine-specific models

Agent `.md.in` templates use `@PRO@` and `@FLASH@` placeholders. Each machine has a gitignored `machine.conf` that maps these to real model IDs:

```sh
PRO_MODEL="opencode-go/deepseek-v4-pro"
FLASH_MODEL="opencode-go/deepseek-v4-flash"
```

Run `./setup.sh` after changing `machine.conf` to regenerate agent files.

## Sync workflow

Edit `.md.in` templates in `skills/parallel-todos/agents/` for agent behavior changes, and `machine.conf.example` for new model role defaults. To sync:

```sh
cd pi-config
git add skills/parallel-todos/agents/
git commit -m "agents: <what changed>"
git push
```

On the target machine, pull and re-run `./setup.sh`.

### If you added agents directly in `~/.pi` before cloning

Copy them into the project, then run setup:

```sh
cp ~/.pi/agent/agents/my-agent.md pi-config/skills/parallel-todos/agents/my-agent.md.in   # rename + add @PRO@/@FLASH@ as needed
cd pi-config
./setup.sh   # regenerates agents-generated/ and re-points the symlink
```

## Adding a new agent

1. Create `skills/parallel-todos/agents/<name>.md.in` (a `.md.in` template with `@PRO@`/`@FLASH@` model placeholders):

```markdown
---
name: my-agent
description: What it does
tools: read, grep, find, ls, bash
model: @PRO@
---

System prompt body. No YAML — this is the raw system prompt.
```

Use `@PRO@` or `@FLASH@` in `model:` — `setup.sh` substitutes them from `machine.conf`.

2. Commit. Re-run `./setup.sh` — it regenerates `agents-generated/<name>.md` from the template and re-points the symlink. No `package.json` change needed.

## Model names

Agent `.md.in` templates use `@PRO@`/`@FLASH@` placeholders that `setup.sh` substitutes from `machine.conf` (`PRO_MODEL`, `FLASH_MODEL`). To change which model a role uses, edit `machine.conf` and re-run `setup.sh` — no template edits needed. To pin a single agent to a specific provider/model ID that ignores the placeholders, write the literal `model:` value directly in its `.md.in`.
