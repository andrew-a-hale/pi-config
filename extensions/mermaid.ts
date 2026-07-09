/**
 * Mermaid diagram tool using mmdc (mermaid-cli).
 * Usage: LLM can call `mermaid` tool with diagram source to render PNG/SVG/PDF.
 */

import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync, unlinkSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const FORMATS = ["png", "svg", "pdf"] as const;
const THEMES = ["default", "forest", "dark", "neutral"] as const;

const mermaidTool = defineTool({
  name: "mermaid",
  label: "Mermaid Diagram",
  description:
    "Render a Mermaid diagram to an image file (PNG/SVG/PDF) using mermaid-cli (mmdc).",
  promptSnippet: "Render a Mermaid diagram to PNG, SVG, or PDF",
  promptGuidelines: [
    "Use mermaid to render diagrams when the user asks for flowcharts, sequence diagrams, class diagrams, ER diagrams, Gantt charts, etc.",
    "Write clean Mermaid syntax. Use standard diagram types: flowchart, sequenceDiagram, classDiagram, erDiagram, gantt, pie, stateDiagram, gitGraph.",
  ],
  parameters: Type.Object({
    diagram: Type.String({
      description: "Mermaid diagram source code (the full diagram text)",
    }),
    output: Type.Optional(
      Type.String({
        description: "Output file path. Defaults to a temp file named <diagram>.png.",
      }),
    ),
    format: Type.Optional(
      Type.Union(
        FORMATS.map((f) => Type.Literal(f)),
        { description: "Output format: png, svg, or pdf. Default: png" },
      ),
    ),
    theme: Type.Optional(
      Type.Union(
        THEMES.map((t) => Type.Literal(t)),
        { description: "Diagram theme. Default: default" },
      ),
    ),
  }),

  async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
    const format = params.format ?? "png";
    const theme = params.theme ?? "default";
    const diagram = params.diagram;

    // Write diagram to temp file
    const tmpDir = mkdtempSync(join(tmpdir(), "mermaid-"));
    const inputPath = join(tmpDir, "diagram.mmd");
    const outputPath =
      params.output ?? join(tmpDir, `diagram.${format}`);

    writeFileSync(inputPath, diagram, "utf-8");

    try {
      await execMmdc(inputPath, outputPath, theme);
      // Clean up input, keep output
      unlinkSync(inputPath);
      rmSync(tmpDir, { recursive: true, force: true });

      return {
        content: [
          {
            type: "text",
            text: `Diagram rendered: ${outputPath}`,
          },
        ],
        details: {
          outputPath,
          format,
          theme,
        },
      };
    } catch (err) {
      // Clean up temp dir on failure
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch { /* ignore */ }

      const stderr = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: `Mermaid render failed. Check diagram syntax.\n\n${stderr}`,
          },
        ],
        details: { error: stderr },
      };
    }
  },
});

function execMmdc(input: string, output: string, theme: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "mmdc",
      ["-i", input, "-o", output, "-t", theme],
      { timeout: 30000, maxBuffer: 1024 * 1024 },
      (err, _stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
        } else {
          resolve();
        }
      },
    );
  });
}

export default function (pi: ExtensionAPI) {
  pi.registerTool(mermaidTool);
}
