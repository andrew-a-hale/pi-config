---
name: herdr-parallel
description: Run an independent set of tickets in parallel, each in its own herdr agent pane (pi, claude, or opencode) backed by a git worktree, dispatching asynchronously and surfacing any agent that needs user input. Use when the user wants to run multiple tickets concurrently and wants the ability to interact with each working agent.
---

# Run tickets in parallel with herdr

Turn a set of **independent** tickets into N herdr agent panes, each on its own git
worktree and its own agent process, dispatch the prompts asynchronously, watch for
agents that need a human, and let the user step in (or let it run headless). This skill
is the orchestrator's reference for the herdr API — the one file that removes the need
to know herdr by heart.

Everything happens through the `herdr` CLI over its socket; herdr must be running.
Pi's own agent state is reported to herdr automatically via the `herdr-agent-state`
extension, so both pi and the skill agree on `agent_status`.

## When NOT to use this

- Tickets that touch the **same files, modules, or branch** — they will collide on a
  shared working tree. Parallelize **only independent tickets**. If in doubt, split the
  work first or run them serially. This is a correctness boundary, not a preference.
- You need one coherent codebase at the end; each agent works in its **own worktree**,
  so the results are separate checkouts that must be merged back manually.

## Herdr API the orchestrator needs

All agents queried here are the ones herdr already sees. Target any agent by its
`name` (e.g. `c1-grabber`) or `pane_id` (e.g. `w3N0:p1`).

### Discover agents
```sh
herdr agent list                      # JSON; parse with jq
jq -r '.result.agents[] | "\(.name)\t\(.agent_status)\t\(.cwd)"' \
  <(herdr agent list)
```
Each entry: `name`, `agent` (kind), `pane_id`, `agent_status`, `cwd`, `workspace_id`.

### Create the workspace for one ticket
```sh
herdr worktree create \
  --path <abs/worktree/path> \
  --branch <feature-branch> \
  --base <branch-or-commit> \
  --label <short-ticket-label>        # shows in the UI
```
Creates a git worktree and opens a tab. Keep one worktree per ticket.

### Spawn an agent in that pane
```sh
herdr pane split --current --direction right --cwd <worktree-path>
herdr agent start <name> --kind <KIND> --pane <pane-id> --timeout <MS>
```
`--kind` accepts `pi`, `claude`, `opencode`, and more. Pick the name convention
`<c|p|o><n>-<label>` (e.g. `c1-grabber`) matching how herdr already names parallel
agents. The pane must be sitting at its interactive shell prompt before `agent start`
succeeds.

### Dispatch a prompt (async — this is what makes it parallel)
```sh
herdr agent prompt <target> <ticket-text>     # fire-and-forget; returns immediately
```
Do not pass `--wait` here: you want to dispatch every ticket up front, then supervise.

### Supervise / wait
```sh
herdr agent wait <target> --until idle --timeout <MS>
herdr agent wait <target> --until blocked --timeout <MS>
```
Or just poll `herdr agent list` as your watch loop.

### Interact (the user's seam)
```sh
herdr agent focus <target>      # bring it to the foreground for the user
herdr agent read <target>       # read recent output
herdr agent prompt <target> <text>   # answer a blocked agent's question
```

## Agent states — the done-vs-blocked decision

`agent_status` is one of: `working`, `idle`, `blocked`, `done`, `unknown`.

- `blocked` — the agent **paused and asked a question**. It is waiting on the user.
  **This is a stop signal for your supervisor.** Do not assume it finished; surface it.
- `done` — terminal: the agent reports it finished its turn and is not continuing.
- `idle` — the agent is sitting at its prompt. **Ambiguous**: it may be genuinely
  finished OR waiting for the next instruction OR ready for the next turn.

Rules for the orchestration loop:

- A ticket is **awaiting user** when `blocked`. Surface every blocked agent to the
  user with its name, worktree path, and the question you can glean from
  `herdr agent read`.
- A ticket is **finished** when it reaches `done`, or `idle` *and* the agent's last
  action on it has no open question and you've stopped driving it. `idle` alone is
  never proof of finished — only of "it isn't working right now."
- To disambiguate a specific ticket, check `agent list` for its `agent_status` and
  read its tail output before declaring it done.

## Orchestration loop

1. Read the ticket set. Each ticket = `label` + `prompt` + `branch` (suggest a branch
   per ticket if the user hasn't given them).
2. Gate on independence — refuse overlapping work. State the dependency check you ran
   (same files / modules?) so the user can override.
3. Bound concurrency: default `--workers N` = min(tickets, 4). Parallel agents are
   heavy; don't spawn unbounded.
4. For each ticket within the worker budget, in order:
   `worktree create` → wait for interactive prompt → `pane split --cwd` →
   `agent start --kind <kind>` → `agent prompt <target> <ticket-text>` (async).
5. **Watch loop**: `agent wait <target> --until blocked --timeout <X>` per agent, or
   poll `agent list`. Every `blocked` → tell the user which pane and what it's asking.
   Every finished ticket → record its worktree path + branch + outcome, and free its
   worker slot for the next queued ticket.
6. When all tickets resolved, summarize: per ticket — worktree path, branch, status,
   and the user-facing note on how it went. Point at any `blocked` agents the user
   must answer before calling that ticket done.

## Notes

- `blocked` agents are left **paused**, never guessed-at or force-continued. The
  user decides: answer it, or close/rename it. Guessing on a blocked agent is how
  parallel work silently goes sideways.
- Clear the history/roll-up yourself; the skill doesn't. Suggest cleaning up
  `herdr worktree remove` / closing finished panes when the user is done so the
  session doesn't fill with dead panes.
- The whole skill is `herdr` CLI calls — no daemon, no config file, no wrapper binary.
