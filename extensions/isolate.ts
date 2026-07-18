// /isolate — run a coding task in an isolated Docker container via the host's `isolate` script.
// Usage: /isolate <repo-url-or-path> <prompt>

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export default function (ctx: ExtensionContext) {
  ctx.registerCommand({
    name: "isolate",
    description: "Run a coding task in an isolated Docker container",
    async handler(ctx, args) {
      if (!args.trim()) {
        ctx.ui.notify("Usage: /isolate <repo-url-or-path> <prompt>", "warning");
        return;
      }

      // Notify and run
      ctx.ui.notify(`Running isolate...`);

      const result = await ctx.runBash(`isolate ${args}`);

      if (result.exitCode === 0) {
        ctx.ui.notify("Isolate completed successfully.", "info");
      } else {
        ctx.ui.notify(`Isolate failed (exit ${result.exitCode}).`, "error");
      }

      // Feed results back into conversation so the agent can discuss them
      const message = result.output
        ? `isolate completed (exit ${result.exitCode}):\n\`\`\`\n${result.output}\n\`\`\``
        : `isolate completed (exit ${result.exitCode})`;

      ctx.sendMessage(message);
    },
  });
}
