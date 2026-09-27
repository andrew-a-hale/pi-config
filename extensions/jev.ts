/**
 * Jev — System One structured decisions (OpenRouter).
 *
 * Jev is not a chat model: it evaluates a `state` against typed `questions`
 * and returns values/probabilities per question id. Exposed as a tool because
 * pi's model layer only speaks chat completions/responses/messages.
 *
 * Endpoint: https://openrouter.ai/api/v1/systemone
 * Key: $OPENROUTER_API_KEY, else auth.json (openrouter), else `pass dev/openrouter`.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const URL = "https://openrouter.ai/api/v1/systemone";

const QUESTION = Type.Object(
	{
		type: Type.Union([Type.Literal("noul"), Type.Literal("choice"), Type.Literal("score")]),
		instructions: Type.String({ description: "What to evaluate" }),
		criteria: Type.Optional(
			Type.Record(Type.String(), Type.String(), {
				description: "choice: label -> description",
			}),
		),
	},
	{ additionalProperties: true },
);

function apiKey(): string | undefined {
	if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
	try {
		const auth = JSON.parse(readFileSync(join(homedir(), ".pi/agent/auth.json"), "utf8"));
		if (auth?.openrouter?.key) return auth.openrouter.key;
	} catch {}
	try {
		return execFileSync("pass", ["dev/openrouter"], { encoding: "utf8" }).trim() || undefined;
	} catch {
		return undefined;
	}
}

export default function jevExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "jev",
		label: "Jev",
		description:
			"Ask Jev (System One) typed yes/no, multiple-choice, or score questions about a state. Returns values/probabilities per question id.",
		promptSnippet: "Evaluate a state against typed questions via Jev",
		promptGuidelines: [
			"Use jev when you need a typed decision or probability (urgency, routing, sentiment score) rather than generated text.",
		],
		parameters: Type.Object({
			state: Type.String({ description: "The situation to evaluate" }),
			questions: Type.Record(Type.String(), QUESTION, {
				description: "Question id -> question",
			}),
			model: Type.Optional(Type.String({ description: "Default jev-1.13" })),
		}),
		async execute(_toolCallId, params, signal) {
			const key = apiKey();
			if (!key) throw new Error("No OpenRouter key: set OPENROUTER_API_KEY or `pass insert dev/openrouter`");

			const res = await fetch(URL, {
				method: "POST",
				headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
				body: JSON.stringify({
					model: params.model ?? "jev-1.13",
					state: params.state,
					questions: params.questions,
				}),
				signal,
			});
			const text = await res.text();
			if (!res.ok) throw new Error(`Jev ${res.status}: ${text}`);
			return { content: [{ type: "text", text }], details: { status: res.status } };
		},
	});
}
