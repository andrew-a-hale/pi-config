---
name: memory
description: >
  Project memory system. Reads `.pi/memories/INDEX.md` at session start.
  Saves new facts, decisions, conventions, and preferences to topic files
  under `.pi/memories/`.
---

# Memory System

Memories are stored in `.pi/memories/` relative to the project root.

## Session Start

Read `.pi/memories/INDEX.md` first. Then read any topic files relevant to the current task.

## Saving Memories

When you learn something worth keeping across sessions:

1. Find the matching topic file (or create one, see below)
2. Append a dated entry: `## YYYY-MM-DD — <fact>`
3. If you created a new file, add a row to INDEX.md

Keep entries short. One fact per bullet.

## Creating a New Topic File

When no existing file fits:

1. Create `.pi/memories/<topic>.md` (kebab-case filename)
2. First line: `# <Topic>`
3. Add your first dated entry
4. Add a row to INDEX.md: `[<topic>.md](<topic>.md) — short summary`

## Examples

Save a decision:
```markdown
## 2026-07-09 — Use sqlite over postgres for local dev
```

Save a convention:
```markdown
## 2026-07-09 — Error messages in lowercase, no punctuation
```

Save a preference:
```markdown
## 2026-07-09 — Prefers pnpm over npm
```
