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

Agent definitions live in `skills/parallel-todos/agents/` as individual `.md` files with YAML frontmatter. The `package.json` `agents` key points pi there, and `setup.sh` symlinks `~/.pi/agent/agents` → that directory.

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
cp ~/.pi/agent/agents/my-agent.md pi-config/skills/parallel-todos/agents/
cd pi-config
./setup.sh   # re-creates symlink
```

## Adding a new agent

1. Create `skills/parallel-todos/agents/<name>.md`:

```markdown
---
name: my-agent
description: What it does
tools: read, grep, find, ls, bash
model: provider/model-id
---

System prompt body. No YAML — this is the raw system prompt.
```

2. Commit. `setup.sh` picks it up automatically — no config changes needed.

## Model names

The `model:` field in each agent `.md` uses your configured provider/model IDs. If your provider names differ (e.g. OpenRouter), adjust the `model:` field in each agent file.
