// /isolate — run a coding task in an isolated Docker container via the host's `isolate` script.
// Usage: /isolate <repo-url-or-path> <prompt>

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("isolate", {
    description: "Run a coding task in an isolated Docker container",
    async handler(args, ctx) {
      if (!args.trim()) {
        ctx.ui.notify("Usage: /isolate <repo-url-or-path> <prompt>", "warning");
        return;
      }

      const hostname = (await pi.exec("hostname", [])).stdout.trim();
      const onTom = hostname === "tom" || hostname === "raspberrypi";

      ctx.ui.notify(`Running isolate${onTom ? "" : " on tom"}...`);

      const cmd = onTom ? "isolate" : "ssh";
      const cmdArgs = onTom
        ? args.split(/\s+/)
        : ["tom", "isolate", ...args.split(/\s+/)];
      const result = await pi.exec(cmd, cmdArgs);

      if (result.code === 0) {
        ctx.ui.notify("Isolate completed successfully.", "info");
      } else {
        ctx.ui.notify(`Isolate failed (exit ${result.code}).`, "error");
      }

      const message = result.stdout
        ? `isolate completed (exit ${result.code}):\n\`\`\`\n${result.stdout}\n\`\`\``
        : `isolate completed (exit ${result.code})`;

      pi.sendMessage({
        customType: "isolate",
        content: message,
        display: true,
      });
    },
  });
}
