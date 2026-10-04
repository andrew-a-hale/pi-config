---
name: herdr-parallel
disable-model-invocation: true
description: Run an independent set of tickets in parallel, each with its own git worktree and its own herdr agent pane (harness chosen per ticket by jev), all panes split into one herdr workspace/tab, dispatching asynchronously and surfacing any agent that needs user input. Use when the user wants to run multiple tickets concurrently and wants the ability to interact with each working agent.
---

# Run tickets in parallel with herdr

Turn a set of **independent** tickets into N herdr agent panes, each with its own git
worktree checkout and its own agent process, all shown as split panes in **one herdr
workspace/tab** (no extra tabs). Dispatch the prompts asynchronously, watch for agents
that need a human, and let the user step in (or let it run headless). This skill is the
orchestrator's reference for the herdr API — the one file that removes the need to know
herdr by heart.

Everything happens through the `herdr` CLI over its socket; herdr must be running
(`herdr status` to check). Pi's own agent state is reported to herdr automatically via
the `herdr-agent-state` extension, so both pi and the skill agree on `agent_status`.

## When NOT to use this

- Tickets that touch the **same files, modules, or branch** — they will collide on a
  shared working tree. Parallelize **only independent tickets**. If in doubt, split the
  work first or run them serially. This is a correctness boundary, not a preference.
- You need one coherent codebase at the end; each agent works in its **own worktree**,
  so the results are separate checkouts that must be merged back manually.

## Herdr API (verified against herdr 0.9.1)

Every command returns a JSON envelope: `{"id": "...", "result": {...}, "type": "..."}`.
Parse with `jq -r '.result.<field>'`.

**Targeting: every agent command takes a `TARGET`, which is the `pane_id`** (e.g.
`w3PW:p1`). There is no `name` field in `agent list` output — do not invent one. The
name you pass to `agent start` is display-only (UI/title); target by `pane_id` always.

## Choose the harness with jev

`--kind` is a **per-ticket** decision, not a fixed `pi`. Before dispatching, ask **Jev**
— the `jev` tool (typed decisions, not chat) — which harness fits each ticket. Send one
`choice` question per ticket in a single call: `criteria` maps each `--kind` value to a
one-line fit, and `state` carries the tickets plus the same catalog in prose.

Catalog — read the harnesses installed and authenticated **on this machine** from
`machine.conf` (one `kind|fit` line each):

```sh
~/.pi/agent/bin/harnesses
```

Labels must equal `herdr agent start --kind` values exactly. This is the context Jev
picks from, so keep each fit about *fit*. If the helper is missing or lists nothing,
fall back to the built-in default below and say so:

| kind | fit |
|------|-----|
| `pi` | this environment's coding agent; strong repo/file tools; runs here directly |
| `claude` | Anthropic Claude Code; careful multi-file refactors and review; long context |
| `cortex` | Snowflake Cortex CLI (Claude-like); Snowflake/data-adjacent work |

> `cortex` is **not** a launchable herdr agent kind in 0.9.1 — `herdr agent start --kind
> cortex` fails with `unsupported interactive agent kind: cortex`, and a new kind needs a
> herdr binary update. Herdr can still adopt cortex as a *claude* agent via the wrapper
> hint, then drive it normally:
>
> ```sh
> herdr pane run "$PANE" "HERDR_AGENT=claude cortex"   # instead of `agent start`
> herdr agent wait "$PANE" --timeout 60000            # detection settles; then `agent prompt`
> ```
>
> So when jev picks `cortex`, branch the launch: `pane run` as above instead of
> `agent start`, then continue from step 3 unchanged (`agent prompt`/`agent wait` target
> the pane, which herdr now reports as `claude`).

Build `criteria` from the helper's `kind|fit` lines (the example below shows the
default three). One call, one question per ticket:

```js
jev({
  state: "Harness fits:\n- pi: this environment's coding agent; strong repo/file tools\n" +
         "- claude: Anthropic Claude Code; careful refactors and review; long context\n" +
         "- cortex: Snowflake Cortex CLI (Claude-like); Snowflake/data-adjacent work\n" +
         "\nTickets:\n- grabber: Review src/auth for auth-bypass. Read-only.\n" +
         "- api: Fix failing input-validation tests.",
  questions: {
    grabber: { type: "choice", instructions: "Best harness for ticket 'grabber'",
               criteria: { pi: "general repo work; strong file tools",
                           claude: "careful review, long context",
                           cortex: "Snowflake Cortex CLI, Claude-like" } },
    api:     { type: "choice", instructions: "Best harness for ticket 'api'",
               criteria: { pi: "general repo work; strong file tools",
                           claude: "careful review, long context",
                           cortex: "Snowflake Cortex CLI, Claude-like" } }
  }
})
```

Read each pick from `answers.<ticket>.choice` — the result is
`{"answers":{"grabber":{"choice":"claude","probabilities":{...},"confidence":0.9}}}`.
Pass it as `--kind`. If the `jev` call fails (no OpenRouter key) or returns no `choice`,
default to `pi` and say so in the summary.

### Per-ticket sequence — the whole loop, once per ticket

```sh
# 0. Pick the ONE shared workspace + tab BEFORE the loop. Each agent is added as a
#    split pane here — no new tabs. Defaults to the orchestrator's own workspace/tab,
#    anchored beside the orchestrator's pane; set DEDICATED=1 for a fresh workspace.
if [ -n "${DEDICATED:-}" ] || [ -z "${HERDR_WORKSPACE_ID:-}" ]; then
  WC=$(herdr workspace create --label parallel)
  SHARED_WS=$(jq -r '.result.workspace.workspace_id' <<<"$WC")
  TAB=$(jq -r '.result.tab.tab_id' <<<"$WC")
  ANCHOR=$(jq -r '.result.root_pane.pane_id' <<<"$WC")
else
  SHARED_WS="$HERDR_WORKSPACE_ID"; TAB="$HERDR_TAB_ID"; ANCHOR="$HERDR_PANE_ID"
fi

# 1. Create the worktree. herdr first opens it as its own (child) workspace and
#    returns that workspace's root pane, already at a shell prompt in the checkout.
J=$(herdr worktree create --cwd "$REPO" --branch ticket-1 --base main --label grabber)
PANE=$(jq -r '.result.root_pane.pane_id' <<<"$J")     # e.g. w3PW:p1
WT=$(jq -r '.result.worktree.path' <<<"$J")           # e.g. ~/.herdr/worktrees/repo/ticket-1

# 1b. Move that shell into the shared tab as a split beside ANCHOR. The shell keeps
#     its cwd (the worktree); the now-empty worktree workspace closes. Chain ANCHOR
#     so each new agent splits off the previous one (`down` instead of `right` if the
#     row would get too narrow).
PANE=$(herdr pane move "$PANE" --tab "$TAB" --split right --target-pane "$ANCHOR" \
  | jq -r '.result.move_result.pane.pane_id')
ANCHOR="$PANE"

# 2. Start the agent (KIND from the jev pick above) in the relocated pane. Blocks
#    until the agent is detected and ready for input (up to --timeout). Raises error
#    if the pane isn't at a prompt. For KIND=cortex use the wrapper instead:
#      herdr pane run "$PANE" "HERDR_AGENT=claude cortex"
herdr agent start c1-grabber --kind "$KIND" --pane "$PANE" --timeout 60000

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
`tab_id`, `focused`. Every parallel pane lives in the same `SHARED_WS`/`TAB`, so filter
to them by cwd matching the worktree paths or by the agent `name` from `agent start` —
not by workspace_id. `herdr pane rename "$PANE" rev-auth` labels a pane in the UI if
the agent name isn't enough.

### Need a second agent for the same ticket? Only then split that one pane.

```sh
PANE2=$(herdr pane split --pane "$PANE" --direction down --cwd "$WT" \
        | jq -r '.result.pane.pane_id')
herdr agent start c2-grabber --kind "$KIND" --pane "$PANE2" --timeout 60000
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
git -C "$REPO" worktree remove --force "$WT"   # one per ticket
```

Step 1b moved the pane out, so the worktree's child workspace is already closed and
`herdr worktree remove --workspace` has no target left — remove the checkout with git.
Close the finished panes, and if you set `DEDICATED=1`, close that workspace too
(`herdr workspace close "$SHARED_WS"`). Suggest cleanup when the user is done.

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
2. Ask **jev** for the harness per ticket (one call, one `choice` question per ticket,
   catalog from `~/.pi/agent/bin/harnesses` as `criteria`) and record each
   `answers.<ticket>.choice` as its `KIND`; default to `pi` if jev is unavailable.
3. Gate on independence — refuse overlapping work. State the dependency check you ran
   (same files / modules?) so the user can override.
4. Bound concurrency: default = min(tickets, 4). Parallel agents are heavy; don't
   spawn unbounded.
5. Run the per-ticket sequence above for each ticket within the worker budget
   (`worktree create` → `pane move --split` beside `ANCHOR` → `agent start` → async
   `agent prompt`).
6. Watch loop: `agent wait ... --until done --until blocked --timeout <X>` per agent,
   or poll `agent list`. Every `blocked` → tell the user which pane and what it's
   asking. Every finished ticket → record worktree path + branch + outcome, free the
   worker slot for the next queued ticket.
7. When all tickets resolve, summarize: per ticket — worktree path, branch, harness
   (`KIND`), status, and a user-facing note on how it went. Point at any `blocked`
   agents the user must answer before calling that ticket done.

## Worked example: parallel code review

Three independent review scopes (different modules), dispatched together:

```sh
# Harness: one jev call, one `choice` question per review scope (`rev-auth`, `rev-api`,
# `rev-db`), catalog as criteria — read each answers.<ticket>.choice into KIND below.
# (Shown here as pre-picked values; fall back to pi if the jev call fails.)

# Dispatch phase — all three up front, async, all panes split into one tab
if [ -n "${DEDICATED:-}" ] || [ -z "${HERDR_WORKSPACE_ID:-}" ]; then
  WC=$(herdr workspace create --label parallel)
  SHARED_WS=$(jq -r '.result.workspace.workspace_id' <<<"$WC")
  TAB=$(jq -r '.result.tab.tab_id' <<<"$WC")
  ANCHOR=$(jq -r '.result.root_pane.pane_id' <<<"$WC")
else
  SHARED_WS="$HERDR_WORKSPACE_ID"; TAB="$HERDR_TAB_ID"; ANCHOR="$HERDR_PANE_ID"
fi
for i in 1 2 3; do
  case $i in
    1) BR=rev-auth; KIND=claude; PROMPT="Review src/auth/ for auth-bypass and session bugs. Read-only; report findings and severity." ;;
    2) BR=rev-api;  KIND=pi;     PROMPT="Review src/api/ for error-handling and input-validation gaps. Read-only." ;;
    3) BR=rev-db;   KIND=claude; PROMPT="Review migrations/ for missing indexes and unsafe DDL. Read-only." ;;
  esac
  J=$(herdr worktree create --cwd "$REPO" --branch "$BR" --base main --label "rev-$i")
  PANE=$(jq -r '.result.root_pane.pane_id' <<<"$J")
  PANE=$(herdr pane move "$PANE" --tab "$TAB" --split right --target-pane "$ANCHOR" \
    | jq -r '.result.move_result.pane.pane_id')
  ANCHOR="$PANE"
  herdr agent start "c$i-rev" --kind "$KIND" --pane "$PANE" --timeout 60000
  herdr agent prompt "$PANE" "$PROMPT"
  TARGETS="$TARGETS $PANE"
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
