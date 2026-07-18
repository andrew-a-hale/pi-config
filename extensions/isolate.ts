// /isolate — run a coding task in an isolated Docker container via the host's `isolate` script.
// Usage: /isolate <repo-url-or-path> <prompt>

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("isolate", {
    description: "Run a coding task in an isolated Docker container",
    async handler(args, ctx) {
      // Split into repo (first token) and prompt (everything else)
      const match = args.trim().match(/^(\S+)\s+(.*)$/);
      if (!match) {
        ctx.ui.notify("Usage: /isolate <repo-url-or-path> <prompt>", "warning");
        return;
      }
      const [, repo, prompt] = match;

      const hostname = (await pi.exec("hostname", [])).stdout.trim();
      const onTom = hostname === "tom" || hostname === "raspberrypi";

      ctx.ui.notify(`Running isolate${onTom ? "" : " on tom"}...`);

      const cmd = onTom ? "isolate" : "ssh";
      const cmdArgs = onTom
        ? [repo, prompt]
        : ["tom", "isolate", repo, prompt];
      const result = await pi.exec(cmd, cmdArgs);

      if (result.code === 0) {
        ctx.ui.notify("Isolate completed successfully.", "info");
      } else {
        ctx.ui.notify(`Isolate failed (exit ${result.code}).`, "error");
      }

      const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
      const message = output
        ? `isolate completed (exit ${result.code}):\n\`\`\`\n${output}\n\`\`\``
        : `isolate completed (exit ${result.code})`;

      pi.sendMessage({
        customType: "isolate",
        content: message,
        display: true,
      });
    },
  });
}
