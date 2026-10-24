import "server-only";
import type { z } from "zod";
import { env, isMockAI } from "@/lib/env";
import { MODELS, costOf, type ModelRole } from "@/lib/ai/models";
import type { TraceEntry } from "@/lib/schemas";
import { store } from "@/lib/store";

/** Nebius Token Factory (OpenAI-compatible) chat client with trace + cost tracking. */

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type Message = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

export type ChatOptions = {
  role: ModelRole;
  stage: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  /** Nemotron reasoning on/off. VERIFY in Phase 0: the toggle may be a system-prompt flag instead. */
  reasoning?: boolean;
  json?: boolean;
  sessionId?: string;
  /** Collects trace entries for calls made before a session exists (e.g. the guide builder). */
  traces?: TraceEntry[];
  timeoutMs?: number;
  /** Scripted output used in mock mode. */
  mock: () => string | Promise<string>;
};

export type ChatResult = { text: string; trace: TraceEntry };

// Simulated latency per role in mock mode, in ms.
const MOCK_LATENCY: Record<ModelRole, [number, number]> = {
  vision: [700, 1400],
  fast: [200, 500],
  planner: [1500, 3000],
  judge: [1400, 2600],
};

export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const model = MODELS[opts.role];
  const started = Date.now();
  const mock = isMockAI();
  let text = "";
  let inTokens = 0;
  let outTokens = 0;
  let ok = false;

  try {
    if (mock) {
      const [lo, hi] = MOCK_LATENCY[opts.role];
      await sleep(lo + Math.random() * (hi - lo));
      text = await opts.mock();
      inTokens = estimateTokens(opts.messages);
      outTokens = Math.ceil(text.length / 4);
    } else {
      const res = await fetch(`${env.tokenFactoryBaseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.tokenFactoryKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: opts.messages,
          max_tokens: opts.maxTokens ?? 800,
          temperature: opts.temperature ?? 0.2,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
          ...(opts.reasoning !== undefined
            ? { chat_template_kwargs: { enable_thinking: opts.reasoning } }
            : {}),
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });
      if (!res.ok) {
        throw new Error(`Token Factory ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const data = await res.json();
      text = stripThinking(data.choices?.[0]?.message?.content ?? "");
      inTokens = data.usage?.prompt_tokens ?? estimateTokens(opts.messages);
      outTokens = data.usage?.completion_tokens ?? Math.ceil(text.length / 4);
    }
    ok = true;
    return { text, trace: await record() };
  } catch (err) {
    await record();
    throw err;
  }

  async function record(): Promise<TraceEntry> {
    const costUsd = costOf(model, inTokens, outTokens);
    const trace: TraceEntry = {
      at: started,
      stage: opts.stage,
      model,
      ms: Date.now() - started,
      inTokens,
      outTokens,
      costUsd,
      ok,
      mock,
    };
    opts.traces?.push(trace);
    await Promise.all([
      opts.sessionId ? store.pushTrace(opts.sessionId, trace) : null,
      opts.sessionId ? store.addSessionCost(opts.sessionId, costUsd) : null,
      mock ? null : store.addSpend(costUsd),
    ]);
    return trace;
  }
}

/** chat() + JSON extraction + zod validation, with one retry. Returns null if both attempts fail. */
export async function chatJson<S extends z.ZodType>(
  schema: S,
  opts: ChatOptions,
): Promise<z.infer<S> | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { text } = await chat({ ...opts, json: true });
      const parsed = schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
    } catch (err) {
      if (attempt === 1) console.error(`[${opts.stage}]`, err);
    }
  }
  return null;
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  if (start === -1 || end < start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

function stripThinking(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

function estimateTokens(messages: Message[]) {
  let n = 0;
  for (const m of messages) {
    if (typeof m.content === "string") n += m.content.length / 4;
    else for (const p of m.content) n += p.type === "text" ? p.text.length / 4 : 800;
  }
  return Math.ceil(n);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
