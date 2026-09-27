# herdr

Skills for driving the herdr agent workspace manager.

- **[parallel](./parallel/SKILL.md)** — Run an independent set of tickets in parallel
  (pi, claude, cortex), each with its own git worktree but all agents as split panes in
  one herdr workspace/tab (no extra tabs). Picks the harness per ticket with the `jev`
  tool from a harness catalog, then dispatches asynchronously and surfaces any agent that
  needs user input. API reference verified against herdr 0.9.1: targeting is by `pane_id`
  (no `name` field in `agent list`), `worktree create` returns a ready root pane that is
  then moved beside an anchor pane with `pane move --split`, and the file includes a
  worked parallel code-review example.
