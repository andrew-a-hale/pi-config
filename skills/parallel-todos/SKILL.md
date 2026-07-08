---
name: parallel-todos
description: "Orchestrator playbook for parallel subagent execution via the subagent extension. Use when decomposing work into waves, running subagents with different models, repairing failures, reviewing changes, and driving work to completion. (Trigger phrases: 'parallel todos', 'run todos', 'subagents', 'wave execution', 'orchestrate', 'TODO file', 'repair loop', 'review gate')"
metadata:
  internal: true
---

# Parallel TODOs — Orchestrator Playbook

The main agent is the **orchestrator**. It decomposes work, calls the [`subagent`](https://pi.dev) tool to spawn workers, validates results, reviews diffs, repairs failures, and commits wave-by-wave. The orchestrator never fires-and-forgets — it loops until every wave passes review.

## Prerequisites

The [subagent extension](https://pi.dev) must be installed. Agent definitions live in `~/.pi/agent/agents/`. This skill ships with agent definitions in `agents/` — symlink or copy them into `~/.pi/agent/agents/`:

```bash
mkdir -p ~/.pi/agent/agents
for f in ~/.pi/agent/skills/parallel-todos/agents/*.md; do
  ln -sf "$f" ~/.pi/agent/agents/$(basename "$f")
done
```

The shipped agents are:

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| `worker-flash` | `deepseek-flash` | read,write,edit,bash,grep,find,ls | Simple edits, dead code, one-liners, mechanical changes |
| `worker-pro` | `deepseek-v4-pro` | read,write,edit,bash,grep,find,ls | Complex reasoning, multi-file, security-critical |
| `reviewer` | `deepseek-v4-pro` | read,grep,find,ls,bash | Code review (read-only — `bash` is for `git diff/log/show` only) |
| `scout` | `deepseek-flash` | read,grep,find,ls | Fast codebase reconnaissance, returns compressed context |

If your models have different names, edit the `model:` field in those agent `.md` files.

---

## 1. The Three-Mode Cycle

Every wave goes through three modes.

```
Wave N ──▶ EXECUTE ──▶ validate ──┬── fail ──▶ REPAIR ──▶ re-validate ──┬── fail ──▶ (loop)
                                  │                                       │
                                  └── pass ──▶ REVIEW ──┬── issues ──▶ REPAIR ──▶ (loop)
                                                        │
                                                        └── clean ──▶ COMMIT ──▶ Wave N+1
```

### EXECUTE mode

1. Parse the wave from TODO.md: extract subagent tasks with their agent, task description, and tools
2. Call the **`subagent`** tool in **parallel mode**:

```
subagent({
  agentScope: "user",
  tasks: [
    { agent: "worker-pro", task: "..." },
    { agent: "worker-flash", task: "..." },
  ]
})
```

3. Read the tool result. Each task returns: exit code, output text, stop reason, usage stats
4. Run the wave's validation command via `bash` — the result is the wave gate
5. If validation passes → advance to REVIEW
6. If validation fails → enter REPAIR mode

### REPAIR mode

Same as EXECUTE but scoped to the specific failure.

- Inspect the failed subagent's output from the tool result — it's the `content[0].text` field, or dig into `details.results[]` for per-task stderr/output
- Identify the root cause: wrong edit, missed file, test failure, validation command broken
- Write a micro-TODO (1-2 subagents) scoped to the failure
- Run repair subagents via `subagent` tool (single or parallel)
- Re-run validation via `bash`
- If still failing → loop (deeper diagnosis, re-read files, broader scope)
- If passing → return to the mode that triggered the repair

### REVIEW mode

- The orchestrator reviews the wave's diff: `bash("git diff")`
- Check: correctness, over-engineering, security, test coverage, style
- For complex waves, spawn a **`reviewer`** subagent:

```
subagent({ agent: "reviewer", task: "Review all changes from this wave. Check for bugs, security issues, and over-engineering. Focus on correctness." })
```

- If issues found → enter REPAIR with findings as concrete subagent tasks
- If clean → commit the wave (`git add -A && git commit -m "..."`), advance to next wave

---

## 2. TODO File Format

The TODO.md is the orchestrator's planning document. The orchestrator reads it and translates each wave into `subagent` tool calls.

```markdown
## Wave 1: Fix auth bypass (@validate: mix test)

### Subagent 1.1: Replace hardcoded email (@agent: worker-pro)
**File:** `lib/app/module.ex:42-48`
**Problem:** Reads hardcoded "dev@vivanti.com" instead of session.
**Fix:** Read user_email from `get_session(socket, :user_email)`, add `dev_email/0` helper.
- [ ] Replace line 42 with session lookup
- [ ] Add dev_email/0 helper function

### Subagent 1.2: Remove dead code (@agent: worker-flash)
**File:** `lib/app/deprecated.ex`
**Problem:** Entire file is unused.
**Fix:** Delete the file, remove its import in `lib/app.ex`.

## Wave 2: Add tests (@validate: mix test --cover)
...
```

Rules:
- **`##`** = wave heading. Must include `(@validate: shell command)` at end — the gate.
- **`###`** = subagent heading. Must include `(@agent: name)` — which agent definition to use (worker-flash, worker-pro, reviewer, scout).
- Task description follows the heading — include exact file paths and expected code changes.
- `- [ ]` checkboxes track per-task steps. Mark `[x]` after success.
- Flat mode (no `###` headings): `## Wave N (@agent: worker-pro, @validate: ...)` — one subagent covering the whole wave. Used for simple waves.

### How the orchestrator reads a TODO wave

For each `### Subagent` entry, the orchestrator extracts:

| Field | Source | Maps to |
|-------|--------|---------|
| Agent | `@agent:` annotation | `subagent`'s `tasks[].agent` parameter |
| Task | Everything between the heading and the next heading/end | `subagent`'s `tasks[].task` parameter |
| Validation | `@validate:` on the wave heading | `bash` call after all tasks complete |

No fictional `run_todos()` — the orchestrator literally calls `subagent({ tasks: [...] })` with the parsed data.

---

## 3. Model / Agent Selection

Two agents for two weight classes. Match task weight.

| Task type | Agent | Why |
|:---|:---|:---|
| Dead code, one-liners, simple edits, mechanical changes | `worker-flash` | Fast, cheap (deepseek-flash) |
| Complex reasoning, multi-file, security-critical, review | `worker-pro` | Heavy, thorough (deepseek-v4-pro) |

`worker-flash` for anything a junior dev could do in <5 minutes. `worker-pro` for anything involving judgment, architecture, or multiple interacting files.

Always specify `@agent:` explicitly — never rely on a default.

---

## 4. Writing Actionable Subagent Tasks

A subagent only edits files if the task description demands it. Be explicit:

- **File path** — absolute or relative from project root
- **Expected change** — not "fix the bug" but "change line 13 from X to Y, add guard clause Z"
- **Why** — brief context so the subagent understands the intent
- **Checkboxes** — `- [ ]` items in the description; mark `[x]` after verifying success

Bad: `Fix auth bypass in LiveView`
Good: `Read user_email from get_session(socket, :user_email) instead of hardcoding "dev@vivanti.com". Add dev_email/0 helper.`

---

## 5. Wave Design

- **Dependencies first** — security/auth in Wave 1, dependent modules in later waves
- **Parallel within waves** — tasks touching different files/modules run together via `subagent({ tasks: [...] })`
- **Same-module conflicts** — split across waves (each wave commits, avoids merge conflicts)
- **Self-contained** — each wave should be safe to commit independently
- **Gate with validation** — `@validate:` on every wave. Without a gate, bad changes cascade.
- **Max 4 parallel tasks per wave** — the `subagent` tool caps at 4 concurrent

---

## 6. Reading Subagent Results

After a `subagent` tool call, the result is a `ToolResult` object. Key fields:

### Top-level
| Field | Meaning |
|:---|:---|
| `content[0].text` | Summary: "Parallel: 2/3 succeeded" + per-task output |
| `details.results[]` | Array of per-task results |
| `isError` | `true` if the subagent call itself failed (not individual tasks) |

### Per-task (`details.results[i]`)
| Field | Meaning |
|:---|:---|
| `agent` | Agent name used |
| `task` | The task string sent |
| `exitCode` | `0` = success, non-zero = failure, `-1` = still running |
| `stopReason` | `"end"` (normal), `"error"` (LLM error), `"aborted"` (Ctrl+C) |
| `errorMessage` | Error text if `stopReason === "error"` |
| `stderr` | Stderr from the subprocess |
| `messages[]` | Full message history (text, tool calls, tool results) |
| `usage` | `{ input, output, cacheRead, cacheWrite, cost, contextTokens, turns }` |
| `model` | Actual model used |

### Getting a task's final output
The last assistant message's text content in `messages[]` is the subagent's final answer. For failed tasks, also check `errorMessage` and `stderr`.

### Checking success/failure
A task succeeded if: `exitCode === 0` AND `stopReason` is not `"error"` or `"aborted"`.

---

## 7. Failure Patterns

| Symptom | Cause | Fix |
|:---|:---|:---|
| Subagent `exitCode: 0` but no file edits visible in `git diff` | Task description didn't demand edits | Rewrite task with explicit file paths + expected code changes |
| Subagent `stopReason: "error"` | Model crashed or hit context limit | Switch to lighter agent, simplify task, or split into smaller steps |
| Validation failed (bash exit != 0) | Code change broke tests or compilation | Enter REPAIR — read subagent output, fix root cause, re-validate |
| Wave halted, remaining skipped | Validation failure gates next wave | Fix issue, re-run from halted wave (strip completed waves from TODO) |
| All subagents ran but nothing changed | Missing `write`/`edit` in agent tools | Check the agent `.md` file — ensure `tools:` includes write and edit |
| Subagent returned `(no output)` | Model produced no final text | Task may be too vague — add explicit "Output format" / "Expected result" |

---

## 8. The Orchestrator Loop (Summary)

```
1. Decompose: write waves + subagent tasks into TODO.md
2. For each wave:
   a. EXECUTE: call subagent({ tasks: [...] }) with parsed tasks
   b. Read subagent result — check per-task exitCode and output
   c. Run bash(validation command) — wave gate
   d. If fail → REPAIR (micro-tasks → subagent → bash validate → loop)
   e. If pass → REVIEW (read git diff, optionally call reviewer subagent)
   f. If review finds issues → REPAIR (same loop)
   g. If clean → bash("git add -A && git commit -m '...'")
   h. Mark wave checkboxes [x] in TODO.md
3. Done when all waves committed
```

---

*The orchestrator owns the outcome. Subagents are tools, not contractors — if one fails, the orchestrator diagnoses and retries, it doesn't just report failure.*
