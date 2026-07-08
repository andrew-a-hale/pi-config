/**
 * Modes Extension — work modes cycled by a single key.
 *
 * Three modes, always active, cycled by Shift+Tab:
 *   plan → review → build → plan → …
 *
 * Default mode on session start is plan (read-only exploration).
 *
 * Modes
 * -----
 * plan   - Read-only exploration; output a numbered Plan:. No changes.
 * review - Read-only audit for bugs/security/perf; output a Review:. No changes.
 * build  - Full tool access; implement focused, surgical changes; run tests/typecheck.
 *
 * Usage
 * -----
 *   Shift+Tab                cycle modes
 *   Alt+T                    cycle thinking level
 *   /mode [plan|review|build]   set mode directly, or open a selector with no arg
 *   --work-mode <name>        start in a mode (plan | review | build)
 *
 * Notes
 * -----
 * - Plan/review disable edit/write and gate bash through a read-only allowlist.
 * - Active mode is injected into the system prompt each turn and shown in the footer.
 * - Loader messages ("Planning...", "Building...", etc.) are set per-agent-start,
 *   not globally, so they never rewrite or obscure previous conversation blocks.
 * - State is persisted to the session and restored on resume.
 * - The default mode is plan. To change the default, set it as the first entry in
 *   CYCLE_ORDER below and update the mode variable initializer.
 *
 * To change the cycle key, edit CYCLE_KEY below (e.g. "alt+t", "tab", "ctrl+alt+m").
 * Valid expressions use the format in docs/keybindings.md (modifier+key).
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";
import { Container, type SelectItem, SelectList, Text, Key, DynamicBorder } from "@earendil-works/pi-tui";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Change this to rebind the cycle key. See docs/keybindings.md for the format.
const CYCLE_KEY = Key.shift("tab");

// ---------------------------------------------------------------------------
// Read-only bash guard (shared with plan-mode example conventions)
// ---------------------------------------------------------------------------

const DESTRUCTIVE_PATTERNS = [
	/\brm\b/i,
	/\brmdir\b/i,
	/\bmv\b/i,
	/\bcp\b/i,
	/\bmkdir\b/i,
	/\btouch\b/i,
	/\bchmod\b/i,
	/\bchown\b/i,
	/\bchgrp\b/i,
	/\bln\b/i,
	/\btee\b/i,
	/\btruncate\b/i,
	/\bdd\b/i,
	/\bshred\b/i,
	/(^|[^<])>(?!>)/,
	/>>/,
	/\bnpm\s+(install|uninstall|update|ci|link|publish)/i,
	/\byarn\s+(add|remove|install|publish)/i,
	/\bpnpm\s+(add|remove|install|publish)/i,
	/\bpip\s+(install|uninstall)/i,
	/\bapt(-get)?\s+(install|remove|purge|update|upgrade)/i,
	/\bbrew\s+(install|uninstall|upgrade)/i,
	/\bgit\s+(add|commit|push|pull|merge|rebase|reset|checkout|branch\s+-[dD]|stash|cherry-pick|revert|tag|init|clone)/i,
	/\bsudo\b/i,
	/\bsu\b/i,
	/\bkill\b/i,
	/\bpkill\b/i,
	/\bkillall\b/i,
	/\breboot\b/i,
	/\bshutdown\b/i,
	/\bsystemctl\s+(start|stop|restart|enable|disable)/i,
	/\bservice\s+\S+\s+(start|stop|restart)/i,
	/\b(vim?|nano|emacs|code|subl)\b/i,
];

const SAFE_PATTERNS = [
	/^\s*cat\b/,
	/^\s*head\b/,
	/^\s*tail\b/,
	/^\s*less\b/,
	/^\s*more\b/,
	/^\s*grep\b/,
	/^\s*find\b/,
	/^\s*ls\b/,
	/^\s*pwd\b/,
	/^\s*echo\b/,
	/^\s*printf\b/,
	/^\s*wc\b/,
	/^\s*sort\b/,
	/^\s*uniq\b/,
	/^\s*diff\b/,
	/^\s*file\b/,
	/^\s*stat\b/,
	/^\s*du\b/,
	/^\s*df\b/,
	/^\s*tree\b/,
	/^\s*which\b/,
	/^\s*whereis\b/,
	/^\s*type\b/,
	/^\s*env\b/,
	/^\s*printenv\b/,
	/^\s*uname\b/,
	/^\s*whoami\b/,
	/^\s*id\b/,
	/^\s*date\b/,
	/^\s*cal\b/,
	/^\s*uptime\b/,
	/^\s*ps\b/,
	/^\s*top\b/,
	/^\s*htop\b/,
	/^\s*free\b/,
	/^\s*git\s+(status|log|diff|show|branch|remote|config\s+--get)/i,
	/^\s*git\s+ls-/i,
	/^\s*npm\s+(list|ls|view|info|search|outdated|audit)/i,
	/^\s*yarn\s+(list|info|why|audit)/i,
	/^\s*node\s+--version/i,
	/^\s*python\s+--version/i,
	/^\s*curl\s/i,
	/^\s*wget\s+-O\s*-/i,
	/^\s*jq\b/,
	/^\s*sed\s+-n/i,
	/^\s*awk\b/,
	/^\s*rg\b/,
	/^\s*fd\b/,
	/^\s*bat\b/,
	/^\s*eza\b/,
];

function isSafeCommand(command: string): boolean {
	const isDestructive = DESTRUCTIVE_PATTERNS.some((p) => p.test(command));
	const isSafe = SAFE_PATTERNS.some((p) => p.test(command));
	return !isDestructive && isSafe;
}

// ---------------------------------------------------------------------------
// Mode definitions
// ---------------------------------------------------------------------------

type ModeName = "plan" | "review" | "build";

const CYCLE_ORDER: ModeName[] = ["plan", "review", "build"];

// Loader messages per mode — applied per-agent-start, not globally,
// so cycling modes never rewrites or obscures previous conversation blocks.
const MODE_LOADERS: Record<ModeName, { working: string; thinking: string }> = {
	plan: { working: "Planning...", thinking: "Analyzing..." },
	review: { working: "Reviewing...", thinking: "Auditing..." },
	build: { working: "Building...", thinking: "Implementing..." },
};

// Tools that are "ours" to manage. When switching modes we touch only these
// and otherwise preserve any other active tools (e.g. extension-registered).
const READONLY_TOOLS = ["read", "bash", "grep", "find", "ls"];
const BUILD_TOOLS = ["read", "bash", "edit", "write", "grep", "find", "ls"];
const READONLY_DISABLED = new Set<string>(["edit", "write"]);
const MANAGED_TOOLS = new Set<string>([...READONLY_TOOLS, ...BUILD_TOOLS]);

interface ModeDef {
	label: string; // footer glyph + name
	tools: string[]; // canonical tool list for this mode
	readonly: boolean; // gate bash + disable edit/write
	instructions: string;
}

const MODES: Record<ModeName, ModeDef> = {
	plan: {
		label: "⏸ plan",
		tools: READONLY_TOOLS,
		readonly: true,
		instructions: `[mode: plan]

You are in PLAN MODE — a read-only exploration mode.

Restrictions:
- Built-in edit and write tools are disabled.
- Bash is restricted to a read-only allowlist (file inspection, search, git read, package info).
- Do NOT modify, create, or delete any files.

Your job:
- Read files IN FULL to get complete context. Partial reads miss critical details.
- Explore thoroughly: grep for related code, find similar patterns, understand the architecture.
- Ask clarifying questions if requirements are ambiguous. Do not assume.
- Identify risks, edge cases, and dependencies.

Output a detailed numbered plan under a "Plan:" header:

Plan:
1. First step — what to change and why.
2. Second step — ...
3. ...`,
	},
	review: {
		label: "👁 review",
		tools: READONLY_TOOLS,
		readonly: true,
		instructions: `[mode: review]

You are in REVIEW MODE — a read-only code audit.

Restrictions:
- Built-in edit and write tools are disabled.
- Bash is restricted to a read-only allowlist.
- Do NOT modify any code.

Your job:
- Review for bugs, security issues, and performance problems.
- Cite findings with file:line references.
- Check error handling, edge cases, input validation, and resource leaks.
- Read files in full; do not skim.

Output a structured report under a "Review:" header:

Review:
Summary: <one-paragraph overview>
Findings:
1. [severity] <file:line> — <issue> — <suggested fix>
2. ...`,
	},
	build: {
		label: "🔨 build",
		tools: BUILD_TOOLS,
		readonly: false,
		instructions: `[mode: build]

You are in BUILD MODE — implement focused, correct changes.

Rules:
- Keep scope tight. Do exactly what was asked, no more.
- Read files before editing to understand current state.
- Make surgical edits. Prefer edit over write for existing files.
- Explain your reasoning briefly before each change.
- If the project has tests or type checks, run them after changes (npm test, npm run check, etc.).
- If you encounter unexpected complexity, STOP and explain rather than hacking around it.

After completing changes, summarize what was done and note any follow-up work or tests.`,
	},
};

// ---------------------------------------------------------------------------
// Optional config file (override instructions/tools per mode)
// ~/.pi/agent/modes.json  or  <cwd>/.pi/modes.json
// ---------------------------------------------------------------------------

interface ModeOverride {
	tools?: string[];
	instructions?: string;
}
type ModesConfig = Partial<Record<ModeName, ModeOverride>>;

function loadConfig(cwd: string): ModesConfig {
	const globalPath = join(getAgentDir(), "modes.json");
	const projectPath = join(cwd, CONFIG_DIR_NAME, "modes.json");
	let config: ModesConfig = {};
	for (const p of [globalPath, projectPath]) {
		if (!existsSync(p)) continue;
		try {
			const parsed = JSON.parse(readFileSync(p, "utf-8")) as ModesConfig;
			config = { ...config, ...parsed };
		} catch (err) {
			console.error(`modes: failed to load ${p}: ${err}`);
		}
	}
	return config;
}

function effectiveMode(name: ModeName, config: ModesConfig): ModeDef {
	const base = MODES[name];
	const override = config[name];
	return {
		...base,
		tools: override?.tools ?? base.tools,
		instructions: override?.instructions ?? base.instructions,
	};
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface PersistedState {
	mode: ModeName;
	toolsBeforeModes?: string[];
}

function uniqueTools(names: string[]): string[] {
	return [...new Set(names)];
}

function isReadonlyMode(mode: ModeName): mode is "plan" | "review" {
	return mode === "plan" || mode === "review";
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function modesExtension(pi: ExtensionAPI): void {
	// Default to plan mode — safe, read-only exploration.
	let mode: ModeName = "plan";
	let config: ModesConfig = {};
	let toolsBeforeModes: string[] | undefined;

	// ---- tool management ------------------------------------------------

	function snapshotIfNeeded(): void {
		if (toolsBeforeModes === undefined) {
			toolsBeforeModes = pi.getActiveTools();
		}
	}

	function toolsForMode(name: ModeName): string[] {
		const def = effectiveMode(name, config);
		if (def.readonly) {
			// preserve non-managed active tools, drop edit/write, add readonly set
			snapshotIfNeeded();
			const base = toolsBeforeModes ?? pi.getActiveTools();
			return uniqueTools([
				...base.filter((t) => !READONLY_DISABLED.has(t) && !MANAGED_TOOLS.has(t)),
				...def.tools,
			]);
		}
		// build mode: preserve non-managed active tools, add full build set
		snapshotIfNeeded();
		const base = toolsBeforeModes ?? pi.getActiveTools();
		return uniqueTools([
			...def.tools,
			...base.filter((t) => !MANAGED_TOOLS.has(t)),
		]);
	}

	function applyModeTools(name: ModeName): void {
		pi.setActiveTools(toolsForMode(name));
	}

	// ---- status / persistence ------------------------------------------

	// Loader messages are set per-agent-start (in before_agent_start), not here.
	// Setting them globally via ctx.ui.setWorkingMessage / setHiddenThinkingLabel
	// would cause every mode cycle to re-render the loader text, potentially
	// rewriting or obscuring previous conversation blocks.
	function updateStatus(ctx: ExtensionContext): void {
		const def = effectiveMode(mode, config);
		const color = isReadonlyMode(mode) ? "warning" : "accent";
		ctx.ui.setStatus("modes", ctx.ui.theme.fg(color, def.label));
	}

	function persistState(): void {
		pi.appendEntry("modes", { mode, toolsBeforeModes } satisfies PersistedState);
	}

	function setMode(name: ModeName, ctx: ExtensionContext, notify = true): void {
		const previous = mode;
		mode = name;
		applyModeTools(name);
		updateStatus(ctx);
		persistState();
		if (notify && previous !== name) {
			const def = effectiveMode(name, config);
			ctx.ui.notify(`${def.label} mode`, "info");
		}
	}

	// ---- cycle ---------------------------------------------------------

	function nextMode(current: ModeName): ModeName {
		const idx = CYCLE_ORDER.indexOf(current);
		return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
	}

	async function cycleModes(ctx: ExtensionContext): Promise<void> {
		setMode(nextMode(mode), ctx);
	}

	// ---- selector UI ---------------------------------------------------

	async function showSelector(ctx: ExtensionContext): Promise<void> {
		const items: SelectItem[] = CYCLE_ORDER.map((name) => {
			const isActive = name === mode;
			const def = effectiveMode(name, config);
			return {
				value: name,
				label: isActive ? `${def.label} (active)` : def.label,
				description: def.tools.join(", "),
			};
		});

		const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
			const container = new Container();
			container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
			container.addChild(new Text(theme.fg("accent", theme.bold("Work Mode"))));
			const selectList = new SelectList(items, Math.min(items.length, 10), {
				selectedPrefix: (t) => theme.fg("accent", t),
				selectedText: (t) => theme.fg("accent", t),
				description: (t) => theme.fg("muted", t),
				scrollInfo: (t) => theme.fg("dim", t),
				noMatch: (t) => theme.fg("warning", t),
			});
			selectList.onSelect = (item) => done(item.value as string);
			selectList.onCancel = () => done(null);
			container.addChild(selectList);
			container.addChild(new Text(theme.fg("dim", "↑↓ navigate • enter select • esc cancel")));
			container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
			return {
				render(width: number) {
					return container.render(width);
				},
				invalidate() {
					container.invalidate();
				},
				handleInput(data: string) {
					selectList.handleInput(data);
					tui.requestRender();
				},
			};
		});

		if (!result) return;
		setMode(result as ModeName, ctx);
	}

	// ---- registrations -------------------------------------------------

	// Shift+Tab cycle key (change CYCLE_KEY above to rebind)
	pi.registerShortcut(CYCLE_KEY, {
		description: "Cycle work modes (plan → review → build)",
		handler: async (ctx) => {
			await cycleModes(ctx);
		},
	});

	// /mode [name]
	pi.registerCommand("mode", {
		description: "Set or pick a work mode (plan | review | build)",
		handler: async (args, ctx) => {
			const arg = args?.trim().toLowerCase();
			if (!arg) {
				await showSelector(ctx);
				return;
			}
			if (arg === "plan" || arg === "review" || arg === "build") {
				setMode(arg as ModeName, ctx);
				return;
			}
			ctx.ui.notify(`Unknown mode "${arg}". Use: plan, review, build`, "error");
		},
	});

	// --work-mode flag
	pi.registerFlag("work-mode", {
		description: "Start in a work mode (plan | review | build)",
		type: "string",
	});

	// Bash guard for readonly modes
	pi.on("tool_call", async (event) => {
		if (!isReadonlyMode(mode) || event.toolName !== "bash") return;
		const command = event.input.command as string;
		if (!isSafeCommand(command)) {
			return {
				block: true,
				reason: `${MODES[mode].label} mode: command not allowlisted.\nCommand: ${command}\nSwitch to build mode (Shift+Tab) to run it.`,
			};
		}
	});

	// Inject mode instructions into the system prompt each turn.
	// Loader messages ("Planning...", "Building...") are set here per-agent-start
	// rather than globally, so mode cycling never rewrites previous blocks.
	// Mode is always active — no "disable" escape hatch.
	pi.on("before_agent_start", async (event, ctx) => {
		const def = effectiveMode(mode, config);
		const loader = MODE_LOADERS[mode];
		ctx.ui.setWorkingMessage(loader.working);
		ctx.ui.setHiddenThinkingLabel(loader.thinking);
		return {
			systemPrompt: `${event.systemPrompt}\n\n${def.instructions}`,
		};
	});

	// Initialize on session start
	pi.on("session_start", async (_event, ctx) => {
		config = loadConfig(ctx.cwd);

		// Restore from session persistence
		const entries = ctx.sessionManager.getEntries();
		const modesEntry = entries
			.filter((e: { type: string; customType?: string }) => e.type === "custom" && e.customType === "modes")
			.pop() as { data?: PersistedState } | undefined;

		let restored: ModeName | undefined;
		if (modesEntry?.data) {
			const m = modesEntry.data.mode;
			// Only accept known modes (ignore stale "disable"/"off" from old sessions)
			if (m && CYCLE_ORDER.includes(m as ModeName)) {
				restored = m as ModeName;
				toolsBeforeModes = modesEntry.data.toolsBeforeModes;
			}
		}

		// CLI flag takes precedence over persisted state
		const flag = pi.getFlag("work-mode");
		if (typeof flag === "string" && flag) {
			const f = flag.toLowerCase();
			if (f === "plan" || f === "review" || f === "build") {
				setMode(f as ModeName, ctx, false);
				ctx.ui.notify(`${effectiveMode(f as ModeName, config).label} mode`, "info");
				return;
			}
			ctx.ui.notify(`Unknown --work-mode "${flag}". Use: plan, review, build`, "warning");
		}

		if (restored) {
			if (toolsBeforeModes === undefined) snapshotIfNeeded();
			setMode(restored, ctx, false);
		} else {
			// No persisted state and no flag — activate default plan mode.
			setMode("plan", ctx, false);
		}
	});
}
