# TODO: /tree — Session Tree Visualizer

Build a `/tree` slash command that renders the conversation tree as an
interactive TUI. Users can browse branches, see which are current vs dead,
and navigate by selecting a node.

## Wave 1: Scaffold extension + API exploration (@validate: npx tsc --noEmit)

### Subagent 1.1: Create the extension skeleton (@agent: worker-pro)
**File:** `extensions/tree.ts` (new)
**Problem:** No tree extension exists yet. Need a minimal working extension that
registers the `/tree` command and renders a placeholder TUI.
**Fix:**
- [ ] Create `extensions/tree.ts` with the standard extension boilerplate
  (import ExtensionAPI, export default function, registerCommand("tree"))
- [ ] In the handler, check `ctx.mode !== "tui"` and notify if not interactive
- [ ] Launch a minimal TUI custom component that renders "tree placeholder" text
- [ ] Follow the pattern from `extensions/todo.ts` (TodoListComponent class)
- [ ] Ensure `package.json` picks it up (it's already in `./extensions` glob)

### Subagent 1.2: Document the session tree API (@agent: scout)
**Task:** Explore the pi SDK to find the full session tree API surface.
Report back everything available on `ctx.sessionManager` — method signatures,
return types, tree node metadata (labels, timestamps, branch status).
- [ ] Search pi's type definitions for `SessionManager` interface
- [ ] Check `btw.ts` and `todo.ts` for real usage patterns (getBranch, getLeafId, navigateTree)
- [ ] Report all available methods, their params, and return types

## Wave 2: Build the tree data model (@validate: npx tsc --noEmit)

### Subagent 2.1: Implement tree traversal and node model (@agent: worker-pro)
**File:** `extensions/tree.ts`
**Problem:** Need to walk the session tree and build a structured model for rendering.
**Fix:**
- [ ] Define a `TreeNode` interface: id, label, isCurrentBranch, isDeadEnd, children, depth
- [ ] Implement a `buildTree()` function that uses `ctx.sessionManager` APIs
- [ ] Walk from root to current leaf via `getBranch()` and mark current path
- [ ] Discover dead branches (children of branch points not on the current path)
- [ ] Handle edge cases: linear sessions (no branches), empty sessions

### Subagent 2.2: Add keyboard navigation data (@agent: worker-flash)
**File:** `extensions/tree.ts`
**Problem:** The tree component needs a flat index for keyboard selection.
**Fix:**
- [ ] Implement a `flattenTree(root: TreeNode): FlatNode[]` helper
- [ ] Each `FlatNode` has: id, label, depth, isCurrent, isDeadEnd, originalNode
- [ ] Add `nextSibling` / `prevSibling` / `parent` index references for Vim-key navigation

## Wave 3: TUI rendering (@validate: npx tsc --noEmit)

### Subagent 3.1: Implement the TreeComponent render loop (@agent: worker-pro)
**File:** `extensions/tree.ts`
**Problem:** The component needs to draw the tree with branch lines, highlights,
and a selection cursor.
**Fix:**
- [ ] Implement `TreeComponent` class following `TodoListComponent` pattern
- [ ] `render(width)` draws the flattened tree with:
  - Indentation by depth (2 spaces per level)
  - Branch connectors: `├──`, `└──`, `│  ` for tree structure
  - Current branch path highlighted (accent color)
  - Dead branches dimmed
  - Selection cursor (highlighted row) for navigation
- [ ] Show metadata per node: branch label, approximate message count
- [ ] Header: session info, total branches, current position indicator
- [ ] Footer: keybinding hints (j/k or arrows to move, Enter to navigate, Esc to close)

### Subagent 3.2: Add color theme integration (@agent: worker-flash)
**File:** `extensions/tree.ts`
**Problem:** The render output should use theme colors consistently.
**Fix:**
- [ ] Use `theme.fg("accent", ...)` for the current branch path
- [ ] Use `theme.fg("dim", ...)` for dead branches
- [ ] Use `theme.fg("muted", ...)` for branch connectors
- [ ] Use `theme.bold(...)` for the selected node
- [ ] Match the visual style of `TodoListComponent` in `extensions/todo.ts`

## Wave 4: Navigation + polish (@validate: npx tsc --noEmit && test -f extensions/tree.ts)

### Subagent 4.1: Implement keyboard navigation and tree jumping (@agent: worker-pro)
**File:** `extensions/tree.ts`
**Problem:** The user needs to select a node and jump to that point in the tree.
**Fix:**
- [ ] `handleInput(data)` — j/k or down/up arrows move selection, Enter navigates
- [ ] On Enter: call `ctx.navigateTree(nodeId, { summarize: true })` to jump
- [ ] On Esc: close the component (call `onClose()`)
- [ ] gg/G: jump to top/bottom
- [ ] Prevent navigation to the current node (no-op)
- [ ] Show a brief notification after successful navigation

### Subagent 4.2: Add /tree command polish (@agent: worker-flash)
**File:** `extensions/tree.ts`
**Problem:** Edge cases and user experience details.
**Fix:**
- [ ] Handle sessions with zero messages (show "empty session" message)
- [ ] Handle sessions with one linear branch (show simplified view)
- [ ] Refresh tree data when component opens (not stale from construction)
- [ ] Invalidate render cache when selection moves
