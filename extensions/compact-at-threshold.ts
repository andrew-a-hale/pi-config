import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

// Cap auto-compaction at 250k tokens even on 1M-context models. Smaller-window
// models keep pi's built-in threshold (contextWindow - reserveTokens), which is
// already below 250k, so the effective trigger is min(auto, 250k).
const COMPACT_AT_TOKENS = 250_000;

export default function compactAtThreshold(pi: ExtensionAPI): void {
	let compacting = false;

	const maybeCompact = (ctx: ExtensionContext): void => {
		if (compacting) return;
		const usage = ctx.getContextUsage();
		if (!usage || usage.tokens <= COMPACT_AT_TOKENS) return;

		compacting = true;
		try {
			ctx.compact({
				onComplete: () => {
					compacting = false;
				},
				onError: () => {
					compacting = false;
				},
			});
		} catch {
			compacting = false;
		}
	};

	pi.on("turn_end", (_event, ctx) => maybeCompact(ctx));
}
