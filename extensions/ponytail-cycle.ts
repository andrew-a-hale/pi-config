import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";
import { createRequire } from "node:module";

// ponytail: hardcoded path to git clone since relative won't resolve from local extension
const require = createRequire(import.meta.url);
const { getPonytailInstructions } = require(
  "/home/andy/.pi/agent/git/github.com/DietrichGebert/ponytail/hooks/ponytail-instructions.js"
);

const PONYTAIL_MODES = ["off", "lite", "full", "ultra"];
const PONYTAIL_MARKER = "\n\nPONYTAIL MODE ACTIVE";

export default function (pi: ExtensionAPI) {
  let currentMode: string = "full";
  let isActive = false;

  function syncStatus(ctx: any) {
    const theme = ctx?.ui?.theme;
    if (!theme?.fg || !ctx?.ui?.setStatus) return;
    if (currentMode === "off") {
      ctx.ui.setStatus("ponytail", "");
      return;
    }
    const icons: Record<string, string> = { lite: "🌿", full: "⚡", ultra: "🔥" };
    const icon = icons[currentMode] || "";
    const label = currentMode.toUpperCase();
    const indicator = isActive ? theme.fg("accent", "●") : theme.fg("dim", "○");
    ctx.ui.setStatus("ponytail", indicator + " 🐴 " + theme.fg("muted", "ponytail: ") + theme.fg("text", icon + " " + label));
  }

  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx.sessionManager.getEntries();
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (e.type === "custom" && e.customType === "ponytail-mode") {
        const mode = e.data?.mode;
        if (mode && PONYTAIL_MODES.includes(mode)) currentMode = mode;
        break;
      }
    }
    syncStatus(ctx);
  });

  pi.registerShortcut(Key.alt("l"), {
    description: "Cycle ponytail mode: off → lite → full → ultra → off",
    handler: async (ctx) => {
      const idx = PONYTAIL_MODES.indexOf(currentMode);
      const next = PONYTAIL_MODES[(idx + 1) % PONYTAIL_MODES.length];
      currentMode = next;
      pi.appendEntry("ponytail-mode", { mode: next });
      syncStatus(ctx);
      ctx.ui.notify(`Ponytail: ${next}`, "info");
    },
  });

  pi.on("agent_start", async (_event, ctx) => { isActive = true; syncStatus(ctx); });
  pi.on("agent_end", async (_event, ctx) => { isActive = false; syncStatus(ctx); });

  pi.on("before_agent_start", async (event) => {
    if (currentMode === "off") return;
    const sp = event.systemPrompt;
    const idx = sp.indexOf(PONYTAIL_MARKER);
    const base = idx >= 0 ? sp.substring(0, idx) : sp;
    const instructions = getPonytailInstructions(currentMode);
    return { systemPrompt: `${base}\n\n${instructions}` };
  });
}
