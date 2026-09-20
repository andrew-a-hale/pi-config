# herdr

Skills for driving the herdr agent workspace manager.

- **[parallel](./parallel/SKILL.md)** — Run an independent set of tickets in parallel
  (pi, claude, opencode, …), each in its own worktree-backed agent pane, dispatching
  asynchronously and surfacing any agent that needs user input. API reference
  verified against herdr 0.8.0: targeting is by `pane_id` (no `name` field in
  `agent list`), `worktree create` returns a ready root pane (no split needed), and
  includes a worked parallel code-review example.
