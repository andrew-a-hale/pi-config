---
name: herdr-parallel
disable-model-invocation: true
description: Run an independent set of tickets in parallel, each in its own herdr agent pane (pi, claude, or opencode) backed by a git worktree, dispatching asynchronously and surfacing any agent that needs user input. Use when the user wants to run multiple tickets concurrently and wants the ability to interact with each working agent.
---

# Run tickets in parallel with herdr

Turn a set of **independent** tickets into N herdr agent panes, each on its own git
worktree and its own agent process, dispatch the prompts asynchronously, watch for
agents that need a human, and let the user step in (or let it run headless). This skill
is the orchestrator's reference for the herdr API — the one file that removes the need
to know herdr by heart.

Everything happens through the `herdr` CLI over its socket; herdr must be running
(`herdr status` to check). Pi's own agent state is reported to herdr automatically via
the `herdr-agent-state` extension, so both pi and the skill agree on `agent_status`.

## When NOT to use this

- Tickets that touch the **same files, modules, or branch** — they will collide on a
  shared working tree. Parallelize **only independent tickets**. If in doubt, split the
  work first or run them serially. This is a correctness boundary, not a preference.
- You need one coherent codebase at the end; each agent works in its **own worktree**,
  so the results are separate checkouts that must be merged back manually.

## Herdr API (verified against herdr 0.8.0)

Every command returns a JSON envelope: `{"id": "...", "result": {...}, "type": "..."}`.
Parse with `jq -r '.result.<field>'`.

**Targeting: every agent command takes a `TARGET`, which is the `pane_id`** (e.g.
`w3PW:p1`). There is no `name` field in `agent list` output — do not invent one. The
name you pass to `agent start` is display-only (UI/title); target by `pane_id` always.

### Per-ticket sequence — the whole loop in four commands

```sh
# 1. Create the workspace. The root pane is ALREADY at a shell prompt in the
#    worktree — no pane split needed for the first agent.
J=$(herdr worktree create --cwd /path/to/repo --branch ticket-1 --base main --label grabber)
PANE=$(jq -r '.result.root_pane.pane_id' <<<"$J")     # e.g. w3PW:p1 — this is your TARGET
WT=$(jq -r '.result.worktree.path' <<<"$J")           # e.g. ~/.herdr/worktrees/repo/ticket-1

# 2. Start the agent in the root pane. Blocks until the agent is detected and
#    ready for input (up to --timeout). Raises error if the pane isn't at a prompt.
herdr agent start c1-grabber --kind pi --pane "$PANE" --timeout 60000

# 3. Dispatch the ticket prompt — async, returns immediately.
herdr agent prompt "$PANE" "Review src/auth/ for auth-bypass issues. Read-only: report findings, do not edit files."

# 4. Supervise: wait for done OR blocked (flags are repeatable).
herdr agent wait "$PANE" --until done --until blocked --timeout 600000
herdr agent read "$PANE" --lines 40    # tail of the agent's terminal
```

State right after `worktree create` / `agent start` is often `unknown` — detection
settles within seconds. If `agent start` fails to detect, debug with
`herdr agent explain "$PANE" -v`.

### Discover agents

```sh
herdr agent list
jq -r '.result.agents[] | "\(.pane_id)\t\(.agent_status)\t\(.cwd)"' \
  <(herdr agent list)
```

Fields per agent: `agent` (kind), `pane_id`, `agent_status`, `cwd`, `workspace_id`,
`tab_id`, `focused`. Filter to your panes by `workspace_id` or by cwd matching your
worktree paths.

### Need a second agent in the same tab? Only then split.

```sh
PANE2=$(herdr pane split --pane "$PANE" --direction down --cwd "$WT" \
        | jq -r '.result.pane.pane_id')
herdr agent start c2-grabber --kind pi --pane "$PANE2" --timeout 60000
```

### Dispatch semantics (`agent prompt`)

- Plain `herdr agent prompt <TARGET> <TEXT>` — fire-and-forget, returns immediately.
  Dispatch all tickets up front, then supervise.
- `--wait --until done --timeout <MS>` turns dispatch into a synchronous wait for the
  settled state — fine for a single ticket or a simple headless review, but for N
  tickets dispatch everything async first, then `agent wait` per target.
- `--wait` requires an observed state change within 5000ms or it fails with
  `agent_prompt_stalled`; it does not track turns — if the agent is already `working`,
  the current turn's completion may match.
- Without `--timeout` on `--wait`/`agent wait`, the wait is indefinite. Always pass a
  `--timeout` in scripts.

### Supervise

```sh
herdr agent wait <TARGET> --until blocked --timeout <MS>
herdr agent list                          # cheap poll of all agents
herdr agent get <TARGET>                  # one agent's full JSON
```

### Interact (the user's seam)

```sh
herdr agent focus <TARGET>                 # bring the pane to the foreground
herdr agent read <TARGET> --lines <N>      # read recent output (--source recent|visible)
herdr agent prompt <TARGET> "<answer>"     # answer a blocked agent's question
herdr agent send-keys <TARGET> esc         # e.g. interrupt a runaway agent
```

### Clean up

```sh
herdr worktree remove --workspace <WORKSPACE_ID> --force
```

`WORKSPACE_ID` is on the `worktree create` result (`.result.workspace.workspace_id`)
and in `herdr worktree list`. Suggest cleanup of finished panes when the user is done.

## Agent states — the done-vs-blocked decision

`agent_status` is one of: `working`, `idle`, `blocked`, `done`, `unknown`.

- `blocked` — the agent **paused and asked a question**. It is waiting on the user.
  **This is a stop signal for your supervisor.** Do not assume it finished; surface it.
- `done` — terminal: the agent finished its turn and is not continuing.
- `idle` — sitting at its prompt. **Ambiguous**: finished, waiting for instruction, or
  mid-gap. `idle` alone is never proof of finished — read its tail output
  (`herdr agent read`) before declaring it done.

Rules:

- A ticket is **awaiting user** when `blocked`. Surface every blocked agent with its
  pane, worktree path, and the question gleaned from `herdr agent read`.
- A ticket is **finished** when `done`, or `idle` with no open question and you've
  stopped driving it.
- Blocked agents are left **paused**, never guessed-at or force-continued. The user
  decides. Guessing on a blocked agent is how parallel work silently goes sideways.

## Orchestration loop

1. Read the ticket set. Each ticket = `label` + `prompt` + `branch` (suggest a branch
   per ticket if the user hasn't given one).
2. Gate on independence — refuse overlapping work. State the dependency check you ran
   (same files / modules?) so the user can override.
3. Bound concurrency: default = min(tickets, 4). Parallel agents are heavy; don't
   spawn unbounded.
4. Run the per-ticket sequence above for each ticket within the worker budget
   (`worktree create` → `agent start` → async `agent prompt`).
5. Watch loop: `agent wait ... --until done --until blocked --timeout <X>` per agent,
   or poll `agent list`. Every `blocked` → tell the user which pane and what it's
   asking. Every finished ticket → record worktree path + branch + outcome, free the
   worker slot for the next queued ticket.
6. When all tickets resolve, summarize: per ticket — worktree path, branch, status,
   and a user-facing note on how it went. Point at any `blocked` agents the user must
   answer before calling that ticket done.

## Worked example: parallel code review

Three independent review scopes (different modules), dispatched together:

```sh
# Dispatch phase — all three up front, async
for i in 1 2 3; do
  case $i in
    1) BR=rev-auth;   PROMPT="Review src/auth/ for auth-bypass and session bugs. Read-only; report findings and severity." ;;
    2) BR=rev-api;    PROMPT="Review src/api/ for error-handling and input-validation gaps. Read-only." ;;
    3) BR=rev-db;     PROMPT="Review migrations/ for missing indexes and unsafe DDL. Read-only." ;;
  esac
  J=$(herdr worktree create --cwd "$REPO" --branch "$BR" --base main --label "rev-$i")
  PANE=$(jq -r '.result.root_pane.pane_id' <<<"$J")
  herdr agent start "c$i-rev" --kind pi --pane "$PANE" --timeout 60000
  herdr agent prompt "$PANE" "$PROMPT"
  echo "rev-$i -> $PANE"
done

# Collect phase — wait each pane out, read results
for t in $TARGETS; do
  herdr agent wait "$t" --until done --until blocked --timeout 900000 || true
  echo "== $t"; herdr agent read "$t" --lines 60
done
# Summarize findings per pane; surface any blocked agents with their question.
```

Review prompts should say **read-only** explicitly — otherwise a spawned agent may
start "fixing" files in its worktree.
