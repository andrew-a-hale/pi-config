/**
 * /btw — Ask an ephemeral question that sees full session context
 * but is NOT added to the conversation history.
 *
 * Works by navigating the session tree: the Q&A becomes a dead branch.
 * The answer is shown in a bordered panel; dismiss to return.
 */

import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, Text, truncateToWidth } from "@earendil-works/pi-tui";

class BtwPanel {
  private question: string;
  private answer: string;
  private theme: Theme;
  private onClose: () => void;
  private onFork: () => void;

  constructor(question: string, answer: string, theme: Theme, onClose: () => void, onFork: () => void) {
    this.question = question;
    this.answer = answer;
    this.theme = theme;
    this.onClose = onClose;
    this.onFork = onFork;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "f") || matchesKey(data, "F")) {
      this.onFork();
      return;
    }
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || matchesKey(data, "enter")) {
      this.onClose();
    }
  }

  render(width: number): string[] {
    const lines: string[] = [];
    const th = this.theme;
    const innerW = Math.max(20, width - 6);
    const top = "┌" + "─".repeat(innerW + 2) + "┐";
    const bottom = "└" + "─".repeat(innerW + 2) + "┘";

    lines.push("");
    lines.push(th.fg("accent", top));

    // Question
    const qLabel = th.bold(th.fg("accent", " Q: "));
    lines.push(th.fg("accent", "│") + " " + qLabel + th.fg("muted", truncateToWidth(this.question, innerW - 3)));

    // Divider
    lines.push(th.fg("accent", "│") + th.fg("borderMuted", "  " + "─".repeat(innerW)));

    // Answer (word-wrapped)
    const words = this.answer.split(/\s+/);
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > innerW - 2 && cur) {
        lines.push(th.fg("accent", "│") + "  " + th.fg("text", truncateToWidth(cur.trim(), innerW - 2)));
        cur = w;
      } else {
        cur = cur ? cur + " " + w : w;
      }
    }
    if (cur) lines.push(th.fg("accent", "│") + "  " + th.fg("text", truncateToWidth(cur.trim(), innerW - 2)));

    lines.push(th.fg("accent", bottom));
    lines.push(th.fg("dim", "  Esc/Enter to close, F to follow the fork — this Q&A won't appear in history"));
    lines.push("");
    return lines;
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("btw", {
    description: "Ask a side question — sees full context, answer is not added to history",
    handler: async (args, ctx) => {
      if (!args || !args.trim()) {
        ctx.ui.notify("Usage: /btw <question>", "info");
        return;
      }

      if (!ctx.isIdle()) {
        ctx.ui.notify("btw: wait for the agent to finish first", "warning");
        return;
      }

      if (ctx.mode !== "tui") {
        ctx.ui.notify("btw: requires interactive mode", "error");
        return;
      }

      const originalLeafId = ctx.sessionManager.getLeafId();
      if (!originalLeafId) {
        ctx.ui.notify("btw: could not determine current position in session", "error");
        return;
      }

      const question = args.trim();

      // Send the question with a marker so the agent knows it's ephemeral
      pi.sendUserMessage(`[btw] ${question}`);

      // Wait until the turn actually starts
      while (ctx.sessionManager.getLeafId() === originalLeafId) {
        await new Promise(r => setTimeout(r, 50));
      }

      // Wait for the agent to finish responding
      await ctx.waitForIdle();

      // Extract the last assistant message from the branch
      let answer = "(no response)";
      const branch = ctx.sessionManager.getBranch();
      for (let i = branch.length - 1; i >= 0; i--) {
        const entry = branch[i];
        if (entry.type === "message" && entry.message?.role === "assistant") {
          const text = entry.message.content;
          if (typeof text === "string") {
            answer = text;
          } else if (Array.isArray(text)) {
            answer = text.map((b: { type: string; text?: string }) => b.text ?? "").join("\n");
          }
          break;
        }
      }

      // Capture the fork leaf before navigating back
      const forkLeafId = ctx.sessionManager.getLeafId();

      // Navigate back FIRST (snap hidden by the panel that follows)
      // The Q&A stays as a dead branch, excluded from future context.
      await ctx.navigateTree(originalLeafId, { summarize: false });

      // Show the answer in a bordered panel
      await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
        return new BtwPanel(question, answer, theme, () => done(), () => {
          ctx.navigateTree(forkLeafId, { summarize: false });
          done();
        });
      });
    },
  });
}
